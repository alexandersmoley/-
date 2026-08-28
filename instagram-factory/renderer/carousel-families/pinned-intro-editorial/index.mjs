import { contentNode, escapeHtml, grid } from '../shared.mjs';

const textNode = (item, index, className, html = null) => contentNode(
  item.text[index],
  className,
  html,
  { headline: item.headlineIndexes.includes(index) }
);

const photo = (assetUrl, className) => `<figure class="${className} approved-photo-frame" data-visual-core>
  <img class="approved-photo" src="${escapeHtml(assetUrl)}" alt="" data-approved-asset="MAHTX_B6J9k">
</figure>`;

const connector = (className, path) => `<svg class="${className}" viewBox="0 0 840 720" aria-hidden="true" data-qa-svg data-visual-core>
  <path d="${path}"></path>
</svg>`;

function coverPhoto(item, assetUrl) {
  return `<section class="composition cover-photo-composition" data-color>
    ${grid('grid-soft')}
    ${photo(assetUrl, 'cover-a-photo')}
    ${textNode(item, 0, 'cover-a-title display-serif')}
    <div class="cover-a-secondary-plane" data-color data-visual-core>${textNode(item, 1, 'cover-a-secondary text-sans')}</div>
  </section>`;
}

function coverMission(item, assetUrl) {
  return `<section class="composition cover-mission-composition" data-color>
    ${grid('grid-soft')}
    ${textNode(item, 0, 'cover-b-title display-serif', escapeHtml(item.text[0]).replace('«ОК»', '<span class="blue-italic">«ОК»</span>'))}
    ${textNode(item, 1, 'cover-b-secondary text-sans')}
    ${photo(assetUrl, 'cover-b-photo')}
    <div class="approval-rail approval-rail-one" data-color data-visual-core></div>
    <div class="approval-rail approval-rail-two" data-color data-visual-core></div>
    <div class="approval-rail approval-rail-three" data-color data-visual-core></div>
    ${connector('cover-b-connector', 'M0 360H190V210H415V520H620V360H840')}
  </section>`;
}

function coverHumanSystem(item, assetUrl) {
  return `<section class="composition cover-human-system-composition" data-color>
    ${grid('grid-strong')}
    ${photo(assetUrl, 'cover-c-photo')}
    ${textNode(item, 0, 'cover-c-title display-serif', escapeHtml(item.text[0]).replace('строю завод', '<span class="blue-italic">строю завод</span>'))}
    <div class="cover-c-process" data-color data-visual-core>
      <span></span><span></span><span></span><span></span><span></span>
    </div>
  </section>`;
}

function skillsCollage(item, assetUrl) {
  return `<section class="composition skills-composition" data-color>
    ${grid('grid-soft')}
    ${textNode(item, 0, 'skills-title display-serif')}
    ${textNode(item, 1, 'skills-body text-sans')}
    ${photo(assetUrl, 'skills-photo')}
    <div class="skills-fragments" data-color>
      <div class="skill-fragment skill-doc" data-color data-visual-core>
        ${textNode(item, 2, 'skill-label text-sans')}
        <i></i><i></i><i></i><i></i>
      </div>
      <div class="skill-fragment skill-wire" data-color data-visual-core>
        ${textNode(item, 3, 'skill-label text-sans')}
        <b></b><b></b><b></b>
      </div>
      <div class="skill-fragment skill-site" data-color data-visual-core>
        ${textNode(item, 4, 'skill-label text-sans')}
        <i></i><span></span>
      </div>
      <div class="skill-fragment skill-code" data-color data-visual-core>
        ${textNode(item, 5, 'skill-label text-sans')}
        <code></code><code></code><code></code>
      </div>
    </div>
  </section>`;
}

function evidenceWall(item) {
  return `<section class="composition evidence-composition" data-color>
    ${grid('grid-soft')}
    ${textNode(item, 0, 'evidence-title display-serif')}
    <div class="evidence-wall" data-color data-visual-core>
      ${textNode(item, 1, 'evidence-brand brand-one display-serif')}
      ${textNode(item, 2, 'evidence-brand brand-two display-serif')}
      ${textNode(item, 3, 'evidence-brand brand-three display-serif')}
      ${textNode(item, 4, 'evidence-brand brand-four display-serif')}
      ${textNode(item, 5, 'evidence-brand brand-five display-serif')}
      <div class="evidence-rule evidence-rule-a" data-color data-visual-core></div>
      <div class="evidence-rule evidence-rule-b" data-color data-visual-core></div>
    </div>
    <div class="evidence-politics" data-color data-visual-core>
      ${textNode(item, 6, 'evidence-politics-copy text-sans')}
    </div>
  </section>`;
}

function reveal(item) {
  return `<section class="composition reveal-composition" data-color>
    ${textNode(item, 0, 'reveal-title display-serif')}
    ${textNode(item, 1, 'reveal-given text-sans')}
    <div class="mini-machine" data-color data-visual-core>
      ${textNode(item, 2, 'mini-machine-node mini-prompt text-sans')}
      <span class="mini-link" aria-hidden="true"></span>
      ${textNode(item, 3, 'mini-machine-node mini-text text-sans')}
    </div>
    <div class="reveal-system" data-color data-visual-core>
      ${connector('reveal-system-lines', 'M0 100H170V250H350V80H530V390H700V230H840')}
      ${textNode(item, 4, 'reveal-question display-serif', escapeHtml(item.text[4]).replace('производство целиком', '<span class="paper-italic">производство целиком</span>'))}
    </div>
  </section>`;
}

