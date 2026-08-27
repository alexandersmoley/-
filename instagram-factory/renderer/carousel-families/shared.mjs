export const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const contentNode = (text, className, html = null) =>
  `<div class="${className} text-block" data-content data-type data-color>${html ?? escapeHtml(text)}</div>`;

export const grid = (className = '') => `
  <svg class="carousel-grid ${className}" viewBox="0 0 1080 1440" aria-hidden="true" data-qa-svg>
    <path d="M72 0V1440 M228 0V1440 M384 0V1440 M540 0V1440 M696 0V1440 M852 0V1440 M1008 0V1440"></path>
  </svg>`;
