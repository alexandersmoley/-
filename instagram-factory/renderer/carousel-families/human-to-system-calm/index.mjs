import { contentNode, escapeHtml, grid } from '../shared.mjs';

const node = (item, index, className, options = {}) => contentNode(
  item.text[index],
  className,
  options.html ?? null,
  { headline: item.headlineIndexes.includes(index) }
);

const approvedPhoto = (assetUrl) => `<img
  class="approved-photo"
  src="${escapeHtml(assetUrl)}"
  alt=""
  data-approved-asset="MAHTZduqLyI"
  data-visual-core>`;

function identityCover(item) {
  return `<section class="composition identity-composition" data-color>
    ${node(item, 0, 'identity-title display-serif')}
    ${node(item, 1, 'identity-role display-serif', {
      html: `${escapeHtml('Редактор')} <em>${escapeHtml('в IT')}</em>`
    })}
    <div class="identity-rule" data-color data-visual-core></div>
  </section>`;
}

function fullPhotoWork(item, assetUrl) {
  return `<section class="composition photo-work-composition" data-color>
    ${approvedPhoto(assetUrl)}
    <div class="photo-copy-panel" data-color>
      ${node(item, 0, 'photo-work-title display-serif')}
      <div class="photo-work-list">
        ${item.text.slice(1).map((_, index) => node(item, index + 1, `photo-work-item photo-work-item-${index + 1} text-sans`)).join('')}
      </div>
    </div>
  </section>`;
}

function clientProof(item) {
  return `<section class="composition proof-composition" data-color>
    ${node(item, 0, 'proof-title display-serif')}
    <div class="proof-table" data-color data-visual-core>
      ${item.text.slice(1, 6).map((_, index) => node(item, index + 1, `proof-client proof-client-${index + 1} display-serif`)).join('')}
    </div>
    ${node(item, 6, 'proof-politics text-sans')}
  </section>`;
}

function currentTask(item) {
  const headlineHtml = escapeHtml(item.text[0]).replace('AI', '<em>AI</em>');
  return `<section class="composition task-composition" data-color>
    ${node(item, 0, 'task-title display-serif', { html: headlineHtml })}
    ${node(item, 1, 'task-body text-sans')}
    <div class="task-system" data-color data-visual-core>
      <span class="task-source"></span>
      <span class="task-line"></span>
      <span class="task-dot task-dot-1"></span>
      <span class="task-dot task-dot-2"></span>
      <span class="task-dot task-dot-3"></span>
      <span class="task-dot task-dot-4"></span>
      <span class="task-dot task-dot-5"></span>
      <span class="task-dot task-dot-6"></span>
      <span class="task-dot task-dot-7"></span>
    </div>
  </section>`;
}

function processMap(item) {
  return `<section class="composition process-composition" data-color>
    ${grid('process-grid')}
    ${node(item, 0, 'process-title display-serif')}
    <div class="process-map" data-color>
      <svg class="process-line" viewBox="0 0 840 620" aria-hidden="true" data-qa-svg data-visual-core>
        <path d="M105 105H365H645V315H365H105V535H365"></path>
      </svg>
      ${item.text.slice(1, 8).map((_, index) => node(item, index + 1, `process-stage process-stage-${index + 1} text-sans`)).join('')}
    </div>
    ${node(item, 8, 'process-body text-sans')}
  </section>`;
}

function authorControl(item) {
  return `<section class="composition control-composition" data-color>
    ${node(item, 0, 'control-title display-serif')}
    <div class="control-cards" data-color>
      ${item.text.slice(1, 4).map((_, index) => `<div class="control-card control-card-${index + 1}" data-color data-visual-core>${node(item, index + 1, 'control-label display-serif')}</div>`).join('')}
    </div>
    ${node(item, 4, 'control-body text-sans')}
  </section>`;
}

function blogClosing(item) {
  return `<section class="composition closing-composition" data-color>
    ${node(item, 0, 'blog-title display-serif')}
    <div class="blog-list" data-color data-visual-core>
      ${item.text.slice(1, 4).map((_, index) => node(item, index + 1, `blog-item blog-item-${index + 1} text-sans`)).join('')}
    </div>
    ${node(item, 4, 'blog-body display-serif')}
  </section>`;
}

export function renderHumanToSystemCalm(item, { assetUrl }) {
  if (item.mode === 'identity-cover') return identityCover(item);
  if (item.mode === 'full-photo-work') return fullPhotoWork(item, assetUrl);
  if (item.mode === 'client-proof') return clientProof(item);
  if (item.mode === 'current-task') return currentTask(item);
  if (item.mode === 'process-map') return processMap(item);
  if (item.mode === 'author-control') return authorControl(item);
  if (item.mode === 'blog-closing') return blogClosing(item);
  throw new Error(`Unsupported human-to-system-calm mode: ${item.mode}`);
}
