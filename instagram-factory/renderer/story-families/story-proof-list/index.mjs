import { textNode } from '../shared.mjs';

export function render(story) {
  const names = story.text.slice(0, 4);
  return `<section class="composition proof-list-composition" data-color>
    <div class="proof-names">
      ${names.map((text, index) => textNode(text, `proof-name proof-name-${index + 1} display-serif`)).join('')}
    </div>
    ${textNode(story.text[4], 'proof-footnote text-sans')}
  </section>`;
}
