import { grid, textNode } from '../shared.mjs';

export function render(story) {
  const [lead, turnOne, turnTwo, signature] = story.text;
  return `<section class="composition intro-composition" data-color>
    ${grid('grid-soft')}
    ${textNode(lead, 'intro-lead display-serif')}
    <div class="intro-turn">
      ${textNode(turnOne, 'intro-turn-line display-serif')}
      ${textNode(turnTwo, 'intro-turn-line display-serif italic-blue')}
    </div>
    ${textNode(signature, 'intro-signature text-sans')}
  </section>`;
}
