// Abstract editorial visuals for vc.ru. No text, no logos, no interface mockups: the
// publication manifest asks for compositions built from the project's own grid, ink and
// blue, so every figure here is geometry the reader reads as a process, not decoration.

const grid = () => `<div class="grid" aria-hidden="true">${
  [160, 400, 640, 880, 1120, 1360, 1600, 1840].map((left) => `<i style="left:${left}px"></i>`).join('')
}</div>`;

// One material crossing several stages of production: the same block, progressively made.
function cover() {
  const stages = [0, 25, 50, 75, 100];
  return `<section class="frame frame-cover">
    ${grid()}
    <i class="rule rule-top"></i>
    <div class="stage-row">
      ${stages.map((fill) => `<div class="stage"><i class="stage-fill" style="height:${fill}%"></i></div>`).join('')}
    </div>
    <i class="rule rule-bottom"></i>
  </section>`;
}

// The route of one material, with the human approval points marked in blue.
function workflow() {
  const steps = [
    { height: 120, human: false }, { height: 190, human: true }, { height: 150, human: false },
    { height: 230, human: true }, { height: 170, human: false }, { height: 260, human: true },
    { height: 140, human: false }, { height: 200, human: true }
  ];
  return `<section class="frame frame-workflow">
    ${grid()}
    <div class="track">
      ${steps.map(({ height, human }) => `<div class="step${human ? ' step-human' : ''}" style="height:${height}px"></div>`).join('')}
      <i class="track-line"></i>
    </div>
  </section>`;
}

// Two working zones handing material to each other through one central archive.
function archive() {
  return `<section class="frame frame-archive">
    ${grid()}
    <div class="zone zone-left" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i style="width:${360 - i * 34}px"></i>`).join('')}</div>
    <i class="feed feed-left"></i>
    <div class="vault"></div>
    <i class="feed feed-right"></i>
    <div class="zone zone-right" aria-hidden="true">${Array.from({ length: 12 }, () => '<b></b>').join('')}</div>
  </section>`;
}

// One approved source becoming several independent formats.
function multichannel() {
  return `<section class="frame frame-multichannel">
    ${grid()}
    <div class="source"></div>
    <div class="fan" aria-hidden="true">${Array.from({ length: 4 }, () => '<i></i>').join('')}</div>
    <div class="formats">
      <div class="format format-cards">${Array.from({ length: 3 }, () => '<b></b>').join('')}</div>
      <div class="format format-longread">${Array.from({ length: 6 }, (_, i) => `<b style="width:${100 - i * 9}%"></b>`).join('')}</div>
      <div class="format format-vertical"></div>
      <div class="format format-short"></div>
    </div>
  </section>`;
}

const compositions = { cover, workflow, 'chatgpt-github-codex': archive, multichannel };

export function renderVisual(id) {
  const composition = compositions[id];
  if (!composition) throw new Error(`Unknown vc visual: ${id}`);
  return composition();
}

export function visualHtml(id, stylesheet) {
  return `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>${id}</title><style>${stylesheet}</style></head>
<body>${renderVisual(id)}</body>
</html>`;
}
