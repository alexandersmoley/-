export const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const shortRussianWords = /(^|[\s([{«„“])((?:а|без|бы|в|во|для|до|же|за|и|из|к|ко|ли|на|над|не|ни|но|о|об|от|по|под|при|про|с|со|у|я)) (?=[\p{L}\p{N}«„“])/giu;

export const applyNonBreakingSpaces = (value) => {
  let result = String(value);
  let previous;
  do {
    previous = result;
    result = result.replace(shortRussianWords, '$1$2\u00a0');
  } while (result !== previous);
  return result
    .replace(/ (?=[—–])/gu, '\u00a0')
    .replace(/\bGitHub Pages\b/gu, 'GitHub\u00a0Pages')
    .replace(/\b(публичный) (URL|PNG)\b/giu, '$1\u00a0$2');
};

export const applyNonBreakingSpacesToHtml = (html) => String(html)
  .split(/(<[^>]+>)/gu)
  .map((part) => part.startsWith('<') ? part : applyNonBreakingSpaces(part))
  .join('')
  .replace(
    /(^|[\s([{«„“])((?:а|без|бы|в|во|для|до|же|за|и|из|к|ко|ли|на|над|не|ни|но|о|об|от|по|под|при|про|с|со|у|я)) (?=<[^>]+>[\p{L}\p{N}«„“])/giu,
    '$1$2\u00a0'
  );

export const contentNode = (text, className, html = null, { headline = false } = {}) => {
  const renderedText = applyNonBreakingSpacesToHtml(html ?? escapeHtml(text));
  const headlineAttribute = headline ? ' data-headline' : '';
  return `<div class="${className} text-block" data-content data-type data-color${headlineAttribute}>${renderedText}</div>`;
};

export const grid = (className = '') => `
  <svg class="carousel-grid ${className}" viewBox="0 0 1080 1440" aria-hidden="true" data-qa-svg>
    <path d="M120 0V1440 M260 0V1440 M400 0V1440 M540 0V1440 M680 0V1440 M820 0V1440 M960 0V1440"></path>
  </svg>`;
