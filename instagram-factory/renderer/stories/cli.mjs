import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { renderStoryHtml, storyLayoutFamilies } from '../story-families/index.mjs';
import { assertFile, listJsonFiles, sha256File } from '../lib/files.mjs';
import { runStoryBrowserQa } from '../lib/story-browser-qa.mjs';
import { createPostValidator } from '../lib/validate.mjs';

const storiesRendererDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererDirectory = path.resolve(storiesRendererDirectory, '..');
const factoryRoot = path.resolve(rendererDirectory, '..');
const storiesDirectory = path.join(factoryRoot, 'stories');
const schemaPath = path.join(factoryRoot, 'schemas', 'story-series.schema.json');
const outputRoot = path.join(factoryRoot, 'output');
const renderRoot = path.join(factoryRoot, '.render', 'stories');
const baseUrl = (process.env.OUTPUT_BASE_URL || 'https://alexandersmoley.github.io/-/').replace(/\/?$/, '/');

const fontPaths = {
  inter: path.join(factoryRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-cyrillic-400-normal.woff2'),
  cormorantRegular: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-normal.woff2'),
  cormorantItalic: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-italic.woff2')
};

const everyTrue = (checks) => Object.values(checks).every(Boolean);

async function loadApprovedSeries(validate) {
  const files = await listJsonFiles(storiesDirectory);
  const approved = [];
  for (const sourcePath of files) {
    const series = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    validate(series, sourcePath);
    if (series.status === 'approved-for-render') approved.push({ series, sourcePath });
  }
  if (approved.length === 0) throw new Error(`No story series with status approved-for-render in ${storiesDirectory}`);
  return approved;
}

async function createContactSheet(pngPaths, targetPath) {
  const thumbWidth = 270;
  const thumbHeight = 480;
  const gap = 36;
  const sheetWidth = 1260;
  const sheetHeight = 1068;
  const composites = [];
  for (let index = 0; index < pngPaths.length; index += 1) {
    const input = await sharp(pngPaths[index]).resize(thumbWidth, thumbHeight, { fit: 'fill' }).png().toBuffer();
    composites.push({
      input,
      left: gap + (index % 4) * (thumbWidth + gap),
      top: gap + Math.floor(index / 4) * (thumbHeight + gap)
    });
  }
  await sharp({
    create: { width: sheetWidth, height: sheetHeight, channels: 4, background: '#f4f1e9' }
  }).composite(composites).png().toFile(targetPath);
  return { width: sheetWidth, height: sheetHeight };
}

async function renderSeries({ browser, series, sourcePath, stylesheet }) {
  const outputDirectory = path.join(outputRoot, series.id);
  const renderDirectory = path.join(renderRoot, series.id);
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(renderDirectory, { recursive: true });

  const contentSourcePath = path.join(factoryRoot, series.contentSource.path);
  const assetPath = path.join(factoryRoot, series.photoAsset.path);
  await assertFile(contentSourcePath, 'Stories content source');
  await assertFile(assetPath, 'Approved Stories photo');
  const contentShaBefore = await sha256File(contentSourcePath);
  const assetSha = await sha256File(assetPath);
  const assetUrl = pathToFileURL(assetPath).href;
  const fontUrls = Object.fromEntries(Object.entries(fontPaths).map(([key, value]) => [key, pathToFileURL(value).href]));

  const storyReports = [];
  const pngPaths = [];
  for (const story of series.stories) {
    const html = renderStoryHtml({ series, story, stylesheet, assetUrl, fontUrls });
    const htmlPath = path.join(renderDirectory, `${story.id}.html`);
    const pngPath = path.join(outputDirectory, `${story.id}.png`);
    const qaPath = path.join(outputDirectory, `${story.id}.qa.json`);
    await fs.writeFile(htmlPath, html);

    const page = await browser.newPage({ viewport: series.canvas, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const browserQa = await runStoryBrowserQa(page, { series, story, expectedAssetUrl: assetUrl });
    if (story.layoutFamily === 'story-photo-editorial') {
      const rawPngPath = path.join(renderDirectory, `${story.id}.raw.png`);
      await page.screenshot({ path: rawPngPath, animations: 'disabled', fullPage: false });
      await sharp(rawPngPath)
        .png({ palette: true, quality: 100, compressionLevel: 9, effort: 10 })
        .toFile(pngPath);
      await fs.unlink(rawPngPath);
    } else {
      await page.screenshot({ path: pngPath, animations: 'disabled', fullPage: false });
    }
    await page.close();

    const metadata = await sharp(pngPath).metadata();
    const checks = {
      pngDimensionsExact: metadata.width === 1080 && metadata.height === 1920,
      ...browserQa.checks
    };
    const report = {
      pipelineVersion: 1,
      seriesId: series.id,
      storyId: story.id,
      role: story.role,
      layoutFamily: story.layoutFamily,
      generatedAt: new Date().toISOString(),
      passed: everyTrue(checks),
      checks,
      failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
      artifact: {
        png: path.relative(factoryRoot, pngPath),
        url: `${baseUrl}${series.id}/${story.id}.png`,
        width: metadata.width,
        height: metadata.height,
        sha256: await sha256File(pngPath)
      },
      browserQa: browserQa.details
    };
    await fs.writeFile(qaPath, `${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) throw new Error(`Stories QA failed for ${story.id}: ${report.failedChecks.join(', ')}`);
    storyReports.push(report);
    pngPaths.push(pngPath);
  }

  const contactSheetPath = path.join(outputDirectory, 'contact-sheet.png');
  const contactSheetDimensions = await createContactSheet(pngPaths, contactSheetPath);
  const contentShaAfter = await sha256File(contentSourcePath);
  const familySet = new Set(series.stories.map((story) => story.layoutFamily));
  const seriesChecks = {
    structuredSeriesValid: true,
    approvedForRender: series.status === 'approved-for-render',
    storyCountExact: series.stories.length === 8,
    allLayoutFamiliesUnique: familySet.size === 8 && storyLayoutFamilies.every((family) => familySet.has(family)),
    contentSourceChecksumExact: contentShaBefore === series.contentSource.sha256,
    contentSourceUnchanged: contentShaBefore === contentShaAfter,
    approvedPhotoChecksumExact: assetSha === series.photoAsset.sha256,
    allStoriesPassed: storyReports.every((report) => report.passed),
    allPngDimensionsExact: storyReports.every((report) => report.artifact.width === 1080 && report.artifact.height === 1920),
    photoOnlyUsedByStory07: storyReports.every((report) => report.browserQa.photo ? report.storyId === 'story-07' : report.storyId !== 'story-07'),
    contactSheetCreated: contactSheetDimensions.width === 1260 && contactSheetDimensions.height === 1068
  };
  const seriesReport = {
    pipelineVersion: 1,
    seriesId: series.id,
    source: path.relative(factoryRoot, sourcePath),
    generatedAt: new Date().toISOString(),
    passed: everyTrue(seriesChecks),
    checks: seriesChecks,
    failedChecks: Object.entries(seriesChecks).filter(([, passed]) => !passed).map(([name]) => name),
    integrity: {
      contentSource: series.contentSource.path,
      contentSha256: contentShaAfter,
      canvaAssetId: series.photoAsset.canvaAssetId,
      photoSha256: assetSha
    },
    contactSheet: {
      path: path.relative(factoryRoot, contactSheetPath),
      url: `${baseUrl}${series.id}/contact-sheet.png`,
      width: contactSheetDimensions.width,
      height: contactSheetDimensions.height,
      sha256: await sha256File(contactSheetPath)
    },
    stories: storyReports.map((report) => ({
      id: report.storyId,
      layoutFamily: report.layoutFamily,
      passed: report.passed,
      png: report.artifact.png,
      url: report.artifact.url,
      sha256: report.artifact.sha256,
      qa: `${report.storyId}.qa.json`
    }))
  };
  await fs.writeFile(path.join(outputDirectory, 'series.qa.json'), `${JSON.stringify(seriesReport, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, 'qa-summary.json'), `${JSON.stringify(seriesReport, null, 2)}\n`);
  if (!seriesReport.passed) throw new Error(`Story series QA failed: ${seriesReport.failedChecks.join(', ')}`);
  return seriesReport;
}

async function main() {
  await Promise.all([
    assertFile(schemaPath, 'Stories schema'),
    ...Object.entries(fontPaths).map(([name, filePath]) => assertFile(filePath, `Font ${name}`))
  ]);
  const validate = await createPostValidator(schemaPath);
  const approvedSeries = await loadApprovedSeries(validate);
  const stylesheet = await fs.readFile(path.join(rendererDirectory, 'story-families', 'styles.css'), 'utf8');
  const launchOptions = {
    headless: true,
    args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--font-render-hinting=none']
  };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;

  const browser = await chromium.launch(launchOptions);
  const reports = [];
  try {
    for (const item of approvedSeries) reports.push(await renderSeries({ browser, stylesheet, ...item }));
  } finally {
    await browser.close();
  }
  console.log(`Rendered ${reports.reduce((total, report) => total + report.stories.length, 0)} Stories. All QA gates passed.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
