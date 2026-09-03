import { accentHtml, contentNode, escapeHtml, grid } from '../shared.mjs';

// Montage principle of this family: there is no cut. One set stands for the whole reel —
// a fixed stack of channel tracks — and the only thing that moves between scenes is the
// focus block travelling from one track to the next. Every scene therefore draws the same
// stage at the same coordinates, and the focus geometry is computed from the reel's global
// time rather than from the scene, so the two scenes on screen during a crossfade agree on
// where the block is. The join stops being visible: the viewer sees a continuous move.
//
// The other families cut between full-frame cards. This one does not, and that is the
// whole point of it existing.

// The stage is inside the safe zone on every side, so track geometry can never push copy out.
const STAGE = { left: 120, right: 900, top: 640, bottom: 1400, gap: 32 };
const stageHeight = STAGE.bottom - STAGE.top;

// How many tracks the stage has is not a constant: it is however many focus scenes the reel
// declares. Three channels give three tracks; a reel about four steps would give four.
function trackLayout(reel) {
  const count = reel.scenes.filter((scene) => scene.layoutFamily === 'tracks-focus').length;
  if (count < 2) throw new Error(`parallel-tracks needs at least two tracks-focus scenes, got ${count}`);
  const height = (stageHeight - (count - 1) * STAGE.gap) / count;
  return {
    count,
    height,
    top: (index) => STAGE.top + index * (height + STAGE.gap)
  };
}

const animated = (at, duration, from) => `data-motion-item data-at="${at}" data-duration="${duration}" data-from="${from}"`;

function stage(layout) {
  const rails = Array.from({ length: layout.count }, (_, index) => (
    `<i class="track-rail" data-color style="top:${layout.top(index)}px;height:${layout.height}px"></i>`
  )).join('');
  // The gaps between tracks are painted over the block. They are only shown once the block is
  // taller than a single track: covering the whole stage it then reads as three lit tracks
  // rather than one blue rectangle, while a block in transit stays one moving object.
  const gaps = Array.from({ length: layout.count - 1 }, (_, index) => (
    `<i class="track-gap" style="top:${layout.top(index) + layout.height}px;height:${STAGE.gap}px"></i>`
  )).join('');
  // The focus block is one element per scene at identical coordinates; the timeline moves it.
  return `<div class="tracks-stage" aria-hidden="true">
    ${rails}
    <i class="track-focus" data-color></i>
    ${gaps}
  </div>`;
}

function sceneShell(scene, layout, modifier, body) {
  return `<section class="reel-scene tracks-scene ${modifier}" data-scene-id="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" data-color>
    ${grid()}
    ${stage(layout)}
    ${body}
  </section>`;
}

// The opening frame: the tracks are already there and still empty. Nothing is focused yet,
// so the block has no position to be in and the copy carries the frame alone.
function openScene(scene, layout) {
  return sceneShell(scene, layout, 'tracks-open', `
    ${contentNode(scene.text[0], 'tracks-lead display-serif', accentHtml(scene.text[0], scene.accent), animated('-.1', '.5', 'clip'))}
    ${contentNode(scene.text[1], 'tracks-sub text-sans', null, animated('1.1', '.45', 'up'))}
    ${contentNode(scene.text[2], 'tracks-note text-sans', null, animated('1.9', '.45', 'up'))}`);
}

// A focus frame. The channel name sits inside its own track, on the block, and the block
// arrives there by travelling from wherever it was — not by appearing.
function focusScene(scene, layout, index) {
  const top = layout.top(index);
  return sceneShell(scene, layout, 'tracks-focus-scene', `
    ${contentNode(scene.text[0], 'tracks-lead display-serif', accentHtml(scene.text[0], scene.accent), animated('.15', '.5', 'up'))}
    ${contentNode(scene.text[1], 'track-name display-serif', null, `style="top:${top + layout.height / 2 - 40}px" data-home-top="${top}" ${animated('.5', '.5', 'left')}`)}
    ${contentNode(scene.text[2], 'tracks-note text-sans', null, animated('1.4', '.5', 'up'))}`);
}

// The payoff: the block stops travelling and covers every track at once.
function mergeScene(scene, layout) {
  return sceneShell(scene, layout, 'tracks-merge', `
    ${contentNode(scene.text[0], 'tracks-lead display-serif', accentHtml(scene.text[0], scene.accent), animated('.1', '.5', 'up'))}
    ${contentNode(scene.text[1], 'track-name track-name-wide display-serif', null, animated('.7', '.55', 'clip'))}
    ${contentNode(scene.text[2], 'tracks-note text-sans', null, animated('1.6', '.5', 'up'))}`);
}

