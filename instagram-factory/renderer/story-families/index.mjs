import { render as renderTypeIntro } from './story-type-intro/index.mjs';
import { render as renderTypeList } from './story-type-list/index.mjs';
import { render as renderProofList } from './story-proof-list/index.mjs';
import { render as renderStatement } from './story-statement/index.mjs';
import { render as renderProcessDiagram } from './story-process-diagram/index.mjs';
import { render as renderManifesto } from './story-manifesto/index.mjs';
import { render as renderPhotoEditorial } from './story-photo-editorial/index.mjs';
import { render as renderClosingList } from './story-closing-list/index.mjs';
import { escapeHtml } from './shared.mjs';

const renderers = {
  'story-type-intro': renderTypeIntro,
  'story-type-list': renderTypeList,
  'story-proof-list': renderProofList,
  'story-statement': renderStatement,
  'story-process-diagram': renderProcessDiagram,
  'story-manifesto': renderManifesto,
  'story-photo-editorial': renderPhotoEditorial,
  'story-closing-list': renderClosingList
};

export const storyLayoutFamilies = Object.freeze(Object.keys(renderers));

export function renderStoryHtml({ series, story, stylesheet, assetUrl, fontUrls }) {
  const renderer = renderers[story.layoutFamily];
  if (!renderer) throw new Error(`Unsupported story layout family: ${story.layoutFamily}`);

  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);

  const { designTokens, safeZone } = series;
  const variables = [
    `--ink:${designTokens.ink}`,
    `--paper:${designTokens.paper}`,
    `--blue:${designTokens.blue}`,
    `--grid:${designTokens.grid}`,
    `--safe-top:${safeZone.top}px`,
    `--safe-right:${safeZone.right}px`,
    `--safe-bottom:${safeZone.bottom}px`,
    `--safe-left:${safeZone.left}px`
  ].join(';');

  const composition = renderer(story, { assetUrl, asset: series.photoAsset });
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, initial-scale=1">
  <title>${escapeHtml(series.id)} — ${escapeHtml(story.id)}</title>
  <style>${css}</style>
</head>
<body style="${variables}">
  <main class="story story-${escapeHtml(story.id)} family-${escapeHtml(story.layoutFamily)}" data-series-id="${escapeHtml(series.id)}" data-story-id="${escapeHtml(story.id)}" data-layout-family="${escapeHtml(story.layoutFamily)}" data-color>
    ${composition}
  </main>
</body>
</html>`;
}
