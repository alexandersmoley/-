const normalizeText = (value) => String(value)
  .replaceAll('\u00a0', ' ')
  .replace(/\s+/gu, ' ')
  .trim();

// Every scene gets one sample, taken three quarters of the way in, when its motion has
// settled. Fixed timestamps belonged to one 25 s timeline and missed scenes in any other.
export function sceneSampleTimes(reel) {
  return reel.scenes.map((scene) => Number((scene.start + (scene.end - scene.start) * .75).toFixed(2)));
}

export async function runReelBrowserQa(page, { reel }) {
  return page.evaluate(async ({ expectedScenes, safeZone, sampleTimes }) => {
    const normalize = (value) => String(value).replaceAll('\u00a0', ' ').replace(/\s+/gu, ' ').trim();
    const allowedFamilies = ['Inter Production', 'Cormorant Garamond Production'];
    const allowedColors = new Set([
      'rgb(16, 16, 16)',
      'rgb(244, 241, 233)',
      'rgb(21, 70, 232)',
      'rgba(21, 70, 232, 0.105)',
      'rgba(21, 70, 232, 0.106)',
      'rgba(244, 241, 233, 0.17)',
      'rgba(244, 241, 233, 0.55)',
      'rgba(0, 0, 0, 0)',
      'transparent'
    ]);
    const scenes = [...document.querySelectorAll('[data-scene-id]')];
    const sourceText = scenes.map((scene) => ({
      id: scene.dataset.sceneId,
      text: [...scene.querySelectorAll('[data-content]')].map((node) => normalize(node.dataset.sourceText))
    }));
    const typedNodes = [...document.querySelectorAll('[data-content], [data-content] *')];
    const type = typedNodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        className: node.className,
        family: style.fontFamily,
        size: Number.parseFloat(style.fontSize),
        lineHeight: Number.parseFloat(style.lineHeight)
      };
    });
    const colorNodes = [...document.querySelectorAll('[data-color], [data-content] *')];
    const unapprovedColors = [...new Set(colorNodes.flatMap((node) => {
      const style = getComputedStyle(node);
      return [style.color, style.backgroundColor, style.borderTopColor, style.borderBottomColor];
    }).filter((value) => value && !allowedColors.has(value) && value !== 'rgba(0, 0, 0, 0)'))];
    const effectFailures = [...document.querySelectorAll('*')].filter((node) => {
      const style = getComputedStyle(node);
      return style.boxShadow !== 'none' || style.filter !== 'none' || style.backgroundImage !== 'none';
    }).map((node) => node.className || node.tagName);
    const safeRect = {
      left: safeZone.left,
      top: safeZone.top,
      right: 1080 - safeZone.right,
      bottom: 1920 - safeZone.bottom
    };
    const safeZoneFailures = [];
    // A frame that renders nothing passes every other gate, so each sample also has to
    // show at least one line of copy. The blank closing frame got through without this.
    const blankFrames = [];
    for (const time of sampleTimes) {
      window.renderAt(time);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const scene = scenes.find((item) => getComputedStyle(item).visibility === 'visible' && Number.parseFloat(item.style.opacity) > .5);
      if (!scene) {
        safeZoneFailures.push({ time, reason: 'no-visible-scene' });
        blankFrames.push({ time, reason: 'no-visible-scene' });
        continue;
      }
      const readable = [...scene.querySelectorAll('[data-content]')]
        .filter((node) => Number.parseFloat(getComputedStyle(node).opacity) >= .5);
      if (readable.length === 0) blankFrames.push({ time, scene: scene.dataset.sceneId, reason: 'no-visible-copy' });
      for (const node of scene.querySelectorAll('[data-content]')) {
        const style = getComputedStyle(node);
        if (Number.parseFloat(style.opacity) < .5) continue;
        const rect = node.getBoundingClientRect();
        if (rect.left < safeRect.left || rect.right > safeRect.right || rect.top < safeRect.top || rect.bottom > safeRect.bottom) {
          safeZoneFailures.push({
            time,
            scene: scene.dataset.sceneId,
            className: node.className,
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
          });
        }
      }
    }
    window.renderAt(0);
    const sceneTextExact = JSON.stringify(sourceText) === JSON.stringify(expectedScenes);
    const lineHeightByRoleExact = type.filter(({ className }) => String(className).includes('reel-copy')).every(({ className, size, lineHeight }) => {
      const ratio = lineHeight / size;
      if (String(className).includes('display-serif')) return Math.abs(ratio - .94) < .016;
      if (String(className).includes('text-sans')) return Math.abs(ratio - 1.24) < .016;
      return true;
    });
    return {
      checks: {
        canvasExact: document.documentElement.scrollWidth === 1080 && document.documentElement.scrollHeight === 1920,
        sceneCountExact: scenes.length === 6,
        sceneTextExact,
        fontsLoaded: document.fonts.status === 'loaded',
        onlyApprovedFonts: type.every(({ family }) => allowedFamilies.some((approved) => family.includes(approved))),
        mobileReadable: type.filter(({ className }) => String(className).includes('reel-copy')).every(({ size }) => size >= 32),
        lineHeightByRoleExact,
        safeZoneExact: safeZoneFailures.length === 0,
        everySampledFrameCarriesCopy: blankFrames.length === 0,
        approvedColorsOnly: unapprovedColors.length === 0,
        noPhotography: document.querySelectorAll('img, picture, video').length === 0,
        noUnauthorizedElements: document.querySelectorAll('svg, button, a, input, [data-icon], [class*="icon"]').length === 0,
        noUnauthorizedEffects: effectFailures.length === 0,
        renderFunctionAvailable: typeof window.renderAt === 'function'
      },
      details: { sourceText, safeRect, safeZoneFailures, blankFrames, type, unapprovedColors, effectFailures, sampleTimes }
    };
  }, {
    expectedScenes: reel.scenes.map((scene) => ({ id: scene.id, text: scene.text.map(normalizeText) })),
    safeZone: reel.safeZone,
    sampleTimes: sceneSampleTimes(reel)
  });
}