// The closing frame drops the stage: the set has done its work, and the author is left.
function closeScene(scene, reel, layout, { photoAssetUrl }) {
  const photo = reel.photoAsset
    ? `<img class="tracks-photo" src="${escapeHtml(photoAssetUrl)}" alt="" data-approved-asset="${escapeHtml(reel.photoAsset.id)}" data-motion-item data-at=".9" data-duration=".6" data-from="up">`
    : '';
  return sceneShell(scene, layout, `tracks-close${reel.photoAsset ? ' tracks-close-photo' : ''}`, `
    ${contentNode(scene.text[0], 'tracks-close-note text-sans', null, animated('-.1', '.4', 'up'))}
    ${contentNode(scene.text[1], 'tracks-close-title display-serif', accentHtml(scene.text[1], scene.accent), animated('.45', '.55', 'clip'))}
    ${photo}`);
}

export function renderScenes(reel, assets = {}) {
  const layout = trackLayout(reel);
  let focusIndex = 0;
  return reel.scenes.map((scene) => {
    if (scene.layoutFamily === 'tracks-open') return openScene(scene, layout);
    if (scene.layoutFamily === 'tracks-focus') return focusScene(scene, layout, focusIndex++);
    if (scene.layoutFamily === 'tracks-merge') return mergeScene(scene, layout);
    if (scene.layoutFamily === 'tracks-close') return closeScene(scene, reel, layout, assets);
    throw new Error(`Unsupported parallel-tracks scene role: ${scene.layoutFamily}`);
  }).join('');
}

// The cover carries the reel's own mark: the same stack of tracks, all lit. Three bars are
// legible at thumbnail size, and the cover then says the same thing as the film.
const COVER = { top: 900, height: 180, gap: 32 };

export function renderCover(reel) {
  const count = reel.scenes.filter((scene) => scene.layoutFamily === 'tracks-focus').length;
  const bars = Array.from({ length: count }, (_, index) => (
    `<i class="cover-track" data-color style="top:${COVER.top + index * (COVER.height + COVER.gap)}px;height:${COVER.height}px"></i>`
  )).join('');
  // The second line sits on the middle bar, so the mark stays symmetric around it.
  const noteTop = COVER.top + Math.floor(count / 2) * (COVER.height + COVER.gap) + COVER.height / 2 - 30;
  return `<section class="reel-cover tracks-cover" data-color>
    ${grid()}
    ${bars}
    ${contentNode(reel.cover.text[0], 'cover-title display-serif', accentHtml(reel.cover.text[0], reel.cover.accent))}
    ${contentNode(reel.cover.text[1], 'cover-note text-sans', null, `style="top:${noteTop}px"`)}
  </section>`;
}

// The focus target of each scene, as plain geometry. Scenes that show no block declare null,
// and the timeline fades the block out rather than teleporting it.
function focusTargets(reel) {
  const layout = trackLayout(reel);
  let index = 0;
  return reel.scenes.map((scene) => {
    if (scene.layoutFamily === 'tracks-focus') {
      const top = layout.top(index++);
      return { start: scene.start, end: scene.end, top, height: layout.height, opacity: 1 };
    }
    if (scene.layoutFamily === 'tracks-merge') {
      return { start: scene.start, end: scene.end, top: STAGE.top, height: stageHeight, opacity: 1 };
    }
    // Open and close frames keep the block's last geometry so it never jumps, only fades.
    return { start: scene.start, end: scene.end, top: null, height: null, opacity: 0 };
  });
}

