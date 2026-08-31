import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as motionEditorialSystem from './motion-editorial-system/index.mjs';
import * as instructionCards from './instruction-cards/index.mjs';
import * as continuousFlow from './continuous-flow/index.mjs';
import { escapeHtml } from './shared.mjs';

const familiesDirectory = path.dirname(fileURLToPath(import.meta.url));

// A reel picks its family by name. Each one owns its scene roles, its cover and its
// timeline, so a new format is a new directory rather than a branch inside an old one.
const families = {
  'motion-editorial-system': motionEditorialSystem,
  'instruction-cards': instructionCards,
  'continuous-flow': continuousFlow
};

function familyOf(reel) {
  const family = families[reel.layoutFamily];
  if (!family) throw new Error(`Unsupported reel layout family: ${reel.layoutFamily}`);
  return family;
}

export function stylesheetPathFor(reel) {
  if (!families[reel.layoutFamily]) throw new Error(`Unsupported reel layout family: ${reel.layoutFamily}`);
  return path.join(familiesDirectory, reel.layoutFamily, 'styles.css');
}

function page({ reel, stylesheet, fontUrls, title, body }) {
  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}

export function renderReelHtml({ reel, stylesheet, fontUrls, photoAssetUrl }) {
  const family = familyOf(reel);
  return page({
    reel,
    stylesheet,
    fontUrls,
    title: reel.id,
    body: `
  <main class="reel-frame" data-reel-id="${escapeHtml(reel.id)}" data-color>
    <div class="system-axis" data-color aria-hidden="true"></div>
    ${family.renderScenes(reel, { photoAssetUrl })}
  </main>
  <script>${family.timelineScript(reel)}</script>`
  });
}

export function renderReelCoverHtml({ reel, stylesheet, fontUrls }) {
  return page({
    reel,
    stylesheet,
    fontUrls,
    title: `${reel.id} — cover`,
    body: familyOf(reel).renderCover(reel)
  });
}
