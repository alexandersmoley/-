import { grid, textNode } from '../shared.mjs';

export function render(story) {
  return `<section class="composition process-composition" data-color>
    ${grid('grid-strong')}
    <header class="process-title">
      ${textNode(story.text[0], 'process-lead text-sans')}
      ${textNode(story.text[1], 'process-name display-serif italic-blue')}
    </header>
    <div class="process-panel" data-color>
      ${textNode(story.text[2], 'process-flow text-sans')}
    </div>
  </section>`;
}
