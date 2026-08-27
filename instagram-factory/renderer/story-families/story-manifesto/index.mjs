import { escapeHtml, textNode } from '../shared.mjs';

export function render(story) {
  const emphasized = escapeHtml(story.text[3]).replace('систему', '<span class="manifesto-emphasis">систему</span>');
  return `<section class="composition manifesto-composition" data-color>
    <div class="manifesto-question">
      ${textNode(story.text[0], 'manifesto-question-line text-sans')}
      ${textNode(story.text[1], 'manifesto-question-line text-sans')}
    </div>
    <div class="manifesto-answer">
      ${textNode(story.text[2], 'manifesto-answer-line display-serif')}
      <div class="manifesto-answer-line display-serif text-block" data-content data-type data-color>${emphasized}</div>
      ${textNode(story.text[4], 'manifesto-answer-line display-serif')}
    </div>
  </section>`;
}
