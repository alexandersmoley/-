import { renderCover, renderScenes, timelineScript } from './motion-editorial-system/index.mjs';
import { escapeHtml } from './shared.mjs';

export function renderReelHtml({ reel, stylesheet, fontUrls, photoAssetUrl }) {
  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, initial-scale=1">
  <title>${escapeHtml(reel.id)}</title>
  <style>${css}</style>
</head>
<body>
  <main class="reel-frame" data-reel-id="${escapeHtml(reel.id)}" data-color>
    <div class="system-axis" data-color aria-hidden="true"></div>
    ${renderScenes(reel, { photoAssetUrl })}
  </main>
  <script>${timelineScript(reel)}</script>
</body>
</html>`;
}

export function renderReelCoverHtml({ reel, stylesheet, fontUrls }) {
  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, initial-scale=1">
  <title>${escapeHtml(reel.id)} — cover</title>
  <style>${css}</style>
</head>
<body>${renderCover(reel)}</body>
</html>`;
}