export async function runReelCoverBrowserQa(page, { reel, expectedAssetUrl }) {
  return page.evaluate(({ expectedText, safeZone, expectedAssetUrl, expectedAssetId, expectedAssetWidth, expectedAssetHeight }) => {
    const normalize = (value) => String(value).replaceAll('\u00a0', ' ').replace(/\s+/gu, ' ').trim();
    const nodes = [...document.querySelectorAll('[data-content]')];
    const actualText = nodes.map((node) => normalize(node.dataset.sourceText));
    const safeRect = { left: safeZone.left, top: safeZone.top, right: 1080 - safeZone.right, bottom: 1920 - safeZone.bottom };
    const safeZoneFailures = nodes.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left < safeRect.left || rect.right > safeRect.right || rect.top < safeRect.top || rect.bottom > safeRect.bottom;
    }).map((node) => ({ className: node.className, rect: node.getBoundingClientRect().toJSON() }));
    const images = [...document.querySelectorAll('img')];
    const approvedImages = images.filter((image) => image.dataset.approvedAsset === expectedAssetId);
    // A typographic cover declares no asset: then the correct result is no image at all.
    const approvedPhotoExact = expectedAssetId === null
      ? images.length === 0
      : images.length === 1 && approvedImages.length === 1
        && approvedImages[0].src === expectedAssetUrl
        && approvedImages[0].naturalWidth === expectedAssetWidth
        && approvedImages[0].naturalHeight === expectedAssetHeight;
    return {
      checks: {
        canvasExact: document.documentElement.scrollWidth === 1080 && document.documentElement.scrollHeight === 1920,
        textExact: JSON.stringify(actualText) === JSON.stringify(expectedText),
        safeZoneExact: safeZoneFailures.length === 0,
        fontsLoaded: document.fonts.status === 'loaded',
        headlineWithoutTerminalPeriod: actualText.every((value) => !/[.…]\s*$/u.test(value)),
        approvedPhotoExact,
        noGeneratedMedia: document.querySelectorAll('picture, video, canvas, svg').length === 0
      },
      details: { actualText, safeRect, safeZoneFailures, imageCount: images.length, approvedPhotoExact }
    };
  }, {
    expectedText: reel.cover.text.map(normalizeText),
    safeZone: reel.safeZone,
    expectedAssetUrl,
    expectedAssetId: reel.cover.asset?.id ?? null,
    expectedAssetWidth: reel.cover.asset?.width ?? null,
    expectedAssetHeight: reel.cover.asset?.height ?? null
  });
}
