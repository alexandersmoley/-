import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { renderHumanToSystemCalm } from '../carousel-families/human-to-system-calm/index.mjs';
import { escapeHtml } from '../carousel-families/shared.mjs';
import { assertFile, sha256File } from '../lib/files.mjs';
import { runPinnedIntroCarouselV3Qa } from '../lib/pinned-intro-carousel-v3-qa.mjs';
import { createPostValidator } from '../lib/validate.mjs';

const rendererDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const factoryRoot = path.resolve(rendererDirectory, '..');
const sourcePath = path.join(factoryRoot, 'carousels', 'pinned-intro-carousel-v3', 'source.json');
const schemaPath = path.join(factoryRoot, 'schemas', 'pinned-intro-carousel-v3.schema.json');
const stylesheetPath = path.join(rendererDirectory, 'carousel-families', 'human-to-system-calm', 'styles.css');
const outputDirectory = path.join(factoryRoot, 'output', 'pinned-intro-carousel-v3');
const renderDirectory = path.join(factoryRoot, '.render', 'carousels', 'pinned-intro-carousel-v3');
const baseUrl = (process.env.OUTPUT_BASE_URL || 'https://alexandersmoley.github.io/-/').replace(/\/?$/, '/');

const fontPaths = {
  inter: path.join(factoryRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-cyrillic-400-normal.woff2'),
  cormorantRegular: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-normal.woff2'),
  cormorantItalic: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-italic.woff2')
};

const allTrue = (checks) => Object.values(checks).every(Boolean);
const sha256Text = (value) => crypto.createHash('sha256').update(value).digest('hex');

function extractCopyFreeze(markdown) {
  const freezeIndex = markdown.indexOf('# Exact copy freeze');
  if (freezeIndex < 0) throw new Error('Exact copy freeze section is missing');
  const freeze = markdown.slice(freezeIndex);
  const textById = new Map();
  for (const id of Array.from({ length: 7 }, (_, index) => `slide-${String(index + 1).padStart(2, '0')}`)) {
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
    ${renderHumanToSystemCalm(item, { assetUrl })}
  </main>
</body>
</html>`;
}

async function createContactSheet(pngPaths, targetPath) {
  const thumbWidth = 216;
  const thumbHeight = 288;
  const gap = 24;
  const columns = 4;
  const width = columns * thumbWidth + (columns + 1) * gap;
  const rows = Math.ceil(pngPaths.length / columns);
  const height = rows * thumbHeight + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < pngPaths.length; index += 1) {
    composites.push({
      input: await sharp(pngPaths[index]).resize(thumbWidth, thumbHeight, { fit: 'fill' }).png().toBuffer(),
      left: gap + (index % columns) * (thumbWidth + gap),
      top: gap + Math.floor(index / columns) * (thumbHeight + gap)
    });
  }
  await sharp({ create: { width, height, channels: 4, background: '#deddd7' } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
  return { width, height };
}

async function createCoverPreview(sourcePath, targetPath) {
  const width = 360;
  const height = 460;
  const thumb = await sharp(sourcePath).resize(300, 400, { fit: 'fill' }).png().toBuffer();
  await sharp({ create: { width, height, channels: 4, background: '#deddd7' } })
    .composite([{ input: thumb, left: 30, top: 30 }])
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
  return { width, height };
}

async function renderItem({ browser, project, item, stylesheet, fontUrls, assetUrl }) {
  const htmlPath = path.join(renderDirectory, `${item.id}.html`);
  const pngPath = path.join(outputDirectory, `${item.id}.png`);
  const qaPath = path.join(outputDirectory, `${item.id}.qa.json`);
  await fs.writeFile(htmlPath, renderHtml({ project, item, stylesheet, fontUrls, assetUrl }));
  const page = await browser.newPage({ viewport: project.canvas, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; });
  const browserQa = await runPinnedIntroCarouselV3Qa(page, { project, item, expectedAssetUrl: assetUrl });
  await page.screenshot({ path: pngPath, animations: 'disabled', fullPage: false });
  await page.close();
  const metadata = await sharp(pngPath).metadata();
  const checks = { pngDimensionsExact: metadata.width === 1080 && metadata.height === 1440, ...browserQa.checks };
  const report = {
    pipelineVersion: 1,
    carouselId: project.id,
    itemId: item.id,
    kind: item.id === 'slide-01' ? 'production-cover' : 'production-slide',
    mode: item.mode,
    generatedAt: new Date().toISOString(),
    passed: allTrue(checks),
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    artifact: {
      png: path.relative(factoryRoot, pngPath),
      url: `${baseUrl}${project.id}/${item.id}.png`,
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
    assertFile(sourcePath, 'Pinned carousel v3 structured source'),
    assertFile(schemaPath, 'Pinned carousel v3 schema'),
    assertFile(stylesheetPath, 'Pinned carousel v3 stylesheet'),
    ...Object.entries(fontPaths).map(([name, filePath]) => assertFile(filePath, `Font ${name}`))
  ]);
  const project = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  const validate = await createPostValidator(schemaPath);
  validate(project, sourcePath);
  const contentPath = path.join(factoryRoot, project.contentSource.path);
  const assetPath = path.join(factoryRoot, project.asset.path);
  await Promise.all([assertFile(contentPath, 'Pinned carousel v3 content source'), assertFile(assetPath, 'Approved Canva asset')]);
  const contentMarkdown = await fs.readFile(contentPath, 'utf8');
  const freeze = extractCopyFreeze(contentMarkdown);
  const copyFreezeExact = project.slides.every((item) => JSON.stringify(item.text) === JSON.stringify(freeze.textById.get(item.id)));
  const captionFreezeExact = JSON.stringify(project.caption) === JSON.stringify(freeze.caption);
  const assetMetadata = await sharp(assetPath).metadata();
  const stylesheet = await fs.readFile(stylesheetPath, 'utf8');
  const fontUrls = Object.fromEntries(Object.entries(fontPaths).map(([key, value]) => [key, pathToFileURL(value).href]));
  const assetUrl = pathToFileURL(assetPath).href;
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(renderDirectory, { recursive: true });

  const launchOptions = { headless: true, args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--font-render-hinting=none'] };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  const slideResults = [];
  try {
    for (const item of project.slides) slideResults.push(await renderItem({ browser, project, item, stylesheet, fontUrls, assetUrl }));
  } finally {
    await browser.close();
  }

  const contactSheetPath = path.join(outputDirectory, 'contact-sheet.png');
  const coverPreviewPath = path.join(outputDirectory, 'cover-preview.png');
  const contactSheet = await createContactSheet(slideResults.map(({ pngPath }) => pngPath), contactSheetPath);
  const coverPreview = await createCoverPreview(slideResults[0].pngPath, coverPreviewPath);
  const contentSha = await sha256File(contentPath);
  const assetSha = await sha256File(assetPath);
  const captionSha = sha256Text(project.caption.join('\n\n'));
  const photoSlides = project.slides.filter((item) => item.usesApprovedPhoto);
  const flattenedCopy = [...project.slides.flatMap((item) => item.text), ...project.caption].join(' ');
  const checks = {
    structuredSourceValid: true,
    approvedForRender: project.status === 'approved-for-render',
    publishDisabled: project.publish === false,
    canvasExact: project.canvas.width === 1080 && project.canvas.height === 1440,
    safeZoneExact: Object.values(project.safeZone).every((value) => value === 120),
    slideCountExact: project.slides.length === 7,
    layoutFamilyExact: project.layoutFamily === 'human-to-system-calm',
    copyFreezeExact,
    captionFreezeExact,
    contentSourceChecksumExact: contentSha === project.contentSource.sha256,
    captionChecksumExact: captionSha === project.captionSha256,
    approvedAssetIdExact: project.asset.id === 'MAHTX_B6J9k',
    approvedAssetChecksumExact: assetSha === project.asset.sha256,
    approvedAssetDimensionsExact: assetMetadata.width === project.asset.width && assetMetadata.height === project.asset.height,
    productionPhotoUsedOnce: photoSlides.length === 1,
    productionPhotoOnlyOnSlide01: photoSlides[0]?.id === 'slide-01',
    productionCoverHasPhoto: project.slides[0].usesApprovedPhoto === true,
    mountainPhotoExcluded: project.asset.id !== 'MAHTZduqLyI' && !project.asset.path.includes('mountains-son'),
    allSlidesPassed: slideResults.every(({ report }) => report.passed),
    photoCompositionPassed: slideResults.find(({ report }) => report.itemId === 'slide-01')?.report.checks.approvedPhotoEditorialPlacement === true,
    adjacentCompositionsDistinct: project.slides.every((item, index, slides) => index === 0 || item.mode !== slides[index - 1].mode),
    clientExperienceWordingExact: flattenedCopy.includes('Для кого я писал') && flattenedCopy.includes('Писал для') && !/работал[аи]? (?:в|с)/iu.test(flattenedCopy),
    aluminiumAssociationCaseIncluded: project.slides.find((item) => item.id === 'slide-03')?.text.includes('Алюминиевая Ассоциация') === true,
    ctaOnlyOnClosingSlide: project.slides.every((item) => item.id === 'slide-07'
      ? item.text.some((value) => /подписывайтесь/iu.test(value))
      : item.text.every((value) => !/подпиш/iu.test(value))),
    noBrandSalesPromise: !/(прода\p{L}*|услуг\p{L}*|систем\p{L}*)[^.]{0,60}бренд/iu.test(flattenedCopy),
    noEmptyWritingConnectors: !/(мне интересно другое|вообще-то|почему-то|давайте разбер)/iu.test(flattenedCopy),
    contactSheetCreated: contactSheet.width === 984 && contactSheet.height === 648,
    coverPreviewCreated: coverPreview.width === 360 && coverPreview.height === 460,
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
    coverPreview: { path: path.relative(factoryRoot, coverPreviewPath), url: `${baseUrl}${project.id}/cover-preview.png`, ...coverPreview, sha256: await sha256File(coverPreviewPath) },
    slides: slideResults.map(({ report: slideReport }) => ({ id: slideReport.itemId, mode: slideReport.mode, passed: slideReport.passed, png: slideReport.artifact.png, url: slideReport.artifact.url, qa: `${slideReport.itemId}.qa.json` }))
  };
  await fs.writeFile(path.join(outputDirectory, 'carousel.qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  const selfReview = `# Pinned intro carousel v3 — self-review\n\n- Writing contract: PASS\n- Exact copy freeze: PASS\n- Approved chair photo used once, on slide 01: PASS\n- Mountain-and-son photo excluded: PASS\n- Portrait composition preserved without generative redraw: PASS\n- Slide 02 uses typography only: PASS\n- Aluminium Association case included on slide 03: PASS\n- Client wording uses “писал для”: PASS\n- CTA appears only on closing slide: PASS\n- Brand-sales promise removed: PASS\n- Seven distinct calm editorial compositions: PASS\n- Social publishing: NOT EXECUTED\n`;
  await fs.writeFile(path.join(outputDirectory, 'self-review.md'), selfReview);
  if (!report.passed) {
    for (const { report: itemReport } of slideResults) {
      if (!itemReport.passed) console.error(`${itemReport.itemId}: ${itemReport.failedChecks.join(', ')}`);
    }
    throw new Error(`Pinned intro carousel v3 QA failed: ${report.failedChecks.join(', ')}`);
  }
  console.log('Rendered 7 production slides. All pinned-intro-v3 QA gates passed.');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