function factoryMap(item) {
  const stages = item.text.slice(3);
  return `<section class="composition factory-composition" data-color>
    ${grid('grid-strong')}
    ${textNode(item, 0, 'factory-kicker text-sans')}
    ${textNode(item, 1, 'factory-title display-serif')}
    ${textNode(item, 2, 'factory-goal text-sans')}
    <div class="factory-map" data-color data-visual-core>
      <svg class="factory-map-lines" viewBox="0 0 840 420" aria-hidden="true" data-qa-svg data-visual-core><path d="M45 90H230V210H420V90H610V210H795V335H610V335H420V335H230V335H45"></path></svg>
      ${stages.map((stage, index) => contentNode(stage, `factory-stage factory-stage-${index + 1} text-sans`)).join('')}
    </div>
  </section>`;
}

function approvalContrast(item) {
  return `<section class="composition approval-composition" data-color>
    ${textNode(item, 0, 'approval-title display-serif', escapeHtml(item.text[0]).replace('пара «ОК»', '<span class="blue-italic">пара «ОК»</span>'))}
    ${textNode(item, 1, 'approval-goal text-sans')}
    ${textNode(item, 2, 'approval-body text-sans')}
    <div class="approval-manual" data-color data-visual-core>
      <svg class="approval-manual-lines" viewBox="0 0 390 500" aria-hidden="true" data-qa-svg data-visual-core>
        <path d="M25 70H140V160H55V255H220V350H80V445H350M155 25V110H310V210H175V305H345V400H220"></path>
      </svg>
      ${textNode(item, 3, 'decision decision-one text-sans')}
      ${textNode(item, 4, 'decision decision-two text-sans')}
      ${textNode(item, 5, 'decision decision-three text-sans')}
    </div>
    <div class="approval-clean" data-color data-visual-core>
      <span class="clean-line clean-line-a"></span><span class="clean-line clean-line-b"></span>
      ${textNode(item, 6, 'ok-node ok-one display-serif')}
      ${textNode(item, 7, 'ok-node ok-two display-serif')}
      ${textNode(item, 8, 'ok-node ok-three display-serif')}
    </div>
  </section>`;
}

function qualityContrast(item) {
  return `<section class="composition quality-composition" data-color>
    ${textNode(item, 0, 'quality-kicker text-sans')}
    ${textNode(item, 1, 'quality-title display-serif')}
    ${textNode(item, 2, 'quality-body text-sans')}
    <div class="quality-bad" data-color data-visual-core>
      <div class="bad-card"><i></i><i></i><i></i></div>
      <div class="bad-card"><i></i><i></i><i></i></div>
      <div class="bad-card"><i></i><i></i><i></i></div>
      ${textNode(item, 3, 'reject-stamp text-sans')}
    </div>
    <div class="quality-good" data-color data-visual-core>
      <div class="format-photo" data-visual-core></div>
      <div class="format-story" data-visual-core></div>
      <div class="format-diagram" data-visual-core><span></span><span></span><span></span></div>
      <div class="format-essay" data-visual-core><i></i><i></i><i></i><i></i></div>
    </div>
  </section>`;
}

function routeMap(item) {
  return `<section class="composition route-composition" data-color>
    ${grid('grid-soft')}
    ${textNode(item, 0, 'route-title display-serif')}
    <svg class="route-line" viewBox="0 0 840 900" aria-hidden="true" data-qa-svg data-visual-core>
      <path d="M35 80H430V200H805V340H250V480H700V620H110V760H805"></path>
      <circle cx="35" cy="80" r="10"></circle><circle cx="430" cy="200" r="10"></circle><circle cx="805" cy="340" r="10"></circle>
      <circle cx="250" cy="480" r="10"></circle><circle cx="700" cy="620" r="10"></circle><circle cx="110" cy="760" r="10"></circle><circle cx="805" cy="760" r="10"></circle>
    </svg>
    <div class="route-nodes" data-color>
      ${item.text.slice(1).map((label, index) => contentNode(label, `route-node route-node-${index + 1} text-sans`)).join('')}
    </div>
  </section>`;
}

function closing(item, assetUrl) {
  return `<section class="composition pinned-closing-composition" data-color>
    ${grid('grid-strong')}
    <div class="closing-title">
      ${textNode(item, 0, 'closing-title-line display-serif')}
      ${textNode(item, 1, 'closing-title-line display-serif closing-title-blue')}
      ${textNode(item, 2, 'closing-title-line display-serif')}
    </div>
    ${photo(assetUrl, 'closing-photo')}
    <div class="closing-process" data-color data-visual-core><span></span><span></span><span></span><span></span><span></span></div>
    ${textNode(item, 3, 'closing-copy text-sans')}
  </section>`;
}

export function renderPinnedIntroEditorial(item, { assetUrl }) {
  if (item.mode === 'cover-photo') return coverPhoto(item, assetUrl);
  if (item.mode === 'cover-mission') return coverMission(item, assetUrl);
  if (item.mode === 'cover-human-system') return coverHumanSystem(item, assetUrl);
  if (item.mode === 'skills-collage') return skillsCollage(item, assetUrl);
  if (item.mode === 'evidence-wall') return evidenceWall(item);
  if (item.mode === 'reveal') return reveal(item);
  if (item.mode === 'factory-map') return factoryMap(item);
  if (item.mode === 'approval-contrast') return approvalContrast(item);
  if (item.mode === 'quality-contrast') return qualityContrast(item);
  if (item.mode === 'route-map') return routeMap(item);
  if (item.mode === 'closing') return closing(item, assetUrl);
  throw new Error(`Unsupported pinned-intro-editorial mode: ${item.mode}`);
}
