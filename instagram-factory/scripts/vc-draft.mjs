// Fills a vc.ru draft from the approved article and the publication manifest, in the author's
// own browser session. It never publishes: the channel contract forbids pressing the final
// button while the manifest says publish: false, and this script refuses to run at all if that
// flag has changed.
//
// Why a browser and not the API: three read-only probe runs established that api.vc.ru serves
// reads and file uploads but exposes no entry-creating endpoint — see channels/
// vc-ru-draft-automation.md for the paths already ruled out.
//
// Three modes:
//   --login    open a browser, wait for the author to sign in, remember the session
//   --inspect  dump the editor's structure to a file so selectors can be fixed from fact
//   (default)  fill the draft, verify it against the article, save, print the link
//
// The editor's DOM is discovered rather than assumed. When discovery fails the script stops and
// says which part it could not find, and --inspect produces the map needed to fix it. It never
// guesses its way past a missing element into a half-filled draft.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { parseArticle, expectedContent, verifyDraft } from './lib/vc-article.mjs';

const factoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sessionDir = path.join(factoryRoot, '.vc-session');
const reportDir = path.join(factoryRoot, 'output', 'vc');
const manifestPath = path.join(factoryRoot, 'content', 'vc', 'autoposting-claude-code.publication.json');

const args = new Set(process.argv.slice(2));
const MODE = args.has('--login') ? 'login' : args.has('--inspect') ? 'inspect' : 'fill';
const NEW_ENTRY_URL = 'https://vc.ru/writing';

const log = (...parts) => console.log(...parts);

async function loadInputs() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.publish !== false) {
    throw new Error('publish is not false in the manifest. This script only ever creates drafts; refusing to run.');
  }
  if (manifest.visualsApprovedByAuthor !== true) {
    throw new Error('The visuals are not approved yet (visualsApprovedByAuthor is not true).');
  }
  const article = parseArticle(await fs.readFile(path.join(factoryRoot, manifest.articlePath), 'utf8'));
  const visuals = [manifest.cover, ...manifest.illustrations].map((visual) => ({
    id: visual.id ?? 'cover',
    file: path.join(factoryRoot, visual.path)
  }));
  for (const visual of visuals) {
    await fs.access(visual.file).catch(() => {
      throw new Error(`Visual ${visual.id} is missing at ${visual.file}. Run the render first.`);
    });
  }
  return { manifest, article, visuals };
}

async function openContext({ headless }) {
  await fs.mkdir(sessionDir, { recursive: true });
  return chromium.launchPersistentContext(sessionDir, {
    headless,
    viewport: { width: 1440, height: 950 },
    args: ['--disable-blink-features=AutomationControlled']
  });
}

// Signed in or not, decided from the page rather than from whether a session file exists:
// a saved session that has expired looks identical on disk to a valid one.
async function isSignedIn(page) {
  await page.goto('https://vc.ru/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  return page.evaluate(() => {
    const text = document.body.innerText;
    const hasLoginPrompt = /Войти|Регистрация/u.test(text.slice(0, 4000));
    const hasAccountArea = document.querySelector('[href*="/id"], [class*="avatar" i], [class*="user" i]') !== null;
    return hasAccountArea && !hasLoginPrompt;
  });
}

async function runLogin() {
  const context = await openContext({ headless: false });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto('https://vc.ru/', { waitUntil: 'domcontentloaded' });
  log('\nA browser window is open. Sign in to vc.ru in it.');
  log('The session is stored in instagram-factory/.vc-session and is not committed.');
  log('Waiting for sign-in (up to 10 minutes)…\n');
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(4000);
    if (await isSignedIn(page).catch(() => false)) {
      log('Signed in. The session is saved — run `pnpm vc:draft` next.');
      await context.close();
      return;
    }
  }
  await context.close();
  throw new Error('Sign-in did not complete within 10 minutes.');
}

// A structural map of whatever the editor actually is, written to a file. This exists because
// the selectors below were written without ever seeing this page; the dump turns a guess into
// something checkable in one run.
async function describeEditor(page) {
  return page.evaluate(() => {
    const visible = (node) => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const describe = (node) => ({
      tag: node.tagName.toLowerCase(),
      type: node.getAttribute('type'),
      role: node.getAttribute('role'),
      name: node.getAttribute('name'),
      placeholder: node.getAttribute('placeholder') || node.getAttribute('data-placeholder') || null,
      ariaLabel: node.getAttribute('aria-label'),
      className: typeof node.className === 'string' ? node.className.slice(0, 160) : null,
      id: node.id || null,
      contentEditable: node.getAttribute('contenteditable'),
      text: (node.innerText || node.value || '').slice(0, 80)
    });
    return {
      url: location.href,
      title: document.title,
      editables: [...document.querySelectorAll('[contenteditable="true"], textarea, input[type="text"]')]
        .filter(visible).map(describe),
      fileInputs: [...document.querySelectorAll('input[type="file"]')].map(describe),
      buttons: [...document.querySelectorAll('button, [role="button"], a[class*="button" i]')]
        .filter(visible).map((node) => ({
          text: (node.innerText || '').trim().slice(0, 60),
          ariaLabel: node.getAttribute('aria-label'),
          className: typeof node.className === 'string' ? node.className.slice(0, 120) : null
        })).filter((entry) => entry.text || entry.ariaLabel)
    };
  });
}

