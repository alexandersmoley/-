import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { renderCarouselHtml } from '../carousel-families/index.mjs';
import { runCarouselBrowserQa } from '../lib/carousel-browser-qa.mjs';
import { assertFile, listJsonFiles, sha256File } from '../lib/files.mjs';
import { createPostValidator } from '../lib/validate.mjs';

const carouselRendererDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererDirectory = path.resolve(carouselRendererDirectory, '..');
const factoryRoot = path.resolve(rendererDirectory, '..');
const carouselDirectory = path.join(factoryRoot, 'carousels');
const schemaPath = path.join(factoryRoot, 'schemas', 'carousel-series.schema.json');
const outputRoot = path.join(factoryRoot, 'output');
const renderRoot = path.join(factoryRoot, '.render', 'carousels');
const baseUrl = (process.env.OUTPUT_BASE_URL || 'https://alexandersmoley.github.io/-/').replace(/\/?$/, '/');

const fontPaths = {
  inter: path.join(factoryRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-cyrillic-400-normal.woff2'),
  cormorantRegular: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-normal.woff2'),
  cormorantItalic: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-italic.woff2')
};
const everyTrue = (checks) => Object.values(checks).every(Boolean);
const sha256Text = (value) => crypto.createHash('sha256').update(value).digest('hex');
const canonicalMarkdownBlock = (value) => value
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/u, ''))
  .join('\n')
  .trim();

// How a slide's flat line array groups into the paragraphs of its approved markdown block.
// This is declared per slide as data (copyLayout), not keyed to slide ids in code, so a
// carousel of any length works without editing this file. Each entry is [lines, joiner];
// a null count means "the rest". Default: every line is its own paragraph.
function structuredSlideBlock(slide) {
  const lines = slide.text;
  const layout = slide.copyLayout ?? lines.map(() => [1]);
  const paragraphs = [];
  let cursor = 0;
  for (const [count, joiner = '\n'] of layout) {
    const take = count === null ? lines.length - cursor : count;
    paragraphs.push(lines.slice(cursor, cursor + take).join(joiner));
    cursor += take;
  }
  if (cursor !== lines.length) {
    throw new Error(`copyLayout for ${slide.id} covers ${cursor} of ${lines.length} lines`);
  }
  return paragraphs.join('\n\n');
}

