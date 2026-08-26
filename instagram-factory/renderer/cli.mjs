import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { renderHumanToSystem } from './families/human-to-system/index.mjs';
import { runBrowserQa, failedChecks } from './lib/browser-qa.mjs';
import { assertFile, sha256File } from './lib/files.mjs';
import { loadApprovedPosts } from './lib/load-posts.mjs';
import { createPostValidator } from './lib/validate.mjs';

const rendererDirectory = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(rendererDirectory, '..');
const postsDirectory = path.join(factoryRoot, 'posts');
const schemaPath = path.join(factoryRoot, 'schemas', 'post.schema.json');
const outputDirectory = path.join(factoryRoot, 'output');
const renderDirectory = path.join(factoryRoot, '.render');
const baseUrl = (process.env.OUTPUT_BASE_URL || 'https://alexandersmoley.github.io/-/').replace(/\/?$/, '/');

const fontPaths = {
  inter: path.join(factoryRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-cyrillic-400-normal.woff2'),
  cormorantRegular: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-normal.woff2'),
  cormorantItalic: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-italic.woff2')
};

const familyRenderers = {
  'human-to-system': renderHumanToSystem
};

const allTrue = (checks) => Object.values(checks).every(Boolean);

async function renderPost({ browser, post, sourcePath, stylesheet }) {
  const assetPath = path.join(factoryRoot, post.asset.path);
  const captionPath = path.join(factoryRoot, post.captionSource);
  await assertFile(assetPath, 'Source asset');
  await assertFile(captionPath, 'Caption source');

  const assetSha256 = await sha256File(assetPath);
  const captionSha256Before = await sha256File(captionPath);
  const renderer = familyRenderers[post.layout.family];
  if (!renderer) throw new Error(`Unsupported layout family: ${post.layout.family}`);

  const html = renderer({
    post,
    stylesheet,
    assetUrl: pathToFileURL(assetPath).href,
    fontUrls: Object.fromEntries(
      Object.entries(fontPaths).map(([key, value]) => [key, pathToFileURL(value).href])
    )
  });

  const htmlPath = path.join(renderDirectory, `${post.id}.html`);
  const pngPath = path.join(outputDirectory, `${post.id}.png`);
  const reportPath = path.join(outputDirectory, `${post.id}.qa.json`);
  await fs.writeFile(htmlPath, html);

  const page = await browser.newPage({ viewport: { width: 1080, height: 1440 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; });

  const browserQa = await runBrowserQa(page, post);
  await page.screenshot({ path: pngPath, animations: 'disabled', fullPage: false });
  await page.close();

  const imageMetadata = await sharp(pngPath).metadata();
  const captionSha256After = await sha256File(captionPath);
  const outputSha256 = await sha256File(pngPath);
  const checks = {
    structuredPostValid: true,
    approvedForRender: post.status === 'approved-for-render',
    assetChecksumExact: assetSha256 === post.asset.sha256,
    captionUnchanged: captionSha256Before === captionSha256After,
    pngDimensionsExact: imageMetadata.width === 1080 && imageMetadata.height === 1440,
    ...browserQa.checks
  };

  const report = {
    pipelineVersion: 1,
    postId: post.id,
    layoutFamily: post.layout.family,
    variant: post.layout.variant,
    benchmark: Boolean(post.benchmark),
    source: path.relative(factoryRoot, sourcePath),
    generatedAt: new Date().toISOString(),
    passed: allTrue(checks),
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    artifacts: {
      png: path.relative(factoryRoot, pngPath),
      url: `${baseUrl}${encodeURIComponent(post.id)}.png`,
      width: imageMetadata.width,
      height: imageMetadata.height,
      sha256: outputSha256
    },
    integrity: {
      canvaAssetId: post.asset.canvaAssetId,
      assetSha256,
      captionSource: post.captionSource,
      captionSha256: captionSha256After
    },
    browserQa: browserQa.details
  };

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) {
    throw new Error(`QA failed for ${post.id}: ${[...report.failedChecks, ...failedChecks(browserQa)].join(', ')}`);
  }

  return report;
}

async function main() {
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(renderDirectory, { recursive: true });

  await Promise.all([
    assertFile(schemaPath, 'Post schema'),
    ...Object.entries(fontPaths).map(([name, filePath]) => assertFile(filePath, `Font ${name}`))
  ]);

  const validate = await createPostValidator(schemaPath);
  const approvedPosts = await loadApprovedPosts({ postsDirectory, validate });
  const stylesheet = await fs.readFile(
    path.join(rendererDirectory, 'families', 'human-to-system', 'styles.css'),
    'utf8'
  );

  const launchOptions = {
    headless: true,
    args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--font-render-hinting=none']
  };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;

  const browser = await chromium.launch(launchOptions);
  const reports = [];
  try {
    for (const item of approvedPosts) reports.push(await renderPost({ browser, stylesheet, ...item }));
  } finally {
    await browser.close();
  }

  const summary = {
    pipelineVersion: 1,
    generatedAt: new Date().toISOString(),
    passed: reports.every((report) => report.passed),
    approvedPostCount: reports.length,
    pagesBaseUrl: baseUrl,
    posts: reports.map((report) => ({
      id: report.postId,
      layoutFamily: report.layoutFamily,
      benchmark: report.benchmark,
      passed: report.passed,
      png: report.artifacts.png,
      url: report.artifacts.url,
      sha256: report.artifacts.sha256,
      qa: `${report.postId}.qa.json`
    }))
  };

  await fs.writeFile(
    path.join(outputDirectory, 'qa-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`
  );
  console.log(`Rendered ${reports.length} approved post(s). All QA gates passed.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
