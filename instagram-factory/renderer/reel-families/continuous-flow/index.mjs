import { contentNode, escapeHtml, grid } from '../shared.mjs';

const accent = (text, phrase) => {
  const safe = escapeHtml(text);
  if (!phrase) return safe;
  const safePhrase = escapeHtml(phrase);
  return safe.replace(safePhrase, `<em>${safePhrase}</em>`);
};

const node = (scene, index, className) => contentNode(
  scene.text[index],
  className,
  accent(scene.text[index], scene.accent)
);

function sceneOne(scene) {
  return `<section class="reel-scene flow-scene flow-intro" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="flow-camera">
      ${node(scene, 0, 'flow-title display-serif')}
      ${node(scene, 1, 'flow-kicker text-sans')}
      <div class="command-track" aria-hidden="true"><i></i></div>
      ${node(scene, 2, 'flow-command text-sans')}
    </div>
  </section>`;
}

function sceneTwo(scene) {
  return `<section class="reel-scene flow-scene flow-branch" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="flow-camera">
      ${node(scene, 0, 'flow-number display-serif')}
      ${node(scene, 1, 'flow-heading display-serif')}
      ${node(scene, 2, 'flow-body text-sans')}
      <div class="branch-source" aria-hidden="true"></div>
      <div class="branch-lines" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="channel-labels text-sans" aria-hidden="true"><span>Instagram</span><span>Telegram</span><span>vc.ru</span></div>
    </div>
  </section>`;
}

function sceneThree(scene) {
  return `<section class="reel-scene flow-scene flow-build" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="flow-camera">
      ${node(scene, 0, 'flow-number display-serif')}
      ${node(scene, 1, 'flow-heading display-serif')}
      ${node(scene, 2, 'flow-body text-sans')}
      <div class="editorial-modules" aria-hidden="true"><i><b></b></i><i><b></b></i><i><b></b></i></div>
    </div>
  </section>`;
}

function sceneFour(scene) {
  return `<section class="reel-scene flow-scene flow-ok" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="flow-camera">
      ${node(scene, 0, 'flow-number display-serif')}
      ${node(scene, 1, 'ok-title display-serif')}
      ${node(scene, 2, 'flow-body text-sans')}
      <div class="ok-orbit" aria-hidden="true"><i></i></div>
    </div>
  </section>`;
}

function sceneFive(scene) {
  const formula = escapeHtml(scene.text[1]).split(' → ').map((part, index) => (
    `<span class="formula-part formula-part-${index + 1}">${index === 1 ? `<em>${part}</em>` : part}</span>${index < 2 ? '<i>→</i>' : ''}`
  )).join('');
  return `<section class="reel-scene flow-scene flow-formula" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="flow-camera">
      ${node(scene, 0, 'formula-lead text-sans')}
      ${contentNode(scene.text[1], 'formula display-serif', formula)}
      ${node(scene, 2, 'formula-note text-sans')}
      <div class="formula-line" aria-hidden="true"></div>
    </div>
  </section>`;
}

function sceneSix(scene) {
  return `<section class="reel-scene flow-scene flow-close" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    <div class="flow-camera">
      ${node(scene, 0, 'close-note text-sans')}
      ${node(scene, 1, 'close-title display-serif')}
      <div class="closing-line" aria-hidden="true"></div>
    </div>
  </section>`;
}

export function renderScenes(reel) {
  const renderers = [sceneOne, sceneTwo, sceneThree, sceneFour, sceneFive, sceneSix];
  return reel.scenes.map((scene, index) => renderers[index](scene)).join('');
}

export function renderCover(reel) {
  const title = accent(reel.cover.text[0], reel.cover.accent);
  return `<section class="reel-cover flow-cover" data-color>
    ${grid()}
    ${contentNode(reel.cover.text[0], 'cover-title display-serif', title)}
    ${contentNode(reel.cover.text[1], 'cover-formula text-sans')}
    <div class="cover-flow-line" aria-hidden="true"></div>
  </section>`;
}

