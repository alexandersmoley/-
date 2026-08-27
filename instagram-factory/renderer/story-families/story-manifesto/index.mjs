import { escapeHtml, textNode } from '../shared.mjs';

function renderAnswerLine(text) {
  const emphasized = escapeHtml(text).replace('систему', '<span class="manifesto-emphasis">систему</span>');
  return `<div class="manifesto-answer-line display-serif text-block" data-content data-type data-color>${emphasized}</div>`;
}

export function render(story) {
  const [lead, ...answer] = story.text;
  return `<section class="composition manifesto-composition" data-color>
    <div class="manifesto-question">
      ${textNode(lead, 'manifesto-question-line text-sans')}
    </div>
    <div class="manifesto-answer">
      ${answer.map(renderAnswerLine).join('')}
    </div>
  </section>`;
}
