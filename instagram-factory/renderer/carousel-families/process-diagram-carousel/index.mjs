import { contentNode, escapeHtml, grid } from '../shared.mjs';

const node = (slide, index, className, html = null) => contentNode(slide.text[index], className, html);

function cover(slide) {
  return `<section class="composition cover-composition" data-color>
    ${grid('grid-soft')}
    <div class="cover-head">
      ${node(slide, 0, 'cover-line display-serif')}
      ${node(slide, 1, 'cover-line display-serif')}
      ${node(slide, 2, 'cover-line display-serif cover-accent')}
    </div>
    <div class="cover-support" data-color>${node(slide, 3, 'cover-support-line text-sans')}</div>
  </section>`;
}

function simplePipeline(slide) {
  return `<section class="composition simple-pipeline-composition" data-color>
    ${grid('grid-strong')}
    ${node(slide, 0, 'simple-pipeline-intro text-sans')}
    <div class="simple-pipeline-row" data-color>
      ${slide.text.slice(1, 10).map((text, index) => contentNode(
        text,
        index % 2 ? 'pipeline-arrow functional-arrow text-sans' : 'pipeline-stage display-serif'
      )).join('')}
    </div>
    ${node(slide, 10, 'simple-pipeline-foot display-serif')}
  </section>`;
}

function criteria(slide) {
  return `<section class="composition criteria-composition" data-color>
    <div class="criteria-head" data-color>
      ${node(slide, 0, 'criteria-title display-serif')}
      ${node(slide, 1, 'criteria-context text-sans')}
    </div>
    <div class="criteria-list" data-color>
      ${slide.text.slice(2).map((text, index) => contentNode(text, `criteria-item criteria-item-${index + 1} display-serif`)).join('')}
    </div>
  </section>`;
}

function codexBreakpoint(slide) {
  return `<section class="composition codex-breakpoint-composition" data-color>
    ${node(slide, 0, 'breakpoint-title display-serif')}
    ${node(slide, 1, 'breakpoint-kicker text-sans')}
    <div class="breakpoint-gap" data-color aria-hidden="true"></div>
    <div class="breakpoint-core">
      ${node(slide, 2, 'breakpoint-core-line display-serif')}
      ${node(slide, 3, 'breakpoint-core-line display-serif breakpoint-core-accent')}
    </div>
    ${node(slide, 4, 'breakpoint-conclusion text-sans')}
  </section>`;
}

function publicationBreakpoint(slide) {
  const rich404 = escapeHtml(slide.text[1]).replace('404', '<span class="blue-italic">404</span>');
  return `<section class="composition publication-breakpoint-composition" data-color>
    ${grid('grid-soft')}
    ${node(slide, 0, 'publication-title display-serif')}
    ${node(slide, 1, 'publication-fact text-sans', rich404)}
    <div class="publication-gap" data-color>
      ${node(slide, 2, 'publication-side publication-ready display-serif')}
      <span class="broken-connection" aria-hidden="true"></span>
      ${node(slide, 3, 'publication-side publication-live display-serif')}
    </div>
    ${node(slide, 4, 'publication-layer text-sans')}
  </section>`;
}

function qaBreakpoint(slide) {
  return `<section class="composition qa-breakpoint-composition" data-color>
    <div class="qa-opening">
      ${node(slide, 0, 'qa-opening-line display-serif')}
      ${node(slide, 1, 'qa-opening-line display-serif qa-stopped')}
    </div>
    <div class="qa-gate" data-color>
      ${node(slide, 2, 'qa-explanation text-sans')}
    </div>
    ${node(slide, 3, 'qa-result display-serif')}
    ${node(slide, 4, 'qa-principle text-sans')}
  </section>`;
}

function architecture(slide) {
  const sequence = slide.text.slice(1, 16);
  return `<section class="composition architecture-composition" data-color>
    ${grid('grid-strong')}
    ${node(slide, 0, 'architecture-intro text-sans')}
    <div class="architecture-flow" data-color>
      ${sequence.map((text, index) => contentNode(
        text,
        index % 2 ? 'architecture-arrow functional-arrow text-sans' : 'architecture-stage display-serif'
      )).join('')}
    </div>
    <div class="architecture-conclusion" data-color>
      ${node(slide, 16, 'architecture-conclusion-line text-sans')}
    </div>
  </section>`;
}

function principle(slide) {
  const statement = escapeHtml(slide.text[1]).replace('не генератор постов', '<span class="blue-italic">не генератор постов</span>');
  return `<section class="composition principle-composition" data-color>
    ${grid('grid-soft')}
    ${node(slide, 0, 'principle-kicker text-sans')}
    ${node(slide, 1, 'principle-title display-serif', statement)}
    <div class="principle-support" data-color>
      ${node(slide, 2, 'principle-support-short text-sans')}
      ${node(slide, 3, 'principle-support-long display-serif')}
    </div>
  </section>`;
}

function closing(slide) {
  const ending = escapeHtml(slide.text[2])
    .replace('не набор нейросетей', '<span class="closing-muted">не набор нейросетей</span>')
    .replace('настоящий контент-завод', '<span class="blue-italic">настоящий контент-завод</span>');
  return `<section class="composition carousel-closing-composition" data-color>
    ${node(slide, 0, 'closing-start text-sans')}
    ${node(slide, 1, 'closing-pause display-serif')}
    <div class="closing-divider" data-color aria-hidden="true"></div>
    ${node(slide, 2, 'closing-end display-serif', ending)}
  </section>`;
}

export function render(slide) {
  if (slide.id === 'slide-01') return cover(slide);
  if (slide.id === 'slide-02') return simplePipeline(slide);
  if (slide.id === 'slide-03') return criteria(slide);
  if (slide.id === 'slide-04') return codexBreakpoint(slide);
  if (slide.id === 'slide-05') return publicationBreakpoint(slide);
  if (slide.id === 'slide-06') return qaBreakpoint(slide);
  if (slide.id === 'slide-07') return architecture(slide);
  if (slide.id === 'slide-08') return principle(slide);
  if (slide.id === 'slide-09') return closing(slide);
  throw new Error(`Unsupported process-diagram-carousel slide: ${slide.id}`);
}
