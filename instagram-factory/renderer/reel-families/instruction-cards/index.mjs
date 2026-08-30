import { contentNode, escapeHtml, grid } from '../shared.mjs';

const animated = (at, duration, from) => `data-motion-item data-at="${at}" data-duration="${duration}" data-from="${from}"`;

// Scenes here are addressed by the role the reel declares, not by their position, so a
// reel can carry three steps or five without the family knowing the order in advance.
function sceneShell(scene, modifier, body) {
  return `<section class="reel-scene card-scene ${modifier}" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    ${body}
  </section>`;
}

function hookScene(scene) {
  return sceneShell(scene, 'card-hook', `
    <i class="card-rule" data-color data-motion-item data-at="-.1" data-duration=".3" data-from="clip"></i>
    ${contentNode(scene.text[0], 'hook-title display-serif', null, animated('.1', '.5', 'clip'))}
    ${contentNode(scene.text[1], 'hook-lead text-sans', null, animated('1.35', '.45', 'up'))}
    ${contentNode(scene.text[2], 'hook-note text-sans', null, animated('2.1', '.45', 'up'))}`);
}

// The numeral is the graphic. It arrives first and at full size, so the frame is already
// readable a quarter of a second in, and the instruction lands under it.
function stepScene(scene, index) {
  return sceneShell(scene, `card-step card-step-${index % 2 ? 'odd' : 'even'}`, `
    ${contentNode(scene.text[0], 'step-number display-serif', null, animated('-.12', '.44', 'scale'))}
    <i class="step-rule" data-color data-motion-item data-at=".5" data-duration=".46" data-from="clip"></i>
    ${contentNode(scene.text[1], 'step-action display-serif', null, animated('.62', '.5', 'up'))}
    ${contentNode(scene.text[2], 'step-detail text-sans', null, animated('1.5', '.5', 'up'))}`);
}

// The payoff frame: the sentence a viewer can copy. Set as a quote, nothing competing.
function phraseScene(scene) {
  return sceneShell(scene, 'card-phrase', `
    ${contentNode(scene.text[0], 'phrase-lead text-sans', null, animated('-.1', '.4', 'up'))}
    <div class="phrase-plate" data-color data-motion-item data-at=".4" data-duration=".5" data-from="scale">
      ${contentNode(scene.text[1], 'phrase-quote display-serif', null, animated('.85', '.6', 'clip'))}
    </div>
    ${scene.text.length > 2 ? contentNode(scene.text[2], 'phrase-note text-sans', null, animated('2.2', '.45', 'up')) : ''}`);
}

function ctaScene(scene) {
  return sceneShell(scene, 'card-cta', `
    ${contentNode(scene.text[0], 'cta-note text-sans', null, animated('-.1', '.4', 'up'))}
    ${contentNode(scene.text[1], 'cta-title display-serif', null, animated('.5', '.55', 'clip'))}`);
}

export function renderScenes(reel) {
  let stepIndex = 0;
  return reel.scenes.map((scene) => {
    if (scene.layoutFamily === 'instruction-hook') return hookScene(scene);
    if (scene.layoutFamily === 'instruction-step') return stepScene(scene, stepIndex++);
    if (scene.layoutFamily === 'instruction-phrase') return phraseScene(scene);
    if (scene.layoutFamily === 'instruction-cta') return ctaScene(scene);
    throw new Error(`Unsupported instruction-cards scene role: ${scene.layoutFamily}`);
  }).join('');
}

export function renderCover(reel) {
  return `<section class="reel-cover card-cover" data-color>
    ${grid()}
    <i class="card-rule" data-color></i>
    ${contentNode(reel.cover.text[0], 'cover-title display-serif')}
    ${contentNode(reel.cover.text[1], 'cover-steps text-sans')}
  </section>`;
}

export function timelineScript(reel) {
  const duration = reel.canvas.durationSeconds;
  return `
    (() => {
      const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
      const ease = (value) => 1 - Math.pow(1 - clamp(value), 3);
      const scenes = [...document.querySelectorAll('[data-scene-id]')];
      const axis = document.querySelector('.system-axis');

      const applyMotion = (node, localTime) => {
        const at = Number(node.dataset.at || 0);
        const span = Number(node.dataset.duration || .5);
        const progress = ease((localTime - at) / span);
        const from = node.dataset.from || 'up';
        let transform = 'none';
        let clipPath = 'inset(0 0 0 0)';
        if (from === 'up') transform = 'translate3d(0,' + ((1 - progress) * 48) + 'px,0)';
        if (from === 'left') transform = 'translate3d(' + ((1 - progress) * -70) + 'px,0,0)';
        if (from === 'scale') transform = 'scale(' + (.88 + progress * .12) + ')';
        if (from === 'clip') clipPath = 'inset(0 ' + ((1 - progress) * 100) + '% 0 0)';
        node.style.opacity = String(progress);
        node.style.transform = transform;
        node.style.clipPath = clipPath;
      };

      window.renderAt = (seconds) => {
        const time = clamp(Number(seconds), 0, ${duration});
        document.documentElement.style.setProperty('--timeline', String(time / ${duration}));
        scenes.forEach((scene, index) => {
          const start = Number(scene.dataset.start);
          const local = time - start;
          // Only ever fade in, never out: a scene stays opaque until the next one has
          // covered it. Nothing is half-transparent, so the paper frame never shows.
          const arrival = start === 0 ? 1 : clamp(local / .24);
          const visible = time >= start - .24;
          scene.style.opacity = visible ? String(arrival) : '0';
          scene.style.visibility = visible ? 'visible' : 'hidden';
          scene.style.zIndex = String(3 + index);
          scene.querySelectorAll('[data-motion-item]').forEach((node) => applyMotion(node, local));
        });
        // One progress line across the whole reel: the viewer can see how much is left.
        axis.style.transform = 'scaleX(' + (time / ${duration}) + ')';
        document.body.dataset.renderTime = time.toFixed(4);
        return true;
      };
      window.renderAt(0);
    })();`;
}
