// Editorial diagrams for vc.ru. Every word on these figures comes from the publication
// manifest's copy block — the renderer places text, it never writes it. A figure has to be
// readable on its own, so each one carries a title, labelled parts and a legend saying what
// the blue means.

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

// Two-word product names must not break across lines: "Google" over "Drive" reads as a
// different thing than the product.
const typeset = (value) => escapeHtml(value)
  .replace(/\b(Google Drive|Claude Code|Главный бриф)\b/gu, (name) => name.replace(' ', ' '));

const grid = () => `<div class="grid" aria-hidden="true">${
  [160, 400, 640, 880, 1120, 1360, 1600, 1840].map((left) => `<i style="left:${left}px"></i>`).join('')
}</div>`;

const head = (copy) => `<h1 class="fig-title">${typeset(copy.title)}</h1>`;
const legend = (copy) => `<p class="fig-legend">${typeset(copy.legend)}</p>`;

function require(copy, keys, id) {
  for (const key of keys) {
    if (copy?.[key] === undefined) throw new Error(`vc visual ${id}: copy.${key} is missing`);
  }
}

// The article cover. It has to carry a subject a cold reader recognises in a feed, not just a
// rhythm: the article is about how a finished post gets made, so that is what the cover shows —
// the same page three times, empty, being filled, finished. Palette inverted (blue field, paper
// forms) so the card holds up at thumbnail size against a feed of white cards. No text: vc.ru
// prints the headline beside it.
function cover() {
  const arrow = () => `<div class="cover-arrow" aria-hidden="true"><i class="shaft"></i><i class="head-up"></i><i class="head-down"></i></div>`;
  return `<section class="frame frame-cover">
    <div class="cover-line">
      <div class="page page-empty"></div>
      ${arrow()}
      <div class="page page-filling">
        <i class="bar bar-wide"></i><i class="bar bar-mid"></i><i class="bar bar-short"></i>
      </div>
      ${arrow()}
      <div class="page page-done">
        <i class="done-title"></i>
        <i class="done-image"></i>
        <i class="done-line done-line-1"></i><i class="done-line done-line-2"></i><i class="done-line done-line-3"></i>
      </div>
    </div>
  </section>`;
}

// The route of one material, with the human approval points marked in blue. Every stage is
// the same size: this is a sequence, not a measurement.
function workflow(copy) {
  require(copy, ['title', 'legend', 'nodes'], 'workflow');
  return `<section class="frame frame-workflow">
    ${grid()}
    ${head(copy)}
    <div class="route">
      <i class="route-line"></i>
      ${copy.nodes.map((node) => `<div class="route-cell">
        <div class="stage-node${node.human ? ' stage-node-human' : ''}"><span>${typeset(node.label)}</span></div>
        <p class="route-note">${typeset(node.note)}</p>
      </div>`).join('')}
    </div>
    ${legend(copy)}
  </section>`;
}

// Two working zones handing material to each other through one central archive.
function archive(copy) {
  require(copy, ['title', 'legend', 'leftTitle', 'leftNote', 'leftItems', 'vaultTitle',
    'vaultItems', 'rightTitle', 'rightNote', 'rightItems', 'feedLeft', 'feedRight'], 'chatgpt-github-codex');
  const list = (items, className) => items
    .map((item) => `<li class="${className}">${typeset(item)}</li>`).join('');
  return `<section class="frame frame-archive">
    ${grid()}
    ${head(copy)}
    <div class="zone zone-left">
      <h2 class="zone-title">${typeset(copy.leftTitle)}</h2>
      <p class="zone-note">${typeset(copy.leftNote)}</p>
      <ul class="zone-list">${list(copy.leftItems, 'zone-item')}</ul>
    </div>
    <div class="feed feed-left"><i></i><span>${typeset(copy.feedLeft)}</span></div>
    <div class="vault">
      <h2 class="vault-title">${typeset(copy.vaultTitle)}</h2>
      <ul class="vault-list">${list(copy.vaultItems, 'vault-item')}</ul>
    </div>
    <div class="feed feed-right"><i></i><span>${typeset(copy.feedRight)}</span></div>
    <div class="zone zone-right">
      <h2 class="zone-title">${typeset(copy.rightTitle)}</h2>
      <p class="zone-note">${typeset(copy.rightNote)}</p>
      <ul class="zone-list">${list(copy.rightItems, 'zone-item')}</ul>
    </div>
    ${legend(copy)}
  </section>`;
}

