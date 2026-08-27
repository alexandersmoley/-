export const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const textNode = (text, className) =>
  `<div class="${className} text-block" data-content data-type data-color>${escapeHtml(text)}</div>`;

export const grid = (className = '') => `
  <svg class="story-grid ${className}" viewBox="0 0 1080 1920" aria-hidden="true" data-qa-svg>
    <path d="M72 0V1920 M228 0V1920 M384 0V1920 M540 0V1920 M696 0V1920 M852 0V1920 M1008 0V1920"></path>
  </svg>`;
