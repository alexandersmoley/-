import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { renderPinnedIntroEditorial } from '../carousel-families/pinned-intro-editorial/index.mjs';
import { escapeHtml } from '../carousel-families/shared.mjs';
import { assertFile, sha256File } from '../lib/files.mjs';
import { runPinnedIntroCarouselQa } from '../lib/pinned-intro-carousel-qa.mjs';
import { createPostValidator } from '../lib/validate.mjs';

const rendererDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const factoryRoot = path.resolve(rendererDirectory, '..');
const sourcePath = path.join(factoryRoot, 'carousels', 'pinned-intro-carousel-v2', 'source.json');
const schemaPath = path.join(factoryRoot, 'schemas', 'pinned-intro-carousel-v2.schema.json');
const stylesheetPath = path.join(rendererDirectory, 'carousel-families', 'pinned-intro-editorial', 'styles.css');
const outputDirectory = path.join(factoryRoot, 'output', 'pinned-intro-carousel-v2');
const coverOutputDirectory = path.join(outputDirectory, 'covers');
const renderDirectory = path.join(factoryRoot, '.render', 'carousels', 'pinned-intro-carousel-v2');
const baseUrl = (process.env.OUTPUT_BASE_URL || 'https://alexandersmoley.github.io/-/').replace(/\/?$/, '/');