// One approved source becoming several independent formats.
function multichannel(copy) {
  require(copy, ['title', 'legend', 'sourceTitle', 'sourceNote', 'formats'], 'multichannel');
  return `<section class="frame frame-multichannel">
    ${grid()}
    ${head(copy)}
    <div class="source">
      <h2 class="source-title">${typeset(copy.sourceTitle)}</h2>
      <p class="source-note">${typeset(copy.sourceNote)}</p>
    </div>
    <div class="fan" aria-hidden="true">${Array.from({ length: 4 }, () => '<i></i>').join('')}</div>
    <div class="formats">
      ${copy.formats.map((format) => `<div class="format">
        <h2 class="format-label">${typeset(format.label)}</h2>
        <p class="format-note">${typeset(format.note)}</p>
      </div>`).join('')}
    </div>
    ${legend(copy)}
  </section>`;
}

// The account cover. Not about one article but about the blog as a whole, so the subject is the
// line itself rather than a single material on it: the same page repeats across the whole width,
// each one further along than the last.
//
// Everything is sized from the frame's own height rather than in fixed pixels, and the row is
// wider than the frame at both ends. The banner size vc.ru wants could not be verified from
// here, so the composition has to hold at any wide crop instead of at one assumed size — a first
// version used fixed pixels and lost the whole point of the picture when the frame got shorter.
function accountCover() {
  const count = 12;
  return `<section class="frame frame-account">
    <div class="belt" aria-hidden="true">${
      Array.from({ length: count }, (_, index) => {
        const fill = Math.round((index / (count - 1)) * 100);
        return `<div class="belt-page"><i style="height:${fill}%"></i></div>`;
      }).join('')
    }</div>
  </section>`;
}

const compositions = { cover, workflow, 'chatgpt-github-codex': archive, multichannel, 'account-cover': accountCover };

// Every string the figure is allowed to show, in reading order. The QA gate compares this
// against what the browser actually rendered, so a label cannot drift from the manifest.
export function declaredText(id, copy) {
  // The cover carries no text at all, so its declared text is empty and copyExact then requires
  // the rendered frame to be empty too — the old noText gate, expressed the same way as the rest.
  if (id === 'cover' || id === 'account-cover') return [];
  const parts = [copy.title];
  if (id === 'workflow') parts.push(...copy.nodes.flatMap((node) => [node.label, node.note]));
  if (id === 'chatgpt-github-codex') {
    parts.push(copy.leftTitle, copy.leftNote, ...copy.leftItems, copy.feedLeft,
      copy.vaultTitle, ...copy.vaultItems, copy.feedRight,
      copy.rightTitle, copy.rightNote, ...copy.rightItems);
  }
  if (id === 'multichannel') {
    parts.push(copy.sourceTitle, copy.sourceNote,
      ...copy.formats.flatMap((format) => [format.label, format.note]));
  }
  parts.push(copy.legend);
  return parts;
}

export function renderVisual(id, copy) {
  const composition = compositions[id];
  if (!composition) throw new Error(`Unknown vc visual: ${id}`);
  return composition(copy);
}

export function visualHtml(id, copy, stylesheet, fontUrls, size = null) {
  // A non-article canvas declares its own size; article visuals keep the stylesheet defaults.
  const canvas = size ? `:root{--canvas-w:${size.width}px;--canvas-h:${size.height}px}` : '';
  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);
  return `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>${escapeHtml(id)}</title><style>${css}${canvas}</style></head>
<body>${renderVisual(id, copy)}</body>
</html>`;
}
