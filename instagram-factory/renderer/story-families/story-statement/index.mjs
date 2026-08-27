import { textNode } from '../shared.mjs';

export function render(story) {
  return `<section class="composition statement-composition" data-color>
    <div class="statement-blue" data-color>
      ${textNode(story.text[0], 'statement-lead display-serif')}
    </div>
    <div class="statement-paper" data-color>
      ${textNode(story.text[1], 'statement-detail text-sans')}
      ${textNode(story.text[2], 'statement-detail text-sans')}
    </div>
  </section>`;
}
