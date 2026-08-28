import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(scriptsDirectory, '..');
const outputDirectory = path.join(factoryRoot, 'output');
const summaryPath = path.join(outputDirectory, 'qa-summary.json');
const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
const storySummaryPath = path.join(outputDirectory, 'about-me-stories', 'qa-summary.json');
const carouselSummaryPath = path.join(outputDirectory, 'automation-day-carousel', 'qa-summary.json');
const pinnedIntroV2SummaryPath = path.join(outputDirectory, 'pinned-intro-carousel-v2', 'qa-summary.json');
const reelSummaryPath = path.join(outputDirectory, 'chatgpt-not-a-content-factory-reel', 'qa-summary.json');

if (!summary.passed || summary.posts.length === 0) {
  throw new Error('Pages build requires a successful renderer QA summary with at least one post.');
}

const reports = [];
for (const post of summary.posts) {
  await fs.access(path.join(factoryRoot, post.png));
  await fs.access(path.join(outputDirectory, post.qa));
  reports.push(JSON.parse(await fs.readFile(path.join(outputDirectory, post.qa), 'utf8')));
}

let storySummary = null;
try {
  storySummary = JSON.parse(await fs.readFile(storySummaryPath, 'utf8'));
  if (!storySummary.passed || storySummary.stories.length !== 8) {
    throw new Error('Pages build requires all eight Stories to pass QA.');
  }
  await fs.access(path.join(outputDirectory, 'about-me-stories', 'contact-sheet.png'));
  for (const story of storySummary.stories) await fs.access(path.join(factoryRoot, story.png));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

let carouselSummary = null;
try {
  carouselSummary = JSON.parse(await fs.readFile(carouselSummaryPath, 'utf8'));
  if (!carouselSummary.passed || carouselSummary.slides.length !== 9) {
    throw new Error('Pages build requires all nine carousel slides to pass QA.');
  }
  await fs.access(path.join(outputDirectory, 'automation-day-carousel', 'contact-sheet.png'));
  for (const slide of carouselSummary.slides) await fs.access(path.join(factoryRoot, slide.png));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

let pinnedIntroV2Summary = null;
try {
  pinnedIntroV2Summary = JSON.parse(await fs.readFile(pinnedIntroV2SummaryPath, 'utf8'));
  if (!pinnedIntroV2Summary.passed || pinnedIntroV2Summary.slides.length !== 9 || pinnedIntroV2Summary.covers.length !== 3) {
    throw new Error('Pages build requires all pinned intro v2 covers and slides to pass QA.');
  }
  for (const file of ['contact-sheet.png', 'thumbnail-sheet.png', 'carousel.qa.json']) {
    await fs.access(path.join(outputDirectory, 'pinned-intro-carousel-v2', file));
  }
  for (const cover of pinnedIntroV2Summary.covers) await fs.access(path.join(factoryRoot, cover.png));
  for (const slide of pinnedIntroV2Summary.slides) await fs.access(path.join(factoryRoot, slide.png));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

let reelSummary = null;
try {
  reelSummary = JSON.parse(await fs.readFile(reelSummaryPath, 'utf8'));
  if (!reelSummary.passed || reelSummary.reelId !== 'chatgpt-not-a-content-factory-reel') {
    throw new Error('Pages build requires the approved Reel to pass QA.');
  }
  for (const file of ['preview.mp4', 'cover.png', 'storyboard.png', 'reel.qa.json']) {
    await fs.access(path.join(outputDirectory, reelSummary.reelId, file));
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const cards = summary.posts.map((post) => `
  <article>
    <img src="./${post.id}.png" width="270" height="360" alt="${post.id}">
    <div>
      <h2>${post.id}</h2>
      <p>${post.layoutFamily}${post.benchmark ? ' · benchmark' : ''}</p>
      <p><a href="./${post.id}.png">PNG 1080×1440</a> · <a href="./${post.qa}">QA report</a></p>
    </div>
  </article>`).join('');

const storySection = storySummary ? `
  <section class="stories">
    <h2>About me · Stories</h2>
    <a class="contact-sheet" href="./about-me-stories/contact-sheet.png"><img src="./about-me-stories/contact-sheet.png" width="630" height="534" alt="about-me-stories contact sheet"></a>
    <div class="story-grid">${storySummary.stories.map((story) => `
      <a href="./about-me-stories/${story.id}.png"><img src="./about-me-stories/${story.id}.png" width="135" height="240" alt="${story.id}"></a>`).join('')}</div>
    <p><a href="./about-me-stories/series.qa.json">Stories QA report</a></p>
  </section>` : '';

const carouselSection = carouselSummary ? `
  <section class="carousel-preview">
    <h2>Automation day · Carousel</h2>
    <a class="carousel-contact-sheet" href="./automation-day-carousel/contact-sheet.png"><img src="./automation-day-carousel/contact-sheet.png" width="372" height="480" alt="automation-day-carousel contact sheet"></a>
    <div class="carousel-grid-preview">${carouselSummary.slides.map((slide) => `
      <a href="./automation-day-carousel/${slide.id}.png"><img src="./automation-day-carousel/${slide.id}.png" width="135" height="180" alt="${slide.id}"></a>`).join('')}</div>
    <p><a href="./automation-day-carousel/carousel.qa.json">Carousel QA report</a></p>
  </section>` : '';

const pinnedIntroV2Section = pinnedIntroV2Summary ? `
  <section class="carousel-preview">
    <h2>Pinned intro v2 · Carousel</h2>
    <a class="carousel-cover-sheet" href="./pinned-intro-carousel-v2/thumbnail-sheet.png"><img src="./pinned-intro-carousel-v2/thumbnail-sheet.png" width="765" height="345" alt="pinned-intro-carousel-v2 cover variants"></a>
    <a class="carousel-contact-sheet" href="./pinned-intro-carousel-v2/contact-sheet.png"><img src="./pinned-intro-carousel-v2/contact-sheet.png" width="372" height="480" alt="pinned-intro-carousel-v2 contact sheet"></a>
    <div class="carousel-grid-preview">${pinnedIntroV2Summary.slides.map((slide) => `
      <a href="./pinned-intro-carousel-v2/${slide.id}.png"><img src="./pinned-intro-carousel-v2/${slide.id}.png" width="135" height="180" alt="${slide.id}"></a>`).join('')}</div>
    <p><a href="./pinned-intro-carousel-v2/carousel.qa.json">Pinned intro v2 QA report</a></p>
  </section>` : '';

const reelSection = reelSummary ? `
  <section class="reel-preview">
    <h2>ChatGPT не контент-завод · Reel</h2>
    <div class="reel-media">
      <video controls preload="metadata" poster="./${reelSummary.reelId}/cover.png" width="270" height="480">
        <source src="./${reelSummary.reelId}/preview.mp4" type="video/mp4">
      </video>
      <a href="./${reelSummary.reelId}/storyboard.png"><img src="./${reelSummary.reelId}/storyboard.png" width="425" height="480" alt="Reel storyboard"></a>
    </div>
    <p><a href="./${reelSummary.reelId}/preview.mp4">MP4 1080×1920</a> · <a href="./${reelSummary.reelId}/cover.png">Cover PNG</a> · <a href="./${reelSummary.reelId}/reel.qa.json">Reel QA report</a></p>
  </section>` : '';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>alexsmoley Instagram factory output</title>
  <style>
    body{margin:0;padding:48px;font:16px/1.5 system-ui,sans-serif;color:#101010;background:#f4f1e9}
    main{max-width:1080px;margin:auto}article{display:grid;grid-template-columns:270px 1fr;gap:32px;align-items:start;margin:32px 0}
    article img{display:block;width:270px;height:360px;object-fit:cover}.stories,.carousel-preview,.reel-preview{margin-top:72px}.contact-sheet img{display:block;width:630px;height:534px}.story-grid{display:grid;grid-template-columns:repeat(4,135px);gap:24px;margin-top:32px}.story-grid img{display:block;width:135px;height:240px;object-fit:cover}.carousel-cover-sheet img{display:block;width:765px;height:345px;object-fit:contain;margin-bottom:32px}.carousel-contact-sheet img{display:block;width:372px;height:480px}.carousel-grid-preview{display:grid;grid-template-columns:repeat(5,135px);gap:24px;margin-top:32px}.carousel-grid-preview img{display:block;width:135px;height:180px;object-fit:cover}.reel-media{display:flex;gap:32px;align-items:flex-start}.reel-media video{display:block;width:270px;height:480px;background:#101010}.reel-media img{display:block;width:425px;height:480px;object-fit:contain;background:#deddd7}a{color:#1546e8}code{word-break:break-all}
  </style>
</head>
<body><main><h1>Rendered Instagram posts</h1>${cards}${storySection}${pinnedIntroV2Section}${carouselSection}${reelSection}<p><a href="./qa-summary.json">Pipeline QA summary</a> · <a href="./pipeline-report.md">Human-readable report</a></p></main></body>
</html>`;

const reportMarkdown = `# Instagram renderer pipeline report

**Status:** PASS

- Approved posts rendered: ${summary.approvedPostCount}
- Canvas: 1080×1440
- Pages base URL: ${summary.pagesBaseUrl}
- Social publishing: not included and not executed

${storySummary ? `- Approved Stories rendered: ${storySummary.stories.length}
- Stories canvas: 1080×1920
- Stories QA gates passed: ${Object.values(storySummary.checks).filter(Boolean).length}/${Object.keys(storySummary.checks).length}
- Stories contact sheet: [${storySummary.contactSheet.path}](${storySummary.contactSheet.url})` : '- Stories: no approved series found'}

${carouselSummary ? `- Approved carousel slides rendered: ${carouselSummary.slides.length}
- Carousel canvas: 1080×1440
- Carousel QA gates passed: ${Object.values(carouselSummary.checks).filter(Boolean).length}/${Object.keys(carouselSummary.checks).length}
- Carousel contact sheet: [${carouselSummary.contactSheet.path}](${carouselSummary.contactSheet.url})` : '- Carousels: no approved series found'}

${pinnedIntroV2Summary ? `- Pinned intro v2 slides rendered: ${pinnedIntroV2Summary.slides.length}
- Pinned intro v2 cover directions: ${pinnedIntroV2Summary.covers.length}
- Pinned intro v2 QA gates passed: ${Object.values(pinnedIntroV2Summary.checks).filter(Boolean).length}/${Object.keys(pinnedIntroV2Summary.checks).length}
- Pinned intro v2 contact sheet: [${pinnedIntroV2Summary.contactSheet.path}](${pinnedIntroV2Summary.contactSheet.url})
- Pinned intro v2 cover sheet: [${pinnedIntroV2Summary.thumbnailSheet.path}](${pinnedIntroV2Summary.thumbnailSheet.url})` : '- Pinned intro v2: no approved series found'}

${reelSummary ? `- Approved Reels rendered: 1
- Reel canvas: 1080×1920, ${reelSummary.media.preview.fps} fps
- Reel duration: ${reelSummary.media.preview.duration} seconds
- Reel QA gates passed: ${Object.values(reelSummary.checks).filter(Boolean).length}/${Object.keys(reelSummary.checks).length}
- Reel MP4: [${reelSummary.media.preview.path}](${reelSummary.media.preview.url})
- Reel storyboard: [${reelSummary.media.storyboard.path}](${reelSummary.media.storyboard.url})` : '- Reels: no approved source found'}

${reports.map((report) => `## ${report.postId}

- Layout family: \`${report.layoutFamily}\`
- Variant: \`${report.variant}\`
- Benchmark: ${report.benchmark ? 'yes' : 'no'}
- PNG: [${report.artifacts.png}](${report.artifacts.url})
- SHA-256: \`${report.artifacts.sha256}\`
- Source photo Canva asset: \`${report.integrity.canvaAssetId}\`
- Caption source unchanged: ${report.checks.captionUnchanged ? 'yes' : 'no'}
- QA gates passed: ${Object.values(report.checks).filter(Boolean).length}/${Object.keys(report.checks).length}

${Object.entries(report.checks).map(([name, passed]) => `- [${passed ? 'x' : ' '}] ${name}`).join('\n')}
`).join('\n')}`;

await fs.writeFile(path.join(outputDirectory, 'index.html'), html);
await fs.writeFile(path.join(outputDirectory, '.nojekyll'), '');
await fs.writeFile(path.join(outputDirectory, 'pipeline-report.md'), reportMarkdown);
console.log(`Pages bundle ready: ${summary.posts.length} post(s).`);
