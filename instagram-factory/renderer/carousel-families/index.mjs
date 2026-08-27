import { render as renderProcessDiagramCarousel } from './process-diagram-carousel/index.mjs';
import { escapeHtml } from './shared.mjs';

const renderers = { 'process-diagram-carousel': renderProcessDiagramCarousel };
export const carouselLayoutFamilies = Object.freeze(Object.keys(renderers));

export function renderCarouselHtml({ carousel, slide, stylesheet, fontUrls }) {
  const renderer = renderers[carousel.layoutFamily];
  if (!renderer) throw new Error(`Unsupported carousel layout family: ${carousel.layoutFamily}`);
  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);
  const { designTokens, safeZone } = carousel;
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
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, initial-scale=1">
  <title>${escapeHtml(carousel.id)} — ${escapeHtml(slide.id)}</title>
  <style>${css}</style>
</head>
<body style="${variables}">
  <main class="carousel-slide slide-${escapeHtml(slide.id)} mode-${escapeHtml(slide.mode)} family-${escapeHtml(carousel.layoutFamily)}" data-carousel-id="${escapeHtml(carousel.id)}" data-slide-id="${escapeHtml(slide.id)}" data-mode="${escapeHtml(slide.mode)}" data-color>
    ${renderer(slide)}
  </main>
</body>
</html>`;
}
