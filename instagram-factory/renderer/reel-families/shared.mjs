import {
  applyNonBreakingSpacesToHtml,
  escapeHtml
} from '../carousel-families/shared.mjs';

export { escapeHtml };

export function contentNode(text, className, html = null, attributes = '') {
  const rendered = applyNonBreakingSpacesToHtml(html ?? escapeHtml(text));
  return `<div class="${className} reel-copy" data-content data-source-text="${escapeHtml(text)}" data-type data-color ${attributes}>${rendered}</div>`;
}

export function grid() {
  return `<div class="reel-grid" data-color aria-hidden="true">
    ${[120, 260, 400, 540, 680, 820, 960].map((left) => `<i style="left:${left}px"></i>`).join('')}
  </div>`;
}

export function pipeline(text, className, sceneStart, stageDelay = 0.28) {
  const parts = text.split(' → ');
  const html = parts.map((part, index) => {
    const at = (sceneStart + index * stageDelay).toFixed(2);
    const stage = `<span class="pipeline-node" data-motion-item data-at="${at}" data-duration="0.42" data-from="up">${escapeHtml(part)}</span>`;
    if (index === 0) return stage;
    const arrowAt = (sceneStart + (index - 1) * stageDelay + 0.14).toFixed(2);
    const arrow = `<span class="pipeline-arrow" data-motion-item data-at="${arrowAt}" data-duration="0.32" data-from="clip"> → </span>`;
    return `<span class="pipeline-pair">${arrow}${stage}</span>`;
  }).join('');
  return contentNode(text, className, html);
}
