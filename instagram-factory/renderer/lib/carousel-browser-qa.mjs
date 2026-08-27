export async function runCarouselBrowserQa(page, { carousel, slide }) {
  return page.evaluate(({ expectedText, safeZone, mode, slideId }) => {
    const rect = (value) => ({
      x: value.x, y: value.y, width: value.width, height: value.height,
      top: value.top, right: value.right, bottom: value.bottom, left: value.left
    });
    const canvas = document.querySelector('.carousel-slide');
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
      bottom: 1440 - safeZone.bottom
    };
    const safeZoneFailures = type
      .filter(({ rect: item }) => item.left < safeRect.left || item.right > safeRect.right || item.top < safeRect.top || item.bottom > safeRect.bottom)
      .map(({ className, rect: item }) => ({ className, rect: item }));

    const allowedColors = new Set([
      'rgb(16, 16, 16)', 'rgb(244, 241, 233)', 'rgb(21, 70, 232)',
      'rgba(21, 70, 232, 0.106)', 'rgba(21, 70, 232, 0.105)',
      'rgba(0, 0, 0, 0)', 'none'
    ]);
    const colorNodes = [...document.querySelectorAll('[data-color], .blue-italic, .closing-muted, .broken-connection, .closing-divider')];
    const colorValues = colorNodes.flatMap((node) => {
      const style = getComputedStyle(node);
      const values = [style.color, style.backgroundColor];
      if (style.borderTopStyle !== 'none' && Number.parseFloat(style.borderTopWidth) > 0) values.push(style.borderTopColor);
      if (style.borderBottomStyle !== 'none' && Number.parseFloat(style.borderBottomWidth) > 0) values.push(style.borderBottomColor);
      return values;
    }).filter((value) => value && value !== 'rgba(0, 0, 0, 0)');
    const unapprovedColors = [...new Set(colorValues.filter((value) => !allowedColors.has(value)))];

    const visualNodes = [...document.querySelectorAll('.carousel-slide, .composition, [data-color]')];
    const effectFailures = visualNodes.filter((node) => {
      const style = getComputedStyle(node);
      return style.boxShadow !== 'none' || style.filter !== 'none' || style.backgroundImage !== 'none';
    }).map((node) => node.className);

    const arrowPattern = /[→↓]/u;
    const arrowNodes = contentNodes.filter((node) => arrowPattern.test(node.textContent));
    const expectedArrowCount = slideId === 'slide-02' ? 4 : slideId === 'slide-07' ? 7 : 0;
    const functionalArrowPolicy = arrowNodes.length === expectedArrowCount && arrowNodes.every((node) => (
      mode === 'pipeline' && node.classList.contains('functional-arrow') && /^[→↓]$/u.test(node.textContent.trim())
    ));
    const emojiPattern = /\p{Extended_Pictographic}/u;
    const svgNodes = [...document.querySelectorAll('svg')];
    const checks = {
      canvasExact: canvasRect.width === 1080 && canvasRect.height === 1440,
      noOverflow: document.documentElement.scrollWidth === 1080 && document.documentElement.scrollHeight === 1440,
      textExact: JSON.stringify(visibleText) === JSON.stringify(expectedText),
      fontsLoaded: document.fonts.status === 'loaded' && type.every(({ family, size, style }, index) => {
        const name = family.includes('Inter Production') ? 'Inter Production' : 'Cormorant Garamond Production';
        return document.fonts.check(`${style} 400 ${size}px "${name}"`, typedNodes[index].textContent);
      }),
      onlyApprovedFonts: type.every(({ family }) => family.includes('Inter Production') || family.includes('Cormorant Garamond Production')),
      mobileReadable: type.every(({ size }) => size >= 28),
      textInsideSafeZone: safeZoneFailures.length === 0,
      approvedColorsOnly: unapprovedColors.length === 0,
      noPhotography: document.querySelectorAll('img, picture, video').length === 0,
      functionalArrowsOnly: functionalArrowPolicy,
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
        arrowCount: arrowNodes.length,
        svgCount: svgNodes.length
      }
    };
  }, { expectedText: slide.text, safeZone: carousel.safeZone, mode: slide.mode, slideId: slide.id });
}
