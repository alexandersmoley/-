export async function runBrowserQa(page, post) {
  const expectedText = [
    post.content.intro.roman,
    post.content.intro.italic,
    post.content.bridge,
    ...post.content.proof,
    ...post.content.future
  ];

  return page.evaluate(({ expectedText, protectedZones, photoHeight, expectedAsset }) => {
    const rectangle = (rect) => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left
    });
    const poster = document.querySelector('.poster');
    const photo = document.querySelector('.source-photo');
    const bridge = document.querySelector('.bridge');
    const shield = document.querySelector('.figure-shield');
    const intro = document.querySelector('.intro');
    const grid = document.querySelector('.system-grid');
    const contentNodes = [...document.querySelectorAll('[data-content]')];
    const typedNodes = [...document.querySelectorAll('.intro-roman, .intro-italic, .bridge, .proof, .future')];
    const visualNodes = [...document.querySelectorAll('.poster, .system-zone, .intro, .bridge, .proof, .future')];
    const posterRect = rectangle(poster.getBoundingClientRect());
    const bridgeRect = rectangle(bridge.getBoundingClientRect());
    const introRect = rectangle(intro.getBoundingClientRect());
    const gridRect = rectangle(grid.getBoundingClientRect());
    const visibleText = contentNodes.map((node) => node.textContent.trim());
    const type = typedNodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        className: node.className,
        family: style.fontFamily,
        size: Number.parseFloat(style.fontSize),
        style: style.fontStyle,
        weight: style.fontWeight,
        rect: rectangle(node.getBoundingClientRect())
      };
    });

    const intersects = (a, b) => !(
      a.right <= b.x ||
      a.left >= b.x + b.width ||
      a.bottom <= b.y ||
      a.top >= b.y + b.height
    );

    const introProtectedIntersections = protectedZones
      .filter((zone) => intersects(introRect, zone))
      .map((zone) => zone.name);

    const visualEffects = visualNodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        className: node.className,
        boxShadow: style.boxShadow,
        backgroundImage: style.backgroundImage,
        filter: style.filter
      };
    });

    const checks = {
      canvasExact: posterRect.width === 1080 && posterRect.height === 1440,
      noOverflow: document.documentElement.scrollWidth === 1080 && document.documentElement.scrollHeight === 1440,
      textExact: JSON.stringify(visibleText) === JSON.stringify(expectedText),
      fontsLoaded: document.fonts.status === 'loaded' &&
        document.fonts.check('34px "Inter Production"') &&
        document.fonts.check('50px "Cormorant Garamond Production"'),
      onlyApprovedFonts: type.every(({ family }) =>
        family.includes('Inter Production') || family.includes('Cormorant Garamond Production')
      ),
      fontFloor: type.every(({ size }) => size >= 31),
      sourceDimensions: photo.naturalWidth === expectedAsset.width && photo.naturalHeight === expectedAsset.height,
      bridgeCrossesBoundary: bridgeRect.top < photoHeight && bridgeRect.bottom > photoHeight,
      bridgeIsDominant: Number.parseFloat(getComputedStyle(bridge).fontSize) >
        Math.max(...typedNodes.filter((node) => node !== bridge).map((node) => Number.parseFloat(getComputedStyle(node).fontSize))),
      figureShieldAboveBridge: Number.parseInt(getComputedStyle(shield).zIndex, 10) >
        Number.parseInt(getComputedStyle(bridge).zIndex, 10),
      introAvoidsProtectedZones: introProtectedIntersections.length === 0,
      gridStartsInSystemZone: gridRect.top >= photoHeight,
      gridIsSingleSystemElement: document.querySelectorAll('.system-grid').length === 1 &&
        document.querySelectorAll('.system-grid path').length === 1,
      textInsideCanvas: type.every(({ rect }) => rect.left >= 0 && rect.right <= 1080 && rect.top >= 0 && rect.bottom <= 1440),
      noUnapprovedEffects: visualEffects.every(({ boxShadow, backgroundImage, filter }) =>
        boxShadow === 'none' && backgroundImage === 'none' && filter === 'none'
      ),
      noDecorativeControls: poster.querySelectorAll('button, a, input').length === 0
    };

    return {
      checks,
      details: {
        posterRect,
        bridgeRect,
        gridRect,
        visibleText,
        type,
        sourceDimensions: { width: photo.naturalWidth, height: photo.naturalHeight },
        introProtectedIntersections,
        shieldClipPath: getComputedStyle(shield).clipPath,
        visualEffects
      }
    };
  }, {
    expectedText,
    protectedZones: post.qa.protectedZones,
    photoHeight: post.layout.photoHeight,
    expectedAsset: { width: post.asset.width, height: post.asset.height }
  });
}

export function failedChecks(report) {
  return Object.entries(report.checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
}