const fontPaths = {
  inter: path.join(factoryRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-cyrillic-400-normal.woff2'),
  cormorantRegular: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-normal.woff2'),
  cormorantItalic: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-italic.woff2')
};

const allTrue = (checks) => Object.values(checks).every(Boolean);
const sha256Text = (value) => crypto.createHash('sha256').update(value).digest('hex');

function extractCopyFreeze(markdown) {
  const freezeIndex = markdown.indexOf('# 15. Final copy freeze');
  if (freezeIndex < 0) throw new Error('Final copy freeze section is missing');
  const freeze = markdown.slice(freezeIndex);
  const textById = new Map();
  for (const id of ['cover-a', 'cover-b', 'cover-c', ...Array.from({ length: 9 }, (_, index) => `slide-${String(index + 1).padStart(2, '0')}`)]) {
    const match = freeze.match(new RegExp(`## ${id}\\n\\n([\\s\\S]*?)(?=\\n## |$)`, 'u'));
    if (!match) throw new Error(`Copy freeze block is missing: ${id}`);
    textById.set(id, match[1].split('\n').filter((line) => line.startsWith('- ')).map((line) => line.slice(2)));
  }
  const captionMatch = freeze.match(/## caption\n\n([\s\S]*)$/u);
  if (!captionMatch) throw new Error('Caption freeze block is missing');
  const caption = captionMatch[1].trim().split(/\n\n+/u);
  return { textById, caption };
}

function renderHtml({ project, item, stylesheet, fontUrls, assetUrl }) {
  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);
  const variables = [
    `--ink:${project.designTokens.ink}`,
    `--paper:${project.designTokens.paper}`,
    `--blue:${project.designTokens.blue}`,
    `--grid:${project.designTokens.grid}`,
    `--safe-top:${project.safeZone.top}px`,
    `--safe-right:${project.safeZone.right}px`,
    `--safe-bottom:${project.safeZone.bottom}px`,
    `--safe-left:${project.safeZone.left}px`
  ].join(';');
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, initial-scale=1">
  <title>${escapeHtml(project.id)} — ${escapeHtml(item.id)}</title>
  <style>${css}</style>
</head>
<body style="${variables}">
  <main class="carousel-slide mode-${escapeHtml(item.mode)} family-${escapeHtml(project.layoutFamily)}" data-carousel-id="${escapeHtml(project.id)}" data-item-id="${escapeHtml(item.id)}" data-mode="${escapeHtml(item.mode)}" data-color>
    ${renderPinnedIntroEditorial(item, { assetUrl })}
  </main>
</body>
</html>`;
}

async function createContactSheet(pngPaths, targetPath) {
  const thumbWidth = 216;
  const thumbHeight = 288;
  const gap = 24;
  const composites = [];
  for (let index = 0; index < pngPaths.length; index += 1) {
    composites.push({
      input: await sharp(pngPaths[index]).resize(thumbWidth, thumbHeight, { fit: 'fill' }).png().toBuffer(),
      left: gap + (index % 3) * (thumbWidth + gap),
      top: gap + Math.floor(index / 3) * (thumbHeight + gap)
    });
  }
  await sharp({ create: { width: 744, height: 960, channels: 4, background: '#f4f1e9' } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
  return { width: 744, height: 960 };
}

async function createThumbnailSheet(pngPaths, targetPath) {
  const width = 1020;
  const height = 460;
  const thumbWidth = 300;
  const thumbHeight = 400;
  const gap = 30;
  const composites = [];
  for (let index = 0; index < pngPaths.length; index += 1) {
    composites.push({
      input: await sharp(pngPaths[index]).resize(thumbWidth, thumbHeight, { fit: 'fill' }).png().toBuffer(),
      left: gap + index * (thumbWidth + gap),
      top: 30
    });
  }
  await sharp({ create: { width, height, channels: 4, background: '#f4f1e9' } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
  return { width, height };
}

async function renderItem({ browser, project, item, stylesheet, fontUrls, assetUrl, isCover }) {
  const targetDirectory = isCover ? coverOutputDirectory : outputDirectory;
  const htmlPath = path.join(renderDirectory, `${item.id}.html`);
  const pngPath = path.join(targetDirectory, `${item.id}.png`);
  const qaPath = path.join(targetDirectory, `${item.id}.qa.json`);
  await fs.writeFile(htmlPath, renderHtml({ project, item, stylesheet, fontUrls, assetUrl }));
  const page = await browser.newPage({ viewport: project.canvas, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; });
  const browserQa = await runPinnedIntroCarouselQa(page, { project, item, expectedAssetUrl: assetUrl });
  await page.screenshot({ path: pngPath, animations: 'disabled', fullPage: false });
  await page.close();
  const metadata = await sharp(pngPath).metadata();
  const checks = { pngDimensionsExact: metadata.width === 1080 && metadata.height === 1440, ...browserQa.checks };
  const report = {
    pipelineVersion: 1,
    carouselId: project.id,
    itemId: item.id,
    kind: isCover ? 'cover-variant' : 'production-slide',
    mode: item.mode,
    generatedAt: new Date().toISOString(),
    passed: allTrue(checks),
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    artifact: {
      png: path.relative(factoryRoot, pngPath),
      url: `${baseUrl}${project.id}/${isCover ? 'covers/' : ''}${item.id}.png`,
      width: metadata.width,
      height: metadata.height,
      sha256: await sha256File(pngPath)
    },
    browserQa: browserQa.details
  };
  await fs.writeFile(qaPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, pngPath };
}

async function main() {
  await Promise.all([
    assertFile(sourcePath, 'Pinned carousel structured source'),
    assertFile(schemaPath, 'Pinned carousel schema'),
    assertFile(stylesheetPath, 'Pinned carousel stylesheet'),
    ...Object.entries(fontPaths).map(([name, filePath]) => assertFile(filePath, `Font ${name}`))
  ]);
  const project = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  const validate = await createPostValidator(schemaPath);
  validate(project, sourcePath);
  const contentPath = path.join(factoryRoot, project.contentSource.path);
  const assetPath = path.join(factoryRoot, project.asset.path);
  await Promise.all([assertFile(contentPath, 'Pinned carousel content source'), assertFile(assetPath, 'Approved Canva asset')]);
  const contentMarkdown = await fs.readFile(contentPath, 'utf8');
  const freeze = extractCopyFreeze(contentMarkdown);
  const allItems = [...project.coverVariants, ...project.slides];
  const copyFreezeExact = allItems.every((item) => JSON.stringify(item.text) === JSON.stringify(freeze.textById.get(item.id)));
  const captionFreezeExact = JSON.stringify(project.caption) === JSON.stringify(freeze.caption);
  const assetMetadata = await sharp(assetPath).metadata();
  const stylesheet = await fs.readFile(stylesheetPath, 'utf8');
  const fontUrls = Object.fromEntries(Object.entries(fontPaths).map(([key, value]) => [key, pathToFileURL(value).href]));
  const assetUrl = pathToFileURL(assetPath).href;
  await fs.mkdir(coverOutputDirectory, { recursive: true });
  await fs.mkdir(renderDirectory, { recursive: true });

  const launchOptions = { headless: true, args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--font-render-hinting=none'] };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  const coverResults = [];
  const slideResults = [];
  try {
    for (const item of project.coverVariants) coverResults.push(await renderItem({ browser, project, item, stylesheet, fontUrls, assetUrl, isCover: true }));
    for (const item of project.slides) slideResults.push(await renderItem({ browser, project, item, stylesheet, fontUrls, assetUrl, isCover: false }));
  } finally {
    await browser.close();
  }

  const contactSheetPath = path.join(outputDirectory, 'contact-sheet.png');
  const thumbnailSheetPath = path.join(outputDirectory, 'thumbnail-sheet.png');
  const contactSheet = await createContactSheet(slideResults.map(({ pngPath }) => pngPath), contactSheetPath);
  const thumbnailSheet = await createThumbnailSheet(coverResults.map(({ pngPath }) => pngPath), thumbnailSheetPath);
  const selectedCover = project.coverVariants.find((cover) => cover.id === project.selectedCover);
  const selectedSlide = project.slides[0];
  const contentSha = await sha256File(contentPath);
  const assetSha = await sha256File(assetPath);
  const captionSha = sha256Text(project.caption.join('\n\n'));
  const checks = {
    structuredSourceValid: true,
    approvedForRender: project.status === 'approved-for-render',
    publishDisabled: project.publish === false,
    canvasExact: project.canvas.width === 1080 && project.canvas.height === 1440,
    safeZoneExact: Object.values(project.safeZone).every((value) => value === 120),
    threeCoverVariants: project.coverVariants.length === 3,
    coverDirectionsDistinct: new Set(project.coverVariants.map((item) => item.mode)).size === 3,
    selectedCoverExact: project.selectedCover === 'cover-b' && selectedCover.mode === selectedSlide.mode && JSON.stringify(selectedCover.text) === JSON.stringify(selectedSlide.text),
    slideCountExact: project.slides.length === 9,
    layoutFamilyExact: project.layoutFamily === 'pinned-intro-editorial',
    copyFreezeExact,
    captionFreezeExact,
    contentSourceChecksumExact: contentSha === project.contentSource.sha256,
    captionChecksumExact: captionSha === project.captionSha256,
    approvedAssetIdExact: project.asset.id === 'MAHTX_B6J9k',
    approvedAssetChecksumExact: assetSha === project.asset.sha256,
    approvedAssetDimensionsExact: assetMetadata.width === project.asset.width && assetMetadata.height === project.asset.height,
    allCoversPassed: coverResults.every(({ report }) => report.passed),
    allSlidesPassed: slideResults.every(({ report }) => report.passed),
    visualFirstMinimum: project.slides.filter((item) => item.visualType !== 'text').length >= 6,
    adjacentCompositionsDistinct: project.slides.every((item, index, slides) => index === 0 || item.mode !== slides[index - 1].mode),
    contactSheetCreated: contactSheet.width === 744 && contactSheet.height === 960,
    thumbnailSheetCreated: thumbnailSheet.width === 1020 && thumbnailSheet.height === 460,
    socialPublishingNotExecuted: project.publish === false
  };
  const report = {
    pipelineVersion: 1,
    carouselId: project.id,
    generatedAt: new Date().toISOString(),
    passed: allTrue(checks),
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    integrity: { contentSha256: contentSha, captionSha256: captionSha, assetId: project.asset.id, assetSha256: assetSha },
    contactSheet: { path: path.relative(factoryRoot, contactSheetPath), url: `${baseUrl}${project.id}/contact-sheet.png`, ...contactSheet, sha256: await sha256File(contactSheetPath) },
    thumbnailSheet: { path: path.relative(factoryRoot, thumbnailSheetPath), url: `${baseUrl}${project.id}/thumbnail-sheet.png`, ...thumbnailSheet, sha256: await sha256File(thumbnailSheetPath) },
    covers: coverResults.map(({ report }) => ({ id: report.itemId, mode: report.mode, passed: report.passed, png: report.artifact.png, url: report.artifact.url, qa: `covers/${report.itemId}.qa.json` })),
    slides: slideResults.map(({ report }) => ({ id: report.itemId, mode: report.mode, passed: report.passed, png: report.artifact.png, url: report.artifact.url, qa: `${report.itemId}.qa.json` }))
  };
  await fs.writeFile(path.join(outputDirectory, 'carousel.qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) {
    for (const { report: itemReport } of [...coverResults, ...slideResults]) {
      if (!itemReport.passed) console.error(`${itemReport.itemId}: ${itemReport.failedChecks.join(', ')}`);
    }
    throw new Error(`Pinned intro carousel QA failed: ${report.failedChecks.join(', ')}`);
  }
  console.log('Rendered 3 cover variants and 9 production slides. All pinned-intro-v2 QA gates passed.');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
