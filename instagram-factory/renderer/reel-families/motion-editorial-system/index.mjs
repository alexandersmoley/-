import { contentNode, escapeHtml, grid, pipeline } from '../shared.mjs';

const animated = (at, duration, from) => `data-motion-item data-at="${at}" data-duration="${duration}" data-from="${from}"`;

function splitPipeline(text, nodeClass, arrowClass, start = .2, delay = .42) {
  const parts = text.split(' → ');
  return parts.map((part, index) => {
    const node = `<span class="${nodeClass}" data-motion-item data-at="${(start + index * delay).toFixed(2)}" data-duration=".38" data-from="up">${escapeHtml(part)}</span>`;
    if (index === parts.length - 1) return node;
    return `${node}<span class="${arrowClass}" data-motion-item data-at="${(start + index * delay + .18).toFixed(2)}" data-duration=".24" data-from="clip">→</span>`;
  }).join('');
}

function sceneOne(scene) {
  return `<section class="reel-scene scene-plan" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    ${contentNode(scene.text[0], 'plan-title display-serif', null, animated('-.18', '.34', 'clip'))}
    <div class="plan-modules" data-color aria-hidden="true">
      ${Array.from({ length: 6 }, (_, index) => `<i data-motion-item data-at="${(.28 + index * .18).toFixed(2)}" data-duration=".34" data-from="up"></i>`).join('')}
    </div>
    ${pipeline(scene.text[1], 'plan-pipeline text-sans', .4, .34)}
    <div class="plan-storage" data-color data-motion-item data-at="2.2" data-duration=".52" data-from="right">
      ${contentNode(scene.text[2], 'plan-storage-label text-sans')}
    </div>
  </section>`;
}

function sceneTwo(scene) {
  return `<section class="reel-scene scene-topic" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    ${contentNode(scene.text[0], 'topic-title display-serif', null, animated('-.1', '.42', 'left'))}
    <div class="topic-collapse" data-color aria-hidden="true">
      ${Array.from({ length: 5 }, (_, index) => `<i class="topic-line topic-line-${index + 1}" data-motion-item data-at="${(.18 + index * .12).toFixed(2)}" data-duration=".42" data-from="${index % 2 ? 'right' : 'left'}"></i>`).join('')}
      <b data-motion-item data-at="1.02" data-duration=".46" data-from="scale"></b>
    </div>
    ${contentNode(scene.text[1], 'topic-return text-sans', null, animated('1.28', '.48', 'up'))}
    ${pipeline(scene.text[2], 'topic-pipeline text-sans', 1.55, .34)}
  </section>`;
}

// The third scene draws its topology from the copy rather than from a fixed set of
// tool names: a line like "A → B ← C" becomes nodes and arrows, anything else stays
// plain text. Hardcoding the names painted a different reel's tools over this one.
function sourceTopology(text) {
  const tokens = String(text).split(/\s+([→←])\s+/u);
  if (tokens.length < 3) return null;
  const centre = Math.floor(tokens.length / 2);
  return tokens.map((token, index) => {
    if (token === '→' || token === '←') return `<span class="source-arrow">${token}</span>`;
    const role = index === centre ? 'source-center' : 'source-side';
    return `<span class="${role}">${escapeHtml(token)}</span>`;
  }).join('');
}

function sceneThree(scene) {
  const source = sourceTopology(scene.text[2]);
  return `<section class="reel-scene scene-source" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    ${contentNode(scene.text[0], 'source-title display-serif', null, animated('-.08', '.42', 'clip'))}
    ${contentNode(scene.text[1], 'source-context text-sans', null, animated('.38', '.52', 'up'))}
    ${contentNode(scene.text[2], 'source-topology text-sans', source, animated('.92', '.62', 'clip'))}
    ${scene.text.length > 3 ? `<div class="source-approvals">
      ${contentNode(scene.text[3], 'approval-chip text-sans', null, animated('1.25', '.34', 'scale'))}
      ${scene.text.length > 4 ? contentNode(scene.text[4], 'approval-chip text-sans', null, animated('2.25', '.34', 'scale')) : ''}
    </div>` : ''}
  </section>`;
}

function sceneFour(scene) {
  const stages = splitPipeline(scene.text[1], 'production-stage', 'production-arrow', .28, .46);
  return `<section class="reel-scene scene-production" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    ${contentNode(scene.text[0], 'production-title display-serif', null, animated('-.08', '.42', 'left'))}
    ${contentNode(scene.text[1], 'production-pipeline text-sans', stages)}
    ${contentNode(scene.text[2], 'production-approval text-sans', null, animated('3.15', '.4', 'scale'))}
  </section>`;
}

function sceneFive(scene) {
  const flow = splitPipeline(scene.text[1], 'publish-stage', 'publish-arrow', .45, .54);
  return `<section class="reel-scene scene-publish" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${contentNode(scene.text[0], 'publish-title display-serif', null, animated('-.08', '.42', 'clip'))}
    <div class="publish-lock" data-color aria-hidden="true" data-motion-item data-at=".55" data-duration=".5" data-from="scale"></div>
    ${contentNode(scene.text[1], 'publish-pipeline text-sans', flow, animated('1.55', '.36', 'clip'))}
    ${contentNode(scene.text[2], 'publish-approval text-sans', null, animated('1.18', '.4', 'scale'))}
  </section>`;
}

