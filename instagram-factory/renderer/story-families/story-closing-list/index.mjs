import { textNode } from '../shared.mjs';

export function render(story) {
  const intro = story.text[0];
  const promise = story.text.at(-1);
  const rows = story.text.slice(1, -1);
  return `<section class="composition closing-composition" data-color>
    ${textNode(intro, 'closing-intro text-sans')}
    <div class="closing-list">
      ${rows.map((text, index) => `
        <div class="closing-row closing-row-${index + 1}" data-color>
          ${textNode(text, 'closing-line display-serif')}
        </div>`).join('')}
    </div>
    ${textNode(promise, 'closing-promise display-serif italic-blue')}
  </section>`;
}
