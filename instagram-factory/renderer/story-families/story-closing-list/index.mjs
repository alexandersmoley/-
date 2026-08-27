import { textNode } from '../shared.mjs';

export function render(story) {
  return `<section class="composition closing-composition" data-color>
    ${textNode(story.text[0], 'closing-intro text-sans')}
    <div class="closing-list">
      ${story.text.slice(1, 4).map((text, index) => `
        <div class="closing-row closing-row-${index + 1}" data-color>
          ${textNode(text, 'closing-line display-serif')}
        </div>`).join('')}
    </div>
    ${textNode(story.text[4], 'closing-promise display-serif italic-blue')}
  </section>`;
}
