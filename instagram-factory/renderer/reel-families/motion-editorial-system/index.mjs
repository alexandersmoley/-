import { contentNode, escapeHtml, grid, pipeline } from '../shared.mjs';

const animated = (at, duration, from) => `data-motion-item data-at="${at}" data-duration="${duration}" data-from="${from}"`;

function sceneOne(scene) {
  const statement = escapeHtml(scene.text[1]).replace('не контент-завод', '<span class="blue-italic">не контент-завод</span>');
  return `<section class="reel-scene scene-hook" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="hook-rule" data-color aria-hidden="true"></div>
    ${contentNode(scene.text[0], 'hook-kicker text-sans', null, animated('.08', '.46', 'left'))}
    ${contentNode(scene.text[1], 'hook-statement display-serif', statement, animated('.42', '.72', 'clip'))}
  </section>`;
}

function sceneTwo(scene) {
  return `<section class="reel-scene scene-minimal" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    <div class="minimal-rail" data-rail data-color aria-hidden="true"></div>
    ${pipeline(scene.text[0], 'minimal-pipeline display-serif', .15, .58)}
    <div class="minimal-note" data-color>
      ${contentNode(scene.text[1], 'minimal-caption text-sans', null, animated('1.05', '.58', 'up'))}
    </div>
  </section>`;
}

function sceneThree(scene) {
  const parts = scene.text[0].split(' → ');
  const stages = parts.map((part, index) => `
    <span class="build-stage build-stage-${index + 1}" data-motion-item data-at="${(.2 + index * .47).toFixed(2)}" data-duration=".46" data-from="${index % 2 ? 'right' : 'left'}">
      ${escapeHtml(part)}
    </span>${index < parts.length - 1 ? `<span class="build-arrow build-arrow-${index + 1}" data-motion-item data-at="${(.4 + index * .47).toFixed(2)}" data-duration=".3" data-from="clip"> → </span>` : ''}`).join('');
  return `<section class="reel-scene scene-build" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="build-rail" data-rail data-color aria-hidden="true"></div>
    ${contentNode(scene.text[0], 'build-pipeline text-sans', stages)}
    ${contentNode(scene.text[1], 'build-conclusion display-serif blue-italic', null, animated('4.08', '.68', 'clip'))}
  </section>`;
}

function sceneFour(scene) {
  const process = escapeHtml(scene.text[1]).replace('процесс', '<span class="blue-italic">процесс</span>');
  return `<section class="reel-scene scene-contrast" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    <div class="contrast-paper" data-color></div>
    <div class="contrast-blue" data-color data-panel></div>
    ${contentNode(scene.text[0], 'contrast-first display-serif', null, animated('.18', '.66', 'left'))}
    ${contentNode(scene.text[1], 'contrast-second display-serif', process, animated('1.08', '.76', 'clip'))}
    <div class="contrast-rule" data-color aria-hidden="true"></div>
  </section>`;
}

function sceneFive(scene) {
  const parts = scene.text[0].split(' → ');
  const stages = parts.map((part, index) => `
    <span class="system-stage" data-motion-item data-at="${(.18 + index * .46).toFixed(2)}" data-duration=".42" data-from="up">
      ${escapeHtml(part)}
    </span>${index < parts.length - 1 ? `<span class="system-arrow" data-motion-item data-at="${(.38 + index * .46).toFixed(2)}" data-duration=".28" data-from="clip">→</span>` : ''}`).join('');
  return `<section class="reel-scene scene-system" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="system-rail" data-rail data-color aria-hidden="true"></div>
    ${contentNode(scene.text[0], 'system-pipeline display-serif', stages)}
  </section>`;
}

function sceneSix(scene) {
  return `<section class="reel-scene scene-closing" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    ${contentNode(scene.text[0], 'closing-intro text-sans', null, animated('.12', '.48', 'up'))}
    ${contentNode(scene.text[1], 'closing-title display-serif blue-italic', null, animated('.42', '.72', 'clip'))}
    <div class="closing-rule" data-color aria-hidden="true"></div>
    ${contentNode(scene.text[2], 'closing-postscript text-sans', null, animated('1.28', '.56', 'up'))}
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

export function renderCover(reel) {
  const accent = escapeHtml(reel.cover.text[1]).replace('не контент-завод', '<span class="blue-italic">не контент-завод</span>');
  return `<section class="reel-cover" data-color>
    ${grid()}
    <div class="cover-system-line" data-color aria-hidden="true"></div>
    ${contentNode(reel.cover.text[0], 'reel-cover-kicker text-sans')}
    ${contentNode(reel.cover.text[1], 'reel-cover-title display-serif', accent)}
    <div class="cover-pipeline" data-color aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i>
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
        if (from === 'left') transform = 'translate3d(' + ((1 - progress) * -90) + 'px,0,0)';
        if (from === 'right') transform = 'translate3d(' + ((1 - progress) * 90) + 'px,0,0)';
        if (from === 'up') transform = 'translate3d(0,' + ((1 - progress) * 62) + 'px,0)';
        if (from === 'scale') transform = 'scale(' + (.84 + progress * .16) + ')';
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
          const fadeIn = start === 0 ? 1 : clamp(local / .28);
          const fadeOut = end === 25 ? 1 : clamp((end - time) / .28);
          const visible = time >= start - .28 && time <= end + .28;
          scene.style.opacity = visible ? String(Math.min(fadeIn, fadeOut)) : '0';
          scene.style.visibility = visible ? 'visible' : 'hidden';
          scene.style.zIndex = visible ? '3' : '1';
          scene.querySelectorAll('[data-motion-item]').forEach((node) => applyMotion(node, local));
          scene.querySelectorAll('[data-rail]').forEach((rail) => {
            const duration = Math.max(.5, end - start - .8);
            rail.style.setProperty('--rail-progress', String(ease((local - .12) / duration)));
          });
          scene.querySelectorAll('[data-panel]').forEach((panel) => {
            panel.style.setProperty('--panel-progress', String(ease((local - .66) / .8)));
          });
        }
        const phase = time / 25;
        const axisX = 120 + Math.sin(phase * Math.PI * 4) * 82;
        const axisY = 260 + phase * 1320;
        const axisRotation = -8 + phase * 22;
        axis.style.transform = 'translate3d(' + axisX + 'px,' + axisY + 'px,0) rotate(' + axisRotation + 'deg) scaleX(' + (.3 + phase * .7) + ')';
        axis.style.background = (time >= 3 && time < 6) || (time >= 17 && time < 22) ? '#f4f1e9' : '#1546e8';
        document.body.dataset.renderTime = time.toFixed(4);
        return true;
      };
      window.renderAt(0);
    })();`;
}
