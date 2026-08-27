export async function runStoryBrowserQa(page, { series, story, expectedAssetUrl }) {
  return page.evaluate(({ expectedText, safeZone, storyId, expectedAsset, expectedAssetUrl }) => {
    const rect = (value) => ({
      x: value.x,
      y: value.y,
      width: value.width,
      height: value.height,
      top: value.top,
      right: value.right,
      bottom: value.bottom,
      left: value.left
    });
    const canvas = document.querySelector('.story');
    const canvasRect = rect(canvas.getBoundingClientRect());
    const contentNodes = [...document.querySelectorAll('[data-content]')];
    const typedNodes = [...document.querySelectorAll('[data-type]')];
    const visibleText = contentNodes.map((node) => node.textContent.trim());
    const type = typedNodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        className: node.className,
        family: style.fontFamily,
        size: Number.parseFloat(style.fontSize),
        style: style.fontStyle,
        weight: style.fontWeight,
        rect: rect(node.getBoundingClientRect())
      };
    });

    const safeRect = {
      left: safeZone.left,
      top: safeZone.top,
      right: 1080 - safeZone.right,
      bottom: 1920 - safeZone.bottom
    };
    const safeZoneFailures = type
      .filter(({ rect: item }) => item.left < safeRect.left || item.right > safeRect.right || item.top < safeRect.top || item.bottom > safeRect.bottom)
      .map(({ className, rect: item }) => ({ className, rect: item }));

    const allowedColors = new Set([
      'rgb(16, 16, 16)',
      'rgb(244, 241, 233)',
      'rgb(21, 70, 232)',
      'rgba(21, 70, 232, 0.106)',
      'rgba(21, 70, 232, 0.105)',
      'rgba(0, 0, 0, 0)',
      'none'
    ]);
    const colorValues = [...document.querySelectorAll('[data-color]')].flatMap((node) => {
      const style = getComputedStyle(node);
      const values = [style.color, style.backgroundColor];
      if (style.borderTopStyle !== 'none' && Number.parseFloat(style.borderTopWidth) > 0) values.push(style.borderTopColor);
      if (style.borderBottomStyle !== 'none' && Number.parseFloat(style.borderBottomWidth) > 0) values.push(style.borderBottomColor);
      return values;
    }).filter((value) => value && value !== 'rgba(0, 0, 0, 0)');
    const unapprovedColors = [...new Set(colorValues.filter((value) => !allowedColors.has(value)))];

    const visualNodes = [...document.querySelectorAll('.story, .composition, [data-color]')];
    const effectFailures = visualNodes.filter((node) => {
      const style = getComputedStyle(node);
      return style.boxShadow !== 'none' || style.filter !== 'none' || style.backgroundImage !== 'none';
    }).map((node) => node.className);

    const photo = document.querySelector('.story-photo');
    const photoCount = document.querySelectorAll('.story-photo').length;
    const expectedPhotoCount = storyId === 'story-07' ? 1 : 0;
    const photoSourceExact = photo ? photo.src === expectedAssetUrl : expectedPhotoCount === 0;
    const photoDimensionsExact = photo
      ? photo.naturalWidth === expectedAsset.width && photo.naturalHeight === expectedAsset.height
      : expectedPhotoCount === 0;
    const photoComposition = document.querySelector('.photo-composition');
    const photoCopy = document.querySelector('.photo-copy');
    const photoLife = document.querySelector('.photo-life');
    const photoSlots = photoCopy && photoLife ? {
      copy: rect(photoCopy.getBoundingClientRect()),
      life: rect(photoLife.getBoundingClientRect())
    } : null;
    const photoSlotPolicyExact = storyId !== 'story-07' || Boolean(
      photoComposition &&
      photoComposition.children.length === 3 &&
      photoSlots &&
      photoSlots.copy.left >= safeRect.left &&
      photoSlots.copy.top >= safeRect.top &&
      photoSlots.copy.bottom <= 560 &&
      photoSlots.life.left >= safeRect.left &&
      photoSlots.life.top >= 1500 &&
      photoSlots.life.bottom <= safeRect.bottom
    );

    const emojiPattern = /\p{Extended_Pictographic}/u;
    const svgNodes = [...document.querySelectorAll('svg')];
    const checks = {
      canvasExact: canvasRect.width === 1080 && canvasRect.height === 1920,
      noOverflow: document.documentElement.scrollWidth === 1080 && document.documentElement.scrollHeight === 1920,
      textExact: JSON.stringify(visibleText) === JSON.stringify(expectedText),
      fontsLoaded: document.fonts.status === 'loaded' && type.every(({ family, size, style }, index) => {
        const name = family.includes('Inter Production') ? 'Inter Production' : 'Cormorant Garamond Production';
        return document.fonts.check(`${style} 400 ${size}px "${name}"`, typedNodes[index].textContent);
      }),
      onlyApprovedFonts: type.every(({ family }) => family.includes('Inter Production') || family.includes('Cormorant Garamond Production')),
      fontFloor: type.every(({ size }) => size >= 29),
      textInsideSafeZone: safeZoneFailures.length === 0,
      approvedColorsOnly: unapprovedColors.length === 0,
      photoPolicyExact: photoCount === expectedPhotoCount && photoSourceExact && photoDimensionsExact,
      protectedFacesClear: photoSlotPolicyExact,
      noEmoji: visibleText.every((value) => !emojiPattern.test(value)),
      noUnapprovedEffects: effectFailures.length === 0,
      noUnapprovedElements: document.querySelectorAll('button, a, input, video, canvas, [data-icon], [class*="icon"], svg use, svg polygon').length === 0,
      svgPolicyExact: svgNodes.every((node) => node.hasAttribute('data-qa-svg')),
      noPublishingControls: document.querySelectorAll('[href], [contenteditable], form').length === 0
    };

    return {
      checks,
      details: {
        canvasRect,
        safeRect,
        visibleText,
        type,
        safeZoneFailures,
        unapprovedColors,
        effectFailures,
        photo: photo ? {
          naturalWidth: photo.naturalWidth,
          naturalHeight: photo.naturalHeight,
          objectPosition: getComputedStyle(photo).objectPosition
        } : null,
        photoSlots,
        svgCount: svgNodes.length
      }
    };
  }, {
    expectedText: story.text,
    safeZone: series.safeZone,
    storyId: story.id,
    expectedAsset: { width: series.photoAsset.width, height: series.photoAsset.height },
    expectedAssetUrl
  });
}
