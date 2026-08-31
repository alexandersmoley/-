import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { visualHtml, declaredText } from '../vc-families/editorial-abstract/index.mjs';
import { sha256File } from '../lib/files.mjs';

const vcRendererDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererDirectory = path.resolve(vcRendererDirectory, '..');
const factoryRoot = path.resolve(rendererDirectory, '..');
const articlesDirectory = path.join(factoryRoot, 'content', 'vc');
const outputRoot = path.join(factoryRoot, 'output', 'vc');
const renderRoot = path.join(factoryRoot, '.render', 'vc');
const stylesheetPath = path.join(rendererDirectory, 'vc-families', 'editorial-abstract', 'styles.css');
const baseUrl = (process.env.OUTPUT_BASE_URL || 'https://alexandersmoley.github.io/-/').replace(/\/?$/, '/');

const fontPaths = {
  inter: path.join(factoryRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-cyrillic-400-normal.woff2'),
  cormorantRegular: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-normal.woff2'),
  cormorantItalic: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-italic.woff2')
};

const normalise = (value) => String(value).replace(/\u00a0/gu, ' ').replace(/\s+/gu, ' ').trim();

const everyTrue = (checks) => Object.values(checks).every(Boolean);

// These figures have to be readable on their own, so they do carry text — but only the text
// the manifest declares. QA states that rather than trusting it: the rendered words must equal
// the declared words, the project's own fonts must actually be the ones painting them, and no
// label may overflow its box or leave the safe area. Without the last two, a font that failed
// to load or a label one word too long produces a broken figure that every other gate passes.
async function runVisualQa(page, expected) {
  return page.evaluate(({ expected }) => {
    const norm = (value) => String(value).replace(/\u00a0/gu, ' ').replace(/\s+/gu, ' ').trim();
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

    // Every leaf element in the body that actually paints words, in document order. Scoped to
    // the body and to boxes with a real size, so <title> and <style> are not mistaken for copy.
    const textNodes = [...document.body.querySelectorAll('*')].filter((node) => {
      if (node.children.length > 0 || norm(node.textContent).length === 0) return false;
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
    const rendered = textNodes.map((node) => norm(node.textContent));

    const missingFonts = ['16px "Inter Production"', '16px "Cormorant Garamond Production"']
      .filter((spec) => !document.fonts.check(spec));

    // A label that outgrew its box, or one that left the safe area.
    // Tight display leading makes glyph ink sit a pixel or two outside its line box, which is
    // not a defect; a label that actually wrapped one line too many overflows by a whole line,
    // 17px or more at the smallest size used here. The tolerance sits between the two.
    const SAFE = 60;
    const SLACK = 6;
    const overflowing = textNodes.filter((node) => {
      const grownPast = node.scrollWidth > node.clientWidth + SLACK || node.scrollHeight > node.clientHeight + SLACK;
      const box = node.getBoundingClientRect();
      const outside = box.left < SAFE || box.top < SAFE
        || box.right > 1920 - SAFE || box.bottom > 1080 - SAFE;
      return grownPast || outside;
    }).map((node) => `${node.className || node.tagName}: ${norm(node.textContent).slice(0, 40)}`);

    return {
      checks: {
        canvasExact: document.documentElement.scrollWidth === 1920 && document.documentElement.scrollHeight === 1080,
        copyExact: JSON.stringify(rendered) === JSON.stringify(expected.map(norm)),
        projectFontsOnly: missingFonts.length === 0,
        nothingOverflows: overflowing.length === 0,
        noMedia: document.querySelectorAll('img, picture, video, canvas, svg').length === 0,
        approvedColorsOnly: unapproved.length === 0,
        noEffects: effects.length === 0
      },
      details: { unapproved, effects, missingFonts, overflowing, rendered }
    };
  }, { expected });
}

async function renderArticleVisuals(browser, manifestPath, stylesheet, fontUrls) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const outputDirectory = path.join(outputRoot, manifest.id);
  const renderDirectory = path.join(renderRoot, manifest.id);
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(renderDirectory, { recursive: true });

  const visuals = [
    { id: 'cover', copy: manifest.cover.copy, text: manifest.cover.text },
    ...manifest.illustrations.map(({ id, copy, text }) => ({ id, copy, text }))
  ];
  // A visual declaring text must bring the words with it; the cover declares none by design.
  for (const { id, copy, text } of visuals) {
    if (text && !copy) throw new Error(`vc visual ${id} declares text but has no copy in the manifest`);
  }
  const rendered = [];
  const qa = {};
  for (const { id, copy } of visuals) {
    const html = visualHtml(id, copy, stylesheet, fontUrls);
    const htmlPath = path.join(renderDirectory, `${id}.html`);
    await fs.writeFile(htmlPath, html);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const report = await runVisualQa(page, declaredText(id, copy).map(normalise));
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
  for (const [name, filePath] of Object.entries(fontPaths)) {
    await fs.access(filePath).catch(() => { throw new Error(`Font ${name} is missing at ${filePath}`); });
  }
  const fontUrls = Object.fromEntries(Object.entries(fontPaths)
    .map(([key, value]) => [key, pathToFileURL(value).href]));
  const launchOptions = { headless: true, args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  try {
    for (const manifestPath of manifests) {
      const report = await renderArticleVisuals(browser, manifestPath, stylesheet, fontUrls);
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
