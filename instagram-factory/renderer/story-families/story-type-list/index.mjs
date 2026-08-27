import { textNode } from '../shared.mjs';

export function render(story) {
  return `<section class="composition type-list-composition" data-color>
    <div class="skill-list">
      ${story.text.map((text, index) => `
        <div class="skill-module skill-${index + 1}" data-color>
          ${textNode(text, `skill-line display-serif${index === 3 ? ' italic-blue' : ''}`)}
        </div>`).join('')}
    </div>
  </section>`;
}