export function timelineScript(reel) {
  const duration = reel.canvas.durationSeconds;
  return `
  (() => {
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const smooth = (v) => {
      const x = clamp(v);
      return x * x * (3 - 2 * x);
    };
    const scenes = [...document.querySelectorAll('[data-scene-id]')];
    const duration = ${duration};
    const p = (local, at, len) => smooth((local - at) / len);

    window.renderAt = (seconds) => {
      const time = clamp(Number(seconds), 0, duration);
      document.documentElement.style.setProperty('--timeline', String(time / duration));
      scenes.forEach((scene, index) => {
        const start = Number(scene.dataset.start);
        const end = Number(scene.dataset.end);
        const local = time - start;
        const overlap = .72;
        const visible = time >= start - overlap && time <= end + overlap;
        const enter = start === 0 ? 1 : smooth((time - (start - overlap)) / overlap);
        const exit = end === duration ? 1 : 1 - smooth((time - (end - overlap)) / overlap);
        scene.style.visibility = visible ? 'visible' : 'hidden';
        scene.style.opacity = visible ? String(Math.min(enter, exit)) : '0';
        scene.style.zIndex = visible ? String(10 + index) : '1';
        const camera = scene.querySelector('.flow-camera');
        if (camera) {
          const drift = clamp(local / Math.max(.001, end - start));
          camera.style.transform = 'translate3d(0,' + ((drift - .5) * -24) + 'px,0)';
        }

        if (index === 0) {
          const title = scene.querySelector('.flow-title');
          const kicker = scene.querySelector('.flow-kicker');
          const command = scene.querySelector('.flow-command');
          const track = scene.querySelector('.command-track i');
          const a = p(local, .12, .9), b = p(local, .72, .9), c = p(local, 1.35, 1.15);
          if (title) { title.style.opacity = a; title.style.clipPath = 'inset(' + ((1-a)*100) + '% 0 0 0)'; }
          if (kicker) { kicker.style.opacity = b; kicker.style.transform = 'translate3d(0,' + ((1-b)*24) + 'px,0)'; }
          if (track) track.style.transform = 'scaleX(' + c + ')';
          if (command) { command.style.opacity = c; command.style.transform = 'translate3d(' + ((1-c)*90) + 'px,0,0)'; }
        }

        if (index === 1) {
          const heading = scene.querySelector('.flow-heading');
          const body = scene.querySelector('.flow-body');
          const num = scene.querySelector('.flow-number');
          const lines = [...scene.querySelectorAll('.branch-lines i')];
          const labels = [...scene.querySelectorAll('.channel-labels span')];
          const a = p(local, .0, 1.0), b = p(local, .5, 1.0);
          if (num) { num.style.opacity = a * .18; num.style.transform = 'translate3d(0,' + ((1-a)*55) + 'px,0)'; }
          if (heading) { heading.style.opacity = a; heading.style.transform = 'translate3d(0,' + ((1-a)*35) + 'px,0)'; }
          if (body) body.style.opacity = b;
          lines.forEach((line, i) => { const q = p(local, 1.0 + i*.22, 1.25); line.style.transform = 'scaleX(' + q + ') rotate(' + (i-1)*12 + 'deg)'; });
          labels.forEach((label, i) => { const q = p(local, 2.0 + i*.18, .8); label.style.opacity = q; label.style.transform = 'translate3d(' + ((1-q)*20) + 'px,0,0)'; });
        }

        if (index === 2) {
          const num = scene.querySelector('.flow-number');
          const heading = scene.querySelector('.flow-heading');
          const body = scene.querySelector('.flow-body');
          const modules = [...scene.querySelectorAll('.editorial-modules i')];
          const a = p(local, .0, 1.0), b = p(local, .65, 1.0);
          if (num) { num.style.opacity = a*.18; num.style.transform = 'translate3d(0,' + ((1-a)*50) + 'px,0)'; }
          if (heading) heading.style.opacity = a;
          if (body) body.style.opacity = b;
          modules.forEach((module, i) => {
            const q = p(local, .65 + i*.22, 1.25);
            const converge = p(local, 3.3, 1.6);
            const shift = (i-1) * (1-converge) * 235;
            module.style.opacity = q;
            module.style.transform = 'translate3d(' + shift + 'px,' + ((1-q)*45) + 'px,0) scale(' + (.9 + q*.1) + ')';
            const inner = module.querySelector('b'); if (inner) inner.style.transform = 'scaleX(' + p(local, 1.6+i*.18, 1.2) + ')';
          });
        }

        if (index === 3) {
          const num = scene.querySelector('.flow-number');
          const title = scene.querySelector('.ok-title');
          const body = scene.querySelector('.flow-body');
          const orbit = scene.querySelector('.ok-orbit');
          const a = p(local, .2, 1.2), b = p(local, 1.0, 1.2), c = p(local, 1.7, 1.8);
          if (num) num.style.opacity = a*.12;
          if (title) { title.style.opacity = a; title.style.transform = 'scale(' + (.84 + a*.16) + ')'; title.style.transformOrigin = '120px center'; }
          if (body) body.style.opacity = b;
          if (orbit) { orbit.style.opacity = c; orbit.style.transform = 'rotate(' + (c*250) + 'deg) scale(' + (.72+c*.28) + ')'; }
        }

        if (index === 4) {
          const lead = scene.querySelector('.formula-lead');
          const parts = [...scene.querySelectorAll('.formula-part')];
          const arrows = [...scene.querySelectorAll('.formula i')];
          const note = scene.querySelector('.formula-note');
          const line = scene.querySelector('.formula-line');
          if (lead) lead.style.opacity = p(local, .0, .9);
          parts.forEach((part, i) => { const q = p(local, .65+i*.65, 1.0); part.style.opacity=q; part.style.transform='translate3d(0,'+((1-q)*32)+'px,0)'; });
          arrows.forEach((arrow, i) => { const q = p(local, 1.15+i*.65, .8); arrow.style.opacity=q; arrow.style.transform='scaleX('+q+')'; });
          if (line) line.style.transform='scaleX('+p(local,.6,3.0)+')';
          if (note) note.style.opacity=p(local,3.1,1.1);
        }

        if (index === 5) {
          const note = scene.querySelector('.close-note');
          const title = scene.querySelector('.close-title');
          const line = scene.querySelector('.closing-line');
          const a=p(local,.1,1.1), b=p(local,.75,1.5), c=p(local,1.2,3.0);
          if (note) { note.style.opacity=a; note.style.transform='translate3d(0,'+((1-a)*28)+'px,0)'; }
          if (title) { title.style.opacity=b; title.style.clipPath='inset(0 '+((1-b)*100)+'% 0 0)'; }
          if (line) line.style.transform='translate3d('+(c*780-780)+'px,0,0)';
        }
      });
      document.body.dataset.renderTime = time.toFixed(4);
      return true;
    };
    window.renderAt(0);
  })();`;
}
