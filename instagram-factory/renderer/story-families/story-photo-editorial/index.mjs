import { escapeHtml, textNode } from '../shared.mjs';

export function render(story, { assetUrl, asset }) {
  return `<section class="composition photo-composition" data-color>
    <img class="story-photo" src="${escapeHtml(assetUrl)}" width="${asset.width}" height="${asset.height}" alt="">
    <div class="photo-copy" data-color>
      ${textNode(story.text[0], 'photo-copy-line display-serif')}
      ${textNode(story.text[1], 'photo-copy-line display-serif')}
      ${textNode(story.text[2], 'photo-copy-line display-serif italic-blue')}
    </div>
    <div class="photo-life" data-color>
      ${textNode(story.text[3], 'photo-life-line text-sans')}
    </div>
  </section>`;
}
