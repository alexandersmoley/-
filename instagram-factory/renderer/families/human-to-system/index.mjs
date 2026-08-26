const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const cssUrl = (value) => `url(&quot;${escapeHtml(value)}&quot;)`;

export function renderHumanToSystem({ post, stylesheet, assetUrl, fontUrls }) {
  const { layout, content, designTokens } = post;
  const css = stylesheet
    .replaceAll('__INTER_FONT_URL__', fontUrls.inter)
    .replaceAll('__CORMORANT_REGULAR_URL__', fontUrls.cormorantRegular)
    .replaceAll('__CORMORANT_ITALIC_URL__', fontUrls.cormorantItalic);

  const variables = [
    `--ink:${designTokens.ink}`,
    `--paper:${designTokens.paper}`,
    `--blue:${designTokens.blue}`,
    `--grid:${designTokens.grid}`,
    `--photo-height:${layout.photoHeight}px`,
    `--photo-position:${layout.photoPosition}%`,
    `--intro-x:${layout.intro.x}px`,
    `--intro-y:${layout.intro.y}px`,
    `--intro-width:${layout.intro.width}px`,
    `--bridge-x:${layout.bridge.x}px`,
    `--bridge-y:${layout.bridge.y}px`,
    `--bridge-size:${layout.bridge.size}px`,
    `--grid-offset-top:${layout.gridOffsetTop}px`,
    `--proof-x:${layout.proof.x}px`,
    `--proof-y:${layout.proof.y}px`,
    `--proof-size:${layout.proof.size}px`,
    `--future-x:${layout.future.x}px`,
    `--future-y:${layout.future.y}px`,
    `--future-size:${layout.future.size}px`,
    `--figure-shield-clip:${layout.figureShieldClipPath}`,
    `--source-photo:${cssUrl(assetUrl)}`
  ].join(';');

  const proof = content.proof.map((line) => `<div data-content>${escapeHtml(line)}</div>`).join('');
  const future = content.future.map((line) => `<div data-content>${escapeHtml(line)}</div>`).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, initial-scale=1">
  <title>${escapeHtml(post.id)}</title>
  <style>${css}</style>
</head>
<body style="${variables}">
  <main class="poster" data-post-id="${escapeHtml(post.id)}" data-layout-family="human-to-system">
    <section class="human-zone" aria-label="Фотографическая зона">
      <img class="source-photo" src="${escapeHtml(assetUrl)}" width="${post.asset.width}" height="${post.asset.height}" alt="">
    </section>

    <section class="system-zone" aria-label="Редакционная системная зона">
      <svg class="system-grid" viewBox="0 0 1080 920" aria-hidden="true">
        <path d="M60 0V860 M220 0V860 M380 0V860 M540 0V860 M700 0V860 M860 0V860 M1020 0V860"></path>
      </svg>
    </section>

    <header class="intro">
      <div class="intro-roman" data-content>${escapeHtml(content.intro.roman)}</div>
      <div class="intro-italic" data-content>${escapeHtml(content.intro.italic)}</div>
    </header>

    <div class="bridge" data-content>${escapeHtml(content.bridge)}</div>

    <div class="figure-shield" aria-hidden="true">
      <img src="${escapeHtml(assetUrl)}" width="${post.asset.width}" height="${post.asset.height}" alt="">
    </div>

    <div class="proof">${proof}</div>
    <div class="future">${future}</div>
  </main>
</body>
</html>`;
}