function extractApprovedCopy(markdown, slideCount) {
  const slides = new Map();
  for (let number = 1; number <= slideCount; number += 1) {
    const id = `slide-${String(number).padStart(2, '0')}`;
    const heading = `Slide ${String(number).padStart(2, '0')}`;
    const match = markdown.match(new RegExp(`## ${heading} —[^\\n]*\\n\\n### text_on_screen\\n([\\s\\S]*?)\\n\\n### hierarchy`, 'u'));
    if (!match) throw new Error(`Cannot extract approved copy for ${id}`);
    slides.set(id, canonicalMarkdownBlock(match[1]));
  }
  const captionMatch = markdown.match(/# Caption — exact approved copy\n\n([\s\S]*?)\n\n---\n\n# Art direction/u);
  if (!captionMatch) throw new Error('Cannot extract approved carousel caption');
  return { slides, caption: canonicalMarkdownBlock(captionMatch[1]) };
}

async function loadApprovedCarousels(validate) {
  const files = await listJsonFiles(carouselDirectory);
  const approved = [];
  for (const sourcePath of files) {
    const carousel = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    validate(carousel, sourcePath);
    if (carousel.status === 'approved-for-render') approved.push({ carousel, sourcePath });
  }
  if (approved.length === 0) throw new Error(`No carousel with status approved-for-render in ${carouselDirectory}`);
  return approved;
}

async function createContactSheet(pngPaths, targetPath) {
  const thumbWidth = 216;
  const thumbHeight = 288;
  const gap = 24;
  const width = 744;
  const height = 960;
  const composites = [];
  for (let index = 0; index < pngPaths.length; index += 1) {
    const input = await sharp(pngPaths[index]).resize(thumbWidth, thumbHeight, { fit: 'fill' }).png().toBuffer();
    composites.push({
      input,
      left: gap + (index % 3) * (thumbWidth + gap),
      top: gap + Math.floor(index / 3) * (thumbHeight + gap)
    });
  }
  await sharp({ create: { width, height, channels: 4, background: '#f4f1e9' } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
  return { width, height };
}

async function renderCarousel({ browser, carousel, sourcePath, stylesheet }) {
  const outputDirectory = path.join(outputRoot, carousel.id);
  const renderDirectory = path.join(renderRoot, carousel.id);
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(renderDirectory, { recursive: true });
  const contentSourcePath = path.join(factoryRoot, carousel.contentSource.path);
  await assertFile(contentSourcePath, 'Carousel content source');
  const contentMarkdownBefore = await fs.readFile(contentSourcePath, 'utf8');
  const approvedCopy = extractApprovedCopy(contentMarkdownBefore, carousel.slides.length);
  const contentShaBefore = await sha256File(contentSourcePath);
  const captionBefore = carousel.caption.join('\n\n');
  const slideCopySourceExact = carousel.slides.every((slide) => (
    canonicalMarkdownBlock(structuredSlideBlock(slide)) === approvedCopy.slides.get(slide.id)
  ));
  const fontUrls = Object.fromEntries(Object.entries(fontPaths).map(([key, value]) => [key, pathToFileURL(value).href]));

  const slideReports = [];
  const pngPaths = [];
  for (const slide of carousel.slides) {
    const html = renderCarouselHtml({ carousel, slide, stylesheet, fontUrls });
    const htmlPath = path.join(renderDirectory, `${slide.id}.html`);
    const pngPath = path.join(outputDirectory, `${slide.id}.png`);
    const qaPath = path.join(outputDirectory, `${slide.id}.qa.json`);
    await fs.writeFile(htmlPath, html);
    const page = await browser.newPage({ viewport: carousel.canvas, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const browserQa = await runCarouselBrowserQa(page, { carousel, slide });
    await page.screenshot({ path: pngPath, animations: 'disabled', fullPage: false });
    await page.close();
    const metadata = await sharp(pngPath).metadata();
    const checks = {
      pngDimensionsExact: metadata.width === 1080 && metadata.height === 1440,
      ...browserQa.checks
    };
    const report = {
      pipelineVersion: 1,
      carouselId: carousel.id,
      slideId: slide.id,
      layoutFamily: carousel.layoutFamily,
      mode: slide.mode,
      generatedAt: new Date().toISOString(),
      passed: everyTrue(checks),
      checks,
      failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
      artifact: {
        png: path.relative(factoryRoot, pngPath),
        url: `${baseUrl}${carousel.id}/${slide.id}.png`,
        width: metadata.width,
        height: metadata.height,
        sha256: await sha256File(pngPath)
      },
      browserQa: browserQa.details
    };
    await fs.writeFile(qaPath, `${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) throw new Error(`Carousel QA failed for ${slide.id}: ${report.failedChecks.join(', ')}`);
    slideReports.push(report);
    pngPaths.push(pngPath);
  }

  const contactSheetPath = path.join(outputDirectory, 'contact-sheet.png');
  const contactSheetDimensions = await createContactSheet(pngPaths, contactSheetPath);
  const contentShaAfter = await sha256File(contentSourcePath);
  const captionAfter = carousel.caption.join('\n\n');
  // A slide may declare a sequence that must appear in it verbatim — a pipeline diagram whose
  // order carries meaning. Declared in the carousel, so it binds where it applies and is
  // simply absent everywhere else.
  const sequenceSlides = carousel.slides.filter((slide) => Array.isArray(slide.expectedSequence));
  const declaredSequencesExact = sequenceSlides.every((slide) => {
    const [from, to] = slide.expectedSequenceRange ?? [0, slide.text.length];
    return JSON.stringify(slide.text.slice(from, to)) === JSON.stringify(slide.expectedSequence);
  });
  const checks = {
    structuredCarouselValid: true,
    approvedForRender: carousel.status === 'approved-for-render',
    publishDisabled: carousel.publish === false,
    // The brief and the structured carousel must agree on how many slides there are;
    // the number itself is whatever the carousel declares.
    slideCountExact: approvedCopy.slides.size === carousel.slides.length,
    layoutFamilyExact: carousel.layoutFamily === 'process-diagram-carousel',
    contentSourceChecksumExact: contentShaBefore === carousel.contentSource.sha256,
    contentSourceUnchanged: contentShaBefore === contentShaAfter,
    slideCopySourceExact,
    captionSourceExact: canonicalMarkdownBlock(captionBefore) === approvedCopy.caption,
    captionChecksumExact: sha256Text(captionBefore) === carousel.captionSha256,
    captionUnchanged: captionBefore === captionAfter,
    allSlidesPassed: slideReports.every((report) => report.passed),
    allPngDimensionsExact: slideReports.every((report) => report.artifact.width === 1080 && report.artifact.height === 1440),
    noTextInternalOverflow: slideReports.every((report) => report.checks.noTextInternalOverflow),
    allHeadlinesWithoutTerminalPeriods: slideReports.every((report) => report.checks.headlinesWithoutTerminalPeriods),
    safeZoneMinimum120: slideReports.every((report) => report.checks.safeZoneMinimum120 && report.checks.textInsideSafeZone),
    lineHeightByRoleExact: slideReports.every((report) => report.checks.lineHeightByRoleExact),
    nonBreakingSpacesApplied: slideReports.every((report) => report.checks.nonBreakingSpacesApplied),
    declaredSequencesExact,
    noPhotography: slideReports.every((report) => report.checks.noPhotography),
    contactSheetCreated: contactSheetDimensions.width === 744 && contactSheetDimensions.height === 960
  };
  const report = {
    pipelineVersion: 1,
    carouselId: carousel.id,
    source: path.relative(factoryRoot, sourcePath),
    generatedAt: new Date().toISOString(),
    passed: everyTrue(checks),
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    integrity: {
      contentSource: carousel.contentSource.path,
      contentSha256: contentShaAfter,
      captionSha256: sha256Text(captionAfter)
    },
    contactSheet: {
      path: path.relative(factoryRoot, contactSheetPath),
      url: `${baseUrl}${carousel.id}/contact-sheet.png`,
      width: contactSheetDimensions.width,
      height: contactSheetDimensions.height,
      sha256: await sha256File(contactSheetPath)
    },
    slides: slideReports.map((slideReport) => ({
      id: slideReport.slideId,
      mode: slideReport.mode,
      passed: slideReport.passed,
      png: slideReport.artifact.png,
      url: slideReport.artifact.url,
      sha256: slideReport.artifact.sha256,
      qa: `${slideReport.slideId}.qa.json`
    }))
  };
  await fs.writeFile(path.join(outputDirectory, 'carousel.qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) throw new Error(`Carousel series QA failed: ${report.failedChecks.join(', ')}`);
  return report;
}

async function main() {
  await Promise.all([
    assertFile(schemaPath, 'Carousel schema'),
    ...Object.entries(fontPaths).map(([name, filePath]) => assertFile(filePath, `Font ${name}`))
  ]);
  const validate = await createPostValidator(schemaPath);
  const approved = await loadApprovedCarousels(validate);
  const stylesheet = await fs.readFile(path.join(rendererDirectory, 'carousel-families', 'process-diagram-carousel', 'styles.css'), 'utf8');
  const launchOptions = {
    headless: true,
    args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--font-render-hinting=none']
  };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  const reports = [];
  try {
    for (const item of approved) reports.push(await renderCarousel({ browser, stylesheet, ...item }));
  } finally {
    await browser.close();
  }
  console.log(`Rendered ${reports.reduce((total, report) => total + report.slides.length, 0)} carousel slide(s). All QA gates passed.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