function sceneSix(scene) {
  // The schema allows one to five lines per scene, so the closing frame renders its
  // full loop and approval chips only when the reel actually declares them.
  const hasFinalLoop = scene.text.length > 4;
  const finalLoop = hasFinalLoop ? splitPipeline(scene.text[3], 'loop-stage', 'loop-arrow', .05, .11) : '';
  const approvalLabels = hasFinalLoop
    ? scene.text[4].split(' / ').map((label) => `<span>${escapeHtml(label)}</span>`).join('')
    : '';
  return `<section class="reel-scene scene-loop" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div data-loop-intro>
      ${contentNode(scene.text[0], 'loop-title display-serif', null, animated('-.08', '.4', 'left'))}
      ${pipeline(scene.text[1], 'loop-short text-sans', .32, .38)}
    </div>
    <div data-loop-cta-phase>
      ${contentNode(scene.text[2], 'loop-cta text-sans')}
    </div>
    ${hasFinalLoop ? `<div class="loop-final" data-final-loop>
      ${contentNode(scene.text[3], 'loop-full text-sans', finalLoop)}
      ${contentNode(scene.text[4], 'loop-approvals text-sans', approvalLabels)}
    </div>` : ''}
  </section>`;
}

export function renderScenes(reel) {
  return reel.scenes.map((scene) => {
    if (scene.id === 'scene-01') return sceneOne(scene);
    if (scene.id === 'scene-02') return sceneTwo(scene);
    if (scene.id === 'scene-03') return sceneThree(scene);
    if (scene.id === 'scene-04') return sceneFour(scene);
    if (scene.id === 'scene-05') return sceneFive(scene);
    if (scene.id === 'scene-06') return sceneSix(scene);
    throw new Error(`Unsupported reel scene: ${scene.id}`);
  }).join('');
}

export function renderCover(reel, { coverAssetUrl }) {
  // A reel may open on a photo or on type alone. A faceless cover carries the
  // second line as a pipeline instead, so the frame still shows the mechanism.
  const photo = reel.cover.asset
    ? `<img class="reel-cover-photo" src="${escapeHtml(coverAssetUrl)}" alt="" data-approved-asset="${escapeHtml(reel.cover.asset.id)}">`
    : '<div class="reel-cover-plate" data-color></div>';
  // One text node either way: the cover QA compares [data-content] nodes against
  // reel.cover.text, so the pipeline stays a single line and is styled, not split.
  const second = contentNode(
    reel.cover.text[1],
    reel.cover.asset ? 'reel-cover-tools text-sans' : 'reel-cover-pipeline text-sans'
  );
  return `<section class="reel-cover${reel.cover.asset ? '' : ' reel-cover-typographic'}" data-color>
    ${photo}
    <div class="reel-cover-field" data-color>
      ${contentNode(reel.cover.text[0], 'reel-cover-title display-serif')}
      ${second}
    </div>
  </section>`;
}

export function timelineScript() {
  return `
    (() => {
      const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
      const ease = (value) => 1 - Math.pow(1 - clamp(value), 3);
      const scenes = [...document.querySelectorAll('[data-scene-id]')];
      const axis = document.querySelector('.system-axis');

      const applyMotion = (node, localTime) => {
        const at = Number(node.dataset.at || 0);
        const duration = Number(node.dataset.duration || .5);
        const progress = ease((localTime - at) / duration);
        const from = node.dataset.from || 'up';
        let transform = 'none';
        let clipPath = 'inset(0 0 0 0)';
        if (from === 'left') transform = 'translate3d(' + ((1 - progress) * -76) + 'px,0,0)';
        if (from === 'right') transform = 'translate3d(' + ((1 - progress) * 76) + 'px,0,0)';
        if (from === 'up') transform = 'translate3d(0,' + ((1 - progress) * 54) + 'px,0)';
        if (from === 'scale') transform = 'scale(' + (.82 + progress * .18) + ')';
        if (from === 'clip') clipPath = 'inset(0 ' + ((1 - progress) * 100) + '% 0 0)';
        node.style.opacity = String(progress);
        node.style.transform = transform;
        node.style.clipPath = clipPath;
      };

      window.renderAt = (seconds) => {
        const time = clamp(Number(seconds), 0, 25);
        document.documentElement.style.setProperty('--timeline', String(time / 25));
        for (const scene of scenes) {
          const start = Number(scene.dataset.start);
          const end = Number(scene.dataset.end);
          const local = time - start;
          const fadeIn = start === 0 ? 1 : clamp(local / .24);
          const fadeOut = end === 25 ? 1 : clamp((end - time) / .24);
          const visible = time >= start - .24 && time <= end + .24;
          scene.style.opacity = visible ? String(Math.min(fadeIn, fadeOut)) : '0';
          scene.style.visibility = visible ? 'visible' : 'hidden';
          scene.style.zIndex = visible ? '3' : '1';
          scene.querySelectorAll('[data-motion-item]').forEach((node) => applyMotion(node, local));
          if (scene.dataset.sceneId === 'scene-06') {
            const finalProgress = ease((local - 1.25) / .28);
            const finalExit = ease((local - 2.72) / .24);
            const ctaProgress = ease((local - 2.72) / .28);
            const intro = scene.querySelector('[data-loop-intro]');
            const finalLoop = scene.querySelector('[data-final-loop]');
            const cta = scene.querySelector('[data-loop-cta-phase]');
            if (intro) intro.style.opacity = String(1 - finalProgress);
            if (finalLoop) finalLoop.style.opacity = String(finalProgress * (1 - finalExit));
            if (cta) cta.style.opacity = String(ctaProgress);
          }
        }
        const phase = time / 25;
        axis.style.transform = 'translate3d(120px,' + (220 + phase * 1360) + 'px,0) scaleX(' + (.18 + phase * .82) + ')';
        axis.style.background = '#1546e8';
        document.body.dataset.renderTime = time.toFixed(4);
        return true;
      };
      window.renderAt(0);
    })();`;
}
