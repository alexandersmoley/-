import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { renderReelCoverHtml, renderReelHtml, stylesheetPathFor } from '../reel-families/index.mjs';
import { runReelBrowserQa, runReelCoverBrowserQa, sceneSampleTimes } from '../lib/reel-browser-qa.mjs';
import { assertFile, listJsonFiles, sha256File } from '../lib/files.mjs';
import { createPostValidator } from '../lib/validate.mjs';

const rendererDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const factoryRoot = path.resolve(rendererDirectory, '..');
const reelsDirectory = path.join(factoryRoot, 'reels');
const schemaPath = path.join(factoryRoot, 'schemas', 'reel.schema.json');
const outputRoot = path.join(factoryRoot, 'output');
const renderRoot = path.join(factoryRoot, '.render', 'reels');
const baseUrl = (process.env.OUTPUT_BASE_URL || 'https://alexandersmoley.github.io/-/').replace(/\/?$/, '/');

const fontPaths = {
  inter: path.join(factoryRoot, 'node_modules', '@fontsource', 'inter', 'files', 'inter-cyrillic-400-normal.woff2'),
  cormorantRegular: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-normal.woff2'),
  cormorantItalic: path.join(factoryRoot, 'node_modules', '@fontsource', 'cormorant-garamond', 'files', 'cormorant-garamond-cyrillic-400-italic.woff2')
};
const ffprobePath = ffprobeStatic.path;
const everyTrue = (checks) => Object.values(checks).every(Boolean);
const sha256Text = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalize = (value) => String(value).replaceAll('\u00a0', ' ').replace(/\s+/gu, ' ').trim();

function extractQuotedList(block) {
  return [...block.matchAll(/^\s*-\s+"([^"]*)"\s*$/gmu)].map((match) => match[1]);
}