export function timelineScript(reel) {
  const duration = reel.canvas.durationSeconds;
  const targets = focusTargets(reel);
  const layout = trackLayout(reel);
  return `
    (() => {
      const targets = ${JSON.stringify(targets)};
      const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
      const ease = (value) => 1 - Math.pow(1 - clamp(value), 3);
      // A symmetric ease for the travel, so the block leaves and arrives at the same speed.
      const easeBoth = (value) => {
        const t = clamp(value);
        return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
      const TRACK_HEIGHT = ${layout.height};
      const scenes = [...document.querySelectorAll('[data-scene-id]')];
      const axis = document.querySelector('.system-axis');
      const blocks = [...document.querySelectorAll('.track-focus')];
      const gaps = [...document.querySelectorAll('.track-gap')];

      // The travel window straddles the boundary between two scenes, so the block is already
      // moving before the incoming scene appears and is still moving after it has. Both
      // scenes are drawn from the same clock, so their blocks sit on top of each other.
      const TRAVEL = .8;
      // Where the block rests during scene i. A scene that shows no block still has a
      // resting place: the geometry of the nearest scene that does, so the block fades
      // out and back in where it stands instead of teleporting. Pure in time — the QA
      // seeks around the timeline, so nothing here may depend on playback order.
      const restAt = (index) => {
        const target = targets[index];
        if (target.top !== null) return { top: target.top, height: target.height, opacity: 1 };
        for (let i = index - 1; i >= 0; i -= 1) {
          if (targets[i].top !== null) return { top: targets[i].top, height: targets[i].height, opacity: 0 };
        }
        for (let i = index + 1; i < targets.length; i += 1) {
          if (targets[i].top !== null) return { top: targets[i].top, height: targets[i].height, opacity: 0 };
        }
        return { top: null, height: 0, opacity: 0 };
      };
      const lerp = (from, to, progress) => ({
        top: from.top + (to.top - from.top) * progress,
        height: from.height + (to.height - from.height) * progress,
        opacity: from.opacity + (to.opacity - from.opacity) * progress
      });
      // The travel is centred on the boundary between two scenes, so it has to be described
      // from both sides of it: the scene index flips at the boundary, and interpolating only
      // forward made the block snap there — exactly the seam this family exists to avoid.
      const focusAt = (time) => {
        let index = 0;
        for (let i = 0; i < targets.length; i += 1) if (time >= targets[i].start) index = i;
        const half = TRAVEL / 2;
        if (index > 0 && time < targets[index].start + half) {
          return lerp(restAt(index - 1), restAt(index), easeBoth((time - (targets[index].start - half)) / TRAVEL));
        }
        if (index + 1 < targets.length && time > targets[index].end - half) {
          return lerp(restAt(index), restAt(index + 1), easeBoth((time - (targets[index].end - half)) / TRAVEL));
        }
        return restAt(index);
      };

      const applyMotion = (node, localTime) => {
        const at = Number(node.dataset.at || 0);
        const span = Number(node.dataset.duration || .5);
        const progress = ease((localTime - at) / span);
        const from = node.dataset.from || 'up';
        let transform = 'none';
        let clipPath = 'inset(0 0 0 0)';
        if (from === 'up') transform = 'translate3d(0,' + ((1 - progress) * 44) + 'px,0)';
        if (from === 'left') transform = 'translate3d(' + ((1 - progress) * -60) + 'px,0,0)';
        if (from === 'clip') clipPath = 'inset(0 ' + ((1 - progress) * 100) + '% 0 0)';
        node.style.opacity = String(progress);
        node.style.transform = transform;
        node.style.clipPath = clipPath;
      };

      window.renderAt = (seconds) => {
        const time = clamp(Number(seconds), 0, ${duration});
        const focus = focusAt(time);
        blocks.forEach((block) => {
          block.style.top = (focus.top ?? ${STAGE.top}) + 'px';
          block.style.height = (focus.height ?? 0) + 'px';
          block.style.opacity = String(focus.opacity);
        });
        // Only a block spanning more than one track gets cut by the gaps.
        const spread = clamp(((focus.height ?? 0) - TRACK_HEIGHT * 1.15) / (TRACK_HEIGHT * .5));
        gaps.forEach((gap) => { gap.style.opacity = String(spread); });
        scenes.forEach((scene, index) => {
          const start = Number(scene.dataset.start);
          const local = time - start;
          const arrival = start === 0 ? 1 : clamp(local / .24);
          const visible = time >= start - .24;
          scene.style.opacity = visible ? String(arrival) : '0';
          scene.style.visibility = visible ? 'visible' : 'hidden';
          scene.style.zIndex = String(3 + index);
          scene.querySelectorAll('[data-motion-item]').forEach((node) => applyMotion(node, local));
          // A channel name is paper on blue: it is legible only while the block is under it.
          // The outgoing scene keeps its name on screen through the crossfade, so once the
          // block has left that track the name has to go with it.
          scene.querySelectorAll('[data-home-top]').forEach((node) => {
            const distance = Math.abs((focus.top ?? -9999) - Number(node.dataset.homeTop));
            const onItsTrack = clamp((26 - distance) / 26);
            node.style.opacity = String(Number(node.style.opacity || 0) * onItsTrack);
          });
        });
        axis.style.transform = 'scaleX(' + (time / ${duration}) + ')';
        document.body.dataset.renderTime = time.toFixed(4);
        return true;
      };
      window.renderAt(0);
    })();`;
}