// The title and body fields, found by what they say about themselves rather than by a
// hardcoded class name that would rot on the next redesign.
async function findFields(page) {
  const handles = await page.$$('[contenteditable="true"], textarea, input[type="text"]');
  const scored = [];
  for (const handle of handles) {
    const info = await handle.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return {
        placeholder: (node.getAttribute('placeholder') || node.getAttribute('data-placeholder') || '').toLowerCase(),
        top: box.top + window.scrollY,
        height: box.height,
        width: box.width,
        visible: box.width > 0 && box.height > 0
      };
    });
    if (info.visible && info.width > 200) scored.push({ handle, info });
  }
  if (scored.length === 0) return { title: null, body: null };
  scored.sort((a, b) => a.info.top - b.info.top);
  const byPlaceholder = (words) => scored.find(({ info }) => words.some((word) => info.placeholder.includes(word)));
  const title = byPlaceholder(['заголов', 'title']) ?? scored[0];
  const body = byPlaceholder(['текст', 'расскаж', 'начните', 'body'])
    ?? scored.find((entry) => entry !== title) ?? null;
  return { title: title?.handle ?? null, body: body?.handle ?? null };
}

// Types one block. Headings and list items are attempted with the markdown shortcuts most
// rich-text editors accept; if the editor ignores them the words still land as plain text,
// which is what the verification checks. Formatting is best effort, text is not.
async function typeBlock(page, block, isFirst) {
  if (!isFirst) await page.keyboard.press('Enter');
  if (block.type === 'heading') {
    await page.keyboard.type('## ');
    await page.keyboard.type(block.text);
    return;
  }
  if (block.type === 'list') {
    for (const [index, item] of block.items.entries()) {
      if (index > 0) await page.keyboard.press('Enter');
      if (index === 0) await page.keyboard.type('- ');
      await page.keyboard.type(item);
    }
    return;
  }
  if (block.type === 'quote') {
    await page.keyboard.type('> ');
    await page.keyboard.type(block.text);
    return;
  }
  await page.keyboard.type(block.text);
}

async function runInspect() {
  const context = await openContext({ headless: false });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(NEW_ENTRY_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const map = await describeEditor(page);
  await fs.mkdir(reportDir, { recursive: true });
  const out = path.join(reportDir, 'vc-editor-map.json');
  await fs.writeFile(out, `${JSON.stringify(map, null, 2)}\n`);
  log(`Editor map written to ${path.relative(factoryRoot, out)}`);
  log(`  editable fields: ${map.editables.length}, file inputs: ${map.fileInputs.length}, buttons: ${map.buttons.length}`);
  log('Send that file over and the selectors can be pinned to what is actually there.');
  await context.close();
}

async function runFill() {
  const { article, visuals } = await loadInputs();
  const expected = expectedContent(article);
  log(`Article: "${article.title}" — ${article.blocks.length} blocks, ${visuals.length} visuals.`);

  const context = await openContext({ headless: false });
  const page = context.pages()[0] ?? await context.newPage();

  if (!await isSignedIn(page)) {
    await context.close();
    throw new Error('Not signed in to vc.ru. Run `pnpm vc:draft:login` first.');
  }

  await page.goto(NEW_ENTRY_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const { title: titleField, body: bodyField } = await findFields(page);
  if (!titleField || !bodyField) {
    const map = await describeEditor(page);
    await fs.mkdir(reportDir, { recursive: true });
    const out = path.join(reportDir, 'vc-editor-map.json');
    await fs.writeFile(out, `${JSON.stringify(map, null, 2)}\n`);
    await context.close();
    throw new Error(
      `Could not find the ${!titleField ? 'title' : 'body'} field in the vc.ru editor. `
      + `A map of the page was written to ${path.relative(factoryRoot, out)} — the selectors need `
      + 'pinning to it. Nothing was typed and no draft was created.'
    );
  }

  await titleField.click();
  await page.keyboard.type(article.title);
  await page.waitForTimeout(500);

  await bodyField.click();
  for (const [index, block] of article.blocks.entries()) {
    await typeBlock(page, block, index === 0);
    if (index % 10 === 0) await page.waitForTimeout(250);
  }
  log('Text entered. Verifying against the article…');
  await page.waitForTimeout(1500);

  const rendered = await page.evaluate(() => document.body.innerText);
  const result = verifyDraft(expected, rendered);

  await fs.mkdir(reportDir, { recursive: true });
  const report = {
    checkedAt: new Date().toISOString(),
    articleTitle: article.title,
    blocks: article.blocks.length,
    ok: result.ok,
    missing: result.missing,
    visualsToAttach: visuals.map((visual) => path.relative(factoryRoot, visual.file)),
    note: 'Images are attached by hand: the editor inserts them at the cursor, and their '
      + 'position in the article is an editorial decision the manifest does not encode.'
  };
  const reportPath = path.join(reportDir, 'vc-draft-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  if (!result.ok) {
    log(`\n${result.missing.length} piece(s) of the article did not make it into the editor:`);
    for (const item of result.missing.slice(0, 12)) log(`  ${item.kind}: ${item.text.slice(0, 90)}`);
    log(`\nFull list: ${path.relative(factoryRoot, reportPath)}`);
    log('The draft has NOT been saved. Fix the gap and run again.');
    log('The browser stays open so the state can be looked at. Close it when done.');
    return;
  }

  log('Every heading, paragraph, list item, the footnote and the Telegram link are present.');
  log(`\nThe browser is open on the filled draft. Left to do by hand:`);
  log('  1. attach the four visuals (paths in the report file);');
  log('  2. set the topic to «Личный опыт»;');
  log('  3. press Save as draft.');
  log(`\nReport: ${path.relative(factoryRoot, reportPath)}`);
  log('This script never publishes and never saves — the last click is yours.');
}

const run = MODE === 'login' ? runLogin : MODE === 'inspect' ? runInspect : runFill;
run().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