function extractApprovedCopy(markdown, sceneCount) {
  const scenes = new Map();
  for (let index = 1; index <= sceneCount; index += 1) {
    const number = String(index).padStart(2, '0');
    const match = markdown.match(new RegExp(`## Scene ${number}[^\\n]*\\n([\\s\\S]*?)(?=\\n## Scene|\\n# Cover)`, 'u'));
    if (!match) throw new Error(`Cannot extract Scene ${number} from reel brief`);
    const textBlock = match[1].match(/(?:- text_on_screen:|Текст:)\n([\s\S]*?)(?=\n(?:- motion_direction:|Motion:))/u);
    if (!textBlock) throw new Error(`Cannot extract approved screen text for Scene ${number}`);
    const copy = extractQuotedList(textBlock[1]);
    if (number === '03') {
      const approvals = [...match[1].matchAll(/"(ОК — (?:тема|текст))"/gu)].map((item) => item[1]);
      copy.push(...new Set(approvals));
    }
    if (number === '06') {
      const loop = match[1].match(/"(ChatGPT → Todoist → тема → ChatGPT → GitHub → Codex → ОК → публикация → аналитика → ChatGPT)"/u);
      const approvals = match[1].match(/"(ОК тема \/ ОК текст \/ ОК дизайн \/ ОК публикация)"/u);
      if (loop) copy.push(loop[1]);
      if (approvals) copy.push(approvals[1]);
    }
    scenes.set(`scene-${number}`, copy);
  }
  const coverMatch = markdown.match(/# Cover[\s\S]*?\nТекст:\n([\s\S]*?)(?=\n\n# Music)/u)
    || markdown.match(/## text_on_cover\n([\s\S]*?)\n\n## cover_direction/u);
  if (!coverMatch) throw new Error('Cannot extract reel cover copy');
  const captionMatch = markdown.match(/# Caption\n\n([\s\S]*?)\n\n# Acceptance criteria/u);
  return {
    scenes,
    cover: extractQuotedList(coverMatch[1]),
    caption: captionMatch ? captionMatch[1].trim().split('\n\n') : []
  };
}

async function loadApprovedReels(validate) {
  const files = await listJsonFiles(reelsDirectory);
  const approved = [];
  for (const sourcePath of files) {
    const reel = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    validate(reel, sourcePath);
    if (reel.status === 'approved-for-render') approved.push({ reel, sourcePath });
  }
  if (approved.length === 0) throw new Error(`No reel with status approved-for-render in ${reelsDirectory}`);
  return approved;
}

function writeWaveHeader(buffer, dataLength, sampleRate, channels = 2, bitsPerSample = 16) {
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  buffer.writeUInt16LE(channels * bitsPerSample / 8, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
}

async function createInstrumentalAudio(targetPath, { durationSeconds, sampleRate, bpm, scenes }) {
  const channels = 2;
  const frameCount = durationSeconds * sampleRate;
  const dataLength = frameCount * channels * 2;
  const buffer = Buffer.allocUnsafe(44 + dataLength);
  writeWaveHeader(buffer, dataLength, sampleRate, channels);
  const chords = [
    [110, 164.81, 220], [98, 146.83, 196], [130.81, 196, 261.63],
    [116.54, 174.61, 233.08], [98, 146.83, 220], [110, 164.81, 246.94]
  ];
  const boundaries = [0, ...scenes.map((scene) => scene.end)];
  // One accent per scene, on the beat where that scene's closing line lands.
  const approvalAccents = scenes.slice(1).map((scene) => scene.start + (scene.end - scene.start) * .75);
  let noiseState = 0x5a17c9;
  const noise = () => {
    noiseState = (noiseState * 1664525 + 1013904223) >>> 0;
    return (noiseState / 0xffffffff) * 2 - 1;
  };
  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate;
    const sceneIndex = Math.min(5, boundaries.findIndex((boundary, index) => index > 0 && time < boundary) - 1);
    const chord = chords[Math.max(0, sceneIndex)];
    const local = time - boundaries[Math.max(0, sceneIndex)];
    const sceneLength = boundaries[Math.max(0, sceneIndex) + 1] - boundaries[Math.max(0, sceneIndex)];
    const envelope = Math.min(1, local / .45, (sceneLength - local) / .45);
    const pad = chord.reduce((sum, frequency, index) => (
      sum + Math.sin(Math.PI * 2 * frequency * time + index * .37) * (.052 - index * .008)
    ), 0) * Math.max(0, envelope);
    const beatPosition = (time * bpm / 60) % 1;
    const pulse = beatPosition < .12 ? Math.sin(Math.PI * 2 * 74 * beatPosition) * Math.exp(-beatPosition * 27) * .12 : 0;
    const tickPosition = (time * bpm / 30) % 1;
    const tick = tickPosition < .035 ? noise() * Math.exp(-tickPosition * 75) * .022 : 0;
    const transitionDistance = Math.min(...boundaries.slice(1, -1).map((boundary) => Math.abs(time - boundary)));
    const transition = transitionDistance < .16 ? Math.sin(Math.PI * 2 * 52 * time) * (1 - transitionDistance / .16) * .1 : 0;
    const approvalDistance = Math.min(...approvalAccents.map((accent) => Math.abs(time - accent)));
    const approval = approvalDistance < .13 ? Math.sin(Math.PI * 2 * 112 * time) * (1 - approvalDistance / .13) * .16 : 0;
    const left = Math.max(-.92, Math.min(.92, pad + pulse + tick + transition + approval));
    const right = Math.max(-.92, Math.min(.92, pad * .96 + pulse + tick * .7 + transition + approval));
    buffer.writeInt16LE(Math.round(left * 32767), 44 + frame * 4);
    buffer.writeInt16LE(Math.round(right * 32767), 46 + frame * 4);
  }
  await fs.writeFile(targetPath, buffer);
}

async function runProcess(command, args, options = {}) {
  const child = spawn(command, args, options);
  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => { stdout += chunk; });
  child.stderr?.on('data', (chunk) => { stderr += chunk; });
  const [code] = await once(child, 'close');
  if (code !== 0) throw new Error(`${path.basename(command)} failed (${code}): ${stderr.slice(-5000)}`);
  return { stdout, stderr };
}

function storyboardGrid(frameCount) {
  const columns = frameCount <= 6 ? 3 : 4;
  return { columns, rows: Math.ceil(frameCount / columns) };
}

async function createStoryboard(frames, targetPath) {
  const thumbWidth = 270;
  const thumbHeight = 480;
  const gap = 30;
  const { columns, rows } = storyboardGrid(frames.length);
  const width = gap * (columns + 1) + thumbWidth * columns;
  const height = gap * (rows + 1) + thumbHeight * rows;
  const composites = [];
  for (let index = 0; index < frames.length; index += 1) {
    const input = await sharp(frames[index]).resize(thumbWidth, thumbHeight, { fit: 'fill' }).png().toBuffer();
    composites.push({ input, left: gap + (index % columns) * (thumbWidth + gap), top: gap + Math.floor(index / columns) * (thumbHeight + gap) });
  }
  await sharp({ create: { width, height, channels: 4, background: '#f4f1e9' } }).composite(composites).png({ compressionLevel: 9 }).toFile(targetPath);
  return { width, height };
}

async function probeVideo(videoPath) {
  const { stdout } = await runProcess(ffprobePath, [
    '-v', 'error', '-show_entries',
    'format=duration:stream=index,codec_type,codec_name,width,height,avg_frame_rate,sample_rate,channels',
    '-of', 'json', videoPath
  ]);
  return JSON.parse(stdout);
}

async function renderReel({ browser, reel, sourcePath, stylesheet }) {
  const outputDirectory = path.join(outputRoot, reel.id);
  const renderDirectory = path.join(renderRoot, reel.id);
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(renderDirectory, { recursive: true });
  const contentSourcePath = path.join(factoryRoot, reel.contentSource.path);
  // A reel may close on an approved portrait or on type alone. Only pin one when declared.
  const photoAssetPath = reel.photoAsset ? path.join(factoryRoot, reel.photoAsset.path) : null;
  if (photoAssetPath) await assertFile(photoAssetPath, 'Approved Reel closing photo');
  const markdownBefore = await fs.readFile(contentSourcePath, 'utf8');
  const approvedCopy = extractApprovedCopy(markdownBefore, reel.scenes.length);
  const contentShaBefore = await sha256File(contentSourcePath);
  const captionBefore = reel.caption.join('\n\n');
  const sourceCopyExact = reel.scenes.every((scene) => JSON.stringify(scene.text) === JSON.stringify(approvedCopy.scenes.get(scene.id)));
  const coverCopyExact = JSON.stringify(reel.cover.text) === JSON.stringify(approvedCopy.cover);
  const captionSourceExact = captionBefore === approvedCopy.caption.join('\n\n');
  const fontUrls = Object.fromEntries(Object.entries(fontPaths).map(([key, value]) => [key, pathToFileURL(value).href]));
  const photoAssetUrl = photoAssetPath ? pathToFileURL(photoAssetPath).href : null;

  const html = renderReelHtml({ reel, stylesheet, fontUrls, photoAssetUrl });
  const coverHtml = renderReelCoverHtml({ reel, stylesheet, fontUrls });
  const htmlPath = path.join(renderDirectory, 'reel.html');
  const coverHtmlPath = path.join(renderDirectory, 'cover.html');
  const audioPath = path.join(renderDirectory, 'instrumental.wav');
  const videoPath = path.join(outputDirectory, 'preview.mp4');
  const coverPath = path.join(outputDirectory, 'cover.png');
  const storyboardPath = path.join(outputDirectory, 'storyboard.png');
  await Promise.all([fs.writeFile(htmlPath, html), fs.writeFile(coverHtmlPath, coverHtml)]);
  await createInstrumentalAudio(audioPath, {
    durationSeconds: reel.canvas.durationSeconds,
    sampleRate: reel.audio.sampleRate,
    bpm: reel.audio.bpm,
    scenes: reel.scenes
  });

  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; });
  const browserQa = await runReelBrowserQa(page, { reel, photoAssetUrl });
  if (!everyTrue(browserQa.checks)) {
    throw new Error(`Reel browser QA failed: ${Object.entries(browserQa.checks).filter(([, value]) => !value).map(([key]) => key).join(', ')}\n${JSON.stringify(browserQa.details, null, 2)}`);
  }

  const ffmpeg = spawn(ffmpegPath, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(reel.canvas.fps), '-i', 'pipe:0',
    '-i', audioPath,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(reel.canvas.fps),
    '-c:a', 'aac', '-b:a', '192k', '-ar', String(reel.audio.sampleRate),
    '-t', String(reel.canvas.durationSeconds), '-movflags', '+faststart', videoPath
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffmpegError = '';
  ffmpeg.stderr.on('data', (chunk) => { ffmpegError += chunk; });
  const sampleTimes = sceneSampleTimes(reel);
  const sampleFrames = new Map(sampleTimes.map((time) => [Math.round(time * reel.canvas.fps), time]));
  const storyboardFrames = [];
  const frameHashes = [];
  const totalFrames = reel.canvas.durationSeconds * reel.canvas.fps;
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const time = frame / reel.canvas.fps;
    await page.evaluate((value) => window.renderAt(value), time);
    const png = await page.screenshot({ type: 'png', animations: 'disabled' });
    if (sampleFrames.has(frame)) {
      storyboardFrames.push(png);
      frameHashes.push(sha256Text(png));
      // The storyboard tiles are 270px wide. Typography defects do not survive that
      // reduction, so each sampled frame is also kept at full size for review.
      await fs.writeFile(path.join(outputDirectory, `frame-${String(storyboardFrames.length).padStart(2, '0')}.png`), png);
    }
    if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
    if ((frame + 1) % 150 === 0) console.log(`Rendered reel frames: ${frame + 1}/${totalFrames}`);
  }
  ffmpeg.stdin.end();
  const [ffmpegCode] = await once(ffmpeg, 'close');
  await page.close();
  if (ffmpegCode !== 0) throw new Error(`ffmpeg failed (${ffmpegCode}): ${ffmpegError.slice(-5000)}`);
  const storyboardDimensions = await createStoryboard(storyboardFrames, storyboardPath);
  const expectedGrid = storyboardGrid(storyboardFrames.length);
  const expectedStoryboard = {
    width: 30 * (expectedGrid.columns + 1) + 270 * expectedGrid.columns,
    height: 30 * (expectedGrid.rows + 1) + 480 * expectedGrid.rows
  };

  const coverPage = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await coverPage.goto(pathToFileURL(coverHtmlPath).href, { waitUntil: 'load' });
  await coverPage.evaluate(async () => { await document.fonts.ready; });
  const coverBrowserQa = await runReelCoverBrowserQa(coverPage, { reel });
  await coverPage.screenshot({ path: coverPath, type: 'png', animations: 'disabled' });
  await coverPage.close();

  const probe = await probeVideo(videoPath);
  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams.find((stream) => stream.codec_type === 'audio');
  const duration = Number(probe.format.duration);
  const contentShaAfter = await sha256File(contentSourcePath);
  const photoAssetMetadata = photoAssetPath ? await sharp(photoAssetPath).metadata() : null;
  const checks = {
    structuredReelValid: true,
    approvedForRender: reel.status === 'approved-for-render',
    publishDisabled: reel.publish === false,
    sceneCountWithinBrief: reel.scenes.length >= 5 && reel.scenes.length <= 8,
    timelineExact: reel.scenes[0].start === 0
      && reel.scenes.at(-1).end === reel.canvas.durationSeconds
      && reel.scenes.every((scene, index) => index === 0 || scene.start === reel.scenes[index - 1].end),
    contentSourceChecksumExact: contentShaBefore === reel.contentSource.sha256,
    contentSourceUnchanged: contentShaBefore === contentShaAfter,
    sourceCopyExact,
    coverCopyExact,
    captionSourceExact,
    captionChecksumExact: sha256Text(captionBefore) === reel.captionSha256,
    browserQaPassed: everyTrue(browserQa.checks),
    coverBrowserQaPassed: everyTrue(coverBrowserQa.checks),
    mp4DimensionsExact: videoStream?.width === 1080 && videoStream?.height === 1920,
    frameRateExact: videoStream?.avg_frame_rate === '30/1',
    durationWithinBrief: duration >= reel.canvas.durationSeconds - 1 && duration <= reel.canvas.durationSeconds + .05,
    audioStreamPresent: audioStream?.codec_type === 'audio' && Number(audioStream.channels) === 2,
    musicOnlyConfiguration: reel.audio.mode === 'temporary-instrumental-guide'
      && reel.audio.voiceOver === false
      && reel.audio.talkingHead === false
      && reel.audio.bpm >= 100
      && reel.audio.bpm <= 120,
    motionFramesDistinct: new Set(frameHashes).size === sampleTimes.length,
    storyboardCreated: storyboardDimensions.width === expectedStoryboard.width
      && storyboardDimensions.height === expectedStoryboard.height,
    coverDimensionsExact: (await sharp(coverPath).metadata()).width === 1080 && (await sharp(coverPath).metadata()).height === 1920,
    photoAssetChecksumExact: photoAssetPath ? await sha256File(photoAssetPath) === reel.photoAsset.sha256 : true,
    photoAssetDimensionsExact: photoAssetPath
      ? photoAssetMetadata.width === reel.photoAsset.width && photoAssetMetadata.height === reel.photoAsset.height
      : true
  };
  const report = {
    pipelineVersion: 1,
    reelId: reel.id,
    source: path.relative(factoryRoot, sourcePath),
    generatedAt: new Date().toISOString(),
    passed: everyTrue(checks),
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    integrity: {
      contentSource: reel.contentSource.path,
      contentSha256: contentShaAfter,
      captionSha256: sha256Text(captionBefore)
    },
    media: {
      preview: { path: path.relative(factoryRoot, videoPath), url: `${baseUrl}${reel.id}/preview.mp4`, sha256: await sha256File(videoPath), duration, fps: videoStream?.avg_frame_rate },
      cover: { path: path.relative(factoryRoot, coverPath), url: `${baseUrl}${reel.id}/cover.png`, sha256: await sha256File(coverPath), width: 1080, height: 1920 },
      storyboard: { path: path.relative(factoryRoot, storyboardPath), url: `${baseUrl}${reel.id}/storyboard.png`, sha256: await sha256File(storyboardPath), ...storyboardDimensions },
      audio: {
        codec: audioStream?.codec_name,
        sampleRate: audioStream?.sample_rate,
        channels: audioStream?.channels,
        mode: reel.audio.mode,
        bpm: reel.audio.bpm,
        replacementNote: 'Replace guide before publishing with a licensed instrumental electronic track at 100–120 BPM, no vocals'
      }
    },
    browserQa,
    coverBrowserQa,
    probe
  };
  await fs.writeFile(path.join(outputDirectory, 'reel.qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, 'qa-summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) throw new Error(`Reel QA failed: ${report.failedChecks.join(', ')}`);
  return report;
}

async function main() {
  await Promise.all([
    assertFile(schemaPath, 'Reel schema'),
    assertFile(ffmpegPath, 'ffmpeg'),
    assertFile(ffprobePath, 'ffprobe'),
    ...Object.entries(fontPaths).map(([name, filePath]) => assertFile(filePath, `Font ${name}`))
  ]);
  const validate = await createPostValidator(schemaPath);
  const approved = await loadApprovedReels(validate);
  const launchOptions = { headless: true, args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--font-render-hinting=none'] };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launchOptions);
  try {
    for (const item of approved) {
      const stylesheet = await fs.readFile(stylesheetPathFor(item.reel), 'utf8');
      await renderReel({ browser, stylesheet, ...item });
    }
  } finally {
    await browser.close();
  }
  console.log(`Rendered ${approved.length} Reel(s). All QA gates passed.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
