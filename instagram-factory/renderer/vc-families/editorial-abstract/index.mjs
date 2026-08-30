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

// One material crossing five stages of production, progressively made.
function cover(copy) {
  require(copy, ['title', 'legend', 'stages'], 'cover');
  const fills = [0, 25, 50, 75, 100];
  return `<section class="frame frame-cover">
    ${grid()}
    ${head(copy)}
    <div class="stage-row">
      ${copy.stages.map((label, index) => `<div class="stage-cell">
        <div class="stage"><i class="stage-fill" style="height:${fills[index] ?? 100}%"></i></div>
        <p class="stage-label">${typeset(label)}</p>
      </div>`).join('')}
    </div>
    ${legend(copy)}
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

const compositions = { cover, workflow, 'chatgpt-github-codex': archive, multichannel };

// Every string the figure is allowed to show, in reading order. The QA gate compares this
// against what the browser actually rendered, so a label cannot drift from the manifest.
export function declaredText(id, copy) {
  const parts = [copy.title];
  if (id === 'cover') parts.push(...copy.stages);
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

export function visualHtml(id, copy, stylesheet, fontUrls) {
  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);
  return `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>${escapeHtml(id)}</title><style>${css}</style></head>
<body>${renderVisual(id, copy)}</body>
</html>`;
}
