import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { visualHtml } from '../vc-families/editorial-abstract/index.mjs';
import { sha256File } from '../lib/files.mjs';

const vcRendererDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererDirectory = path.resolve(vcRendererDirectory, '..');
const factoryRoot = path.resolve(rendererDirectory, '..');
const articlesDirectory = path.join(factoryRoot, 'content', 'vc');
const outputRoot = path.join(factoryRoot, 'output', 'vc');
const renderRoot = path.join(factoryRoot, '.render', 'vc');
const stylesheetPath = path.join(rendererDirectory, 'vc-families', 'editorial-abstract', 'styles.css');
const baseUrl = (process.env.OUTPUT_BASE_URL || 'https://alexandersmoley.github.io/-/').replace(/\/?$/, '/');

const everyTrue = (checks) => Object.values(checks).every(Boolean);

// The manifest says these visuals carry no text and no generated media. QA states that
// as a rule rather than a hope: a rendered frame with a single character in it fails.
async function runVisualQa(page) {
  return page.evaluate(() => {
    const allowed = new Set([
      'rgb(16, 16, 16)', 'rgb(244, 241, 233)', 'rgb(21, 70, 232)',
      'rgba(21, 70, 232, 0.105)', 'rgba(21, 70, 232, 0.106)', 'rgba(0, 0, 0, 0)', 'transparent'
    ]);
    const nodes = [...document.querySelectorAll('*')];
    const unapproved = [...new Set(nodes.flatMap((node) => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor, style.borderTopColor, style.borderLeftColor];
    }).filter((value) => value && !allowed.has(value)))];
    const effects = nodes.filter((node) => {
      const style = getComputedStyle(node);
      return style.boxShadow !== 'none' || style.filter !== 'none' || style.backgroundImage !== 'none';
    }).map((node) => node.className || node.tagName);
    return {
      checks: {
        canvasExact: document.documentElement.scrollWidth === 1920 && document.documentElement.scrollHeight === 1080,
        noText: document.body.innerText.trim() === '',
        noMedia: document.querySelectorAll('img, picture, video, canvas, svg').length === 0,
        approvedColorsOnly: unapproved.length === 0,
        noEffects: effects.length === 0
      },
      details: { unapproved, effects }
    };
  });
}

async function renderArticleVisuals(browser, manifestPath, stylesheet) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const outputDirectory = path.join(outputRoot, manifest.id);
  const renderDirectory = path.join(renderRoot, manifest.id);
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(renderDirectory, { recursive: true });

  const visuals = [{ id: 'cover' }, ...manifest.illustrations.map(({ id }) => ({ id }))];
  const rendered = [];
  const qa = {};
  for (const { id } of visuals) {
    const html = visualHtml(id, stylesheet);
    const htmlPath = path.join(renderDirectory, `${id}.html`);
    await fs.writeFile(htmlPath, html);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    const report = await runVisualQa(page);
    const pngPath = path.join(outputDirectory, `${id}.png`);
    await page.screenshot({ path: pngPath, type: 'png', animations: 'disabled' });
    await page.close();
    const meta = await sharp(pngPath).metadata();
    qa[id] = { ...report, dimensions: { width: meta.width, height: meta.height } };
    if (!everyTrue(report.checks) || meta.width !== 1920 || meta.height !== 1080) {
      throw new Error(`vc visual QA failed for ${id}: ${JSON.stringify(report, null, 2)}`);
    }
    rendered.push({
      id,
      path: path.relative(factoryRoot, pngPath),
      url: `${baseUrl}vc/${manifest.id}/${id}.png`,
      sha256: await sha256File(pngPath),
      width: meta.width,
      height: meta.height
    });
  }

  const report = {
    pipelineVersion: 1,
    articleId: manifest.id,
    generatedAt: new Date().toISOString(),
    passed: true,
    source: path.relative(factoryRoot, manifestPath),
    visuals: rendered,
    qa
  };
  await fs.writeFile(path.join(outputDirectory, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const entries = await fs.readdir(articlesDirectory);
  const manifests = entries.filter((name) => name.endsWith('.publication.json')).map((name) => path.join(articlesDirectory, name));
  if (manifests.length === 0) throw new Error(`No vc publication manifest in ${articlesDirectory}`);
  const stylesheet = await fs.readFile(stylesheetPath, 'utf8');
  const launchOptions = { headless: true, args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  try {
    for (const manifestPath of manifests) {
      const report = await renderArticleVisuals(browser, manifestPath, stylesheet);
      console.log(`Rendered ${report.visuals.length} vc visuals for ${report.articleId}.`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
