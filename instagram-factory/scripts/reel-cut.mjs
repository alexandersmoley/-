// Нарезка talking-head рилса из исходных видео.
//
// Пайплайн из трёх шагов:
//   1. transcribe — достаёт дорожку и расшифровывает её локальным whisper;
//   2. find       — ищет в расшифровке фрагменты по теме и пишет черновой EDL;
//   3. cut        — режет выбранные фрагменты и склеивает вертикальный ролик.
//
// Шаг find даёт черновик, а не финальную нарезку: список нужно открыть,
// выкинуть лишнее и расставить фрагменты в нужном порядке.
//
// Требуется whisper в PATH (openai-whisper, faster-whisper или whisper.cpp
// с совместимым JSON). Команда переопределяется через --whisper-cmd.

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const run = promisify(execFile);

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(scriptsDirectory, '..');
const workRoot = path.join(factoryRoot, 'reels', '.cut');
const audioDirectory = path.join(workRoot, 'audio');
const transcriptDirectory = path.join(workRoot, 'transcripts');
const segmentDirectory = path.join(workRoot, 'segments');

const videoExtensions = new Set(['.mov', '.mp4', '.m4v', '.avi', '.mkv']);

// Морфологию режем по основам: «тариф» ловит и «тарифы», и «тарифов».
const defaultKeywords = [
  'тариф',
  'прайс',
  'цен',
  'стоим',
  'стоит',
  'подписк',
  'ставк',
  'гонорар',
  'бюджет',
  'смет',
  'оплат',
  'платит',
  'дорог',
  'дешев',
  'дешёв',
];

// Instagram отдаёт Reels в 1080×1920, 30 fps.
const canvas = { width: 1080, height: 1920, fps: 30 };
const audioTarget = { sampleRate: 48000, channels: 2, bitrate: '192k' };

function parseArguments(argv) {
  const [command, ...rest] = argv;
  const options = {};
  const positional = [];
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = rest[index + 1];
    if (next === undefined || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return { command, options, positional };
}

function timecode(seconds) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  const fraction = Math.round((seconds - whole) * 10);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}.${fraction}`;
}

async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function listVideos(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && videoExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

async function probeDuration(file) {
  const { stdout } = await run(ffprobeStatic.path, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return Number.parseFloat(stdout.trim());
}

// --- transcribe ---------------------------------------------------------

async function extractAudio(video) {
  const stem = path.basename(video, path.extname(video));
  const target = path.join(audioDirectory, `${stem}.wav`);
  // whisper хочет 16 кГц моно, поэтому дорожка приводится сразу здесь.
  await run(ffmpegPath, [
    '-y',
    '-i',
    video,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-c:a',
    'pcm_s16le',
    target,
  ]);
  return target;
}

async function transcribeAudio(audio, options) {
  const command = String(options['whisper-cmd'] || 'whisper');
  const model = String(options.model || 'medium');
  const language = String(options.language || 'ru');
  await run(
    command,
    [
      audio,
      '--model',
      model,
      '--language',
      language,
      '--task',
      'transcribe',
      '--output_format',
      'json',
      '--output_dir',
      transcriptDirectory,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  return path.join(transcriptDirectory, `${path.basename(audio, '.wav')}.json`);
}

async function commandTranscribe(options) {
  const input = options.input ? path.resolve(String(options.input)) : null;
  if (!input) {
    throw new Error('Нужен --input <папка с исходными видео>');
  }
  await ensureDirectory(audioDirectory);
  await ensureDirectory(transcriptDirectory);

  const videos = await listVideos(input);
  if (videos.length === 0) {
    throw new Error(`В ${input} нет видеофайлов`);
  }

  for (const video of videos) {
    const duration = await probeDuration(video);
    process.stdout.write(`${path.basename(video)} — ${timecode(duration)}, дорожка… `);
    const audio = await extractAudio(video);
    process.stdout.write('расшифровка… ');
    const transcript = await transcribeAudio(audio, options);
    process.stdout.write(`${path.relative(factoryRoot, transcript)}\n`);
  }
}

// --- find ---------------------------------------------------------------

function readKeywords(options) {
  if (!options.keywords || options.keywords === true) {
    return defaultKeywords;
  }
  return String(options.keywords)
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function matchesKeywords(text, keywords) {
  const haystack = text.toLowerCase().replace(/ё/g, 'е');
  return keywords.filter((keyword) => haystack.includes(keyword.replace(/ё/g, 'е')));
}

function mergeSegments(hits, gapSeconds) {
  const merged = [];
  for (const hit of hits) {
    const previous = merged[merged.length - 1];
    if (previous && hit.start - previous.end <= gapSeconds) {
      previous.end = Math.max(previous.end, hit.end);
      previous.text = `${previous.text} ${hit.text}`.trim();
      previous.keywords = [...new Set([...previous.keywords, ...hit.keywords])];
      continue;
    }
    merged.push({ ...hit });
  }
  return merged;
}

function parseTimestamp(value) {
  const match = value.match(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) {
    return null;
  }
  const [, hours, minutes, seconds, millis] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(millis.padEnd(3, '0')) / 1000
  );
}

// Разбор SRT и VTT: блок без стрелки (шапка WEBVTT, NOTE) пропускается,
// номер реплики и cue id игнорируются, разметка вида <c> вырезается.
function parseCues(content) {
  const segments = [];
  for (const block of content.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const arrowIndex = lines.findIndex((line) => line.includes('-->'));
    if (arrowIndex === -1) {
      continue;
    }
    const [left, right] = lines[arrowIndex].split('-->');
    const start = parseTimestamp(left);
    const end = parseTimestamp(right);
    if (start === null || end === null) {
      continue;
    }
    const text = lines
      .slice(arrowIndex + 1)
      .join(' ')
      .replace(/<[^>]*>/g, '')
      .trim();
    if (text) {
      segments.push({ start, end, text });
    }
  }
  return segments;
}

async function loadSegments(file) {
  const content = await fs.readFile(file, 'utf8');
  if (path.extname(file).toLowerCase() === '.json') {
    const transcript = JSON.parse(content);
    return Array.isArray(transcript.segments) ? transcript.segments : [];
  }
  return parseCues(content);
}

// На один исходник может лежать и JSON от whisper, и субтитры из другого
// инструмента. Берём что-то одно, иначе фрагменты задвоятся.
function pickTranscripts(entries) {
  const priority = { '.json': 0, '.srt': 1, '.vtt': 2 };
  const chosen = new Map();
  for (const entry of entries) {
    const extension = path.extname(entry).toLowerCase();
    if (!(extension in priority)) {
      continue;
    }
    const stem = path.basename(entry, path.extname(entry));
    const current = chosen.get(stem);
    if (!current || priority[extension] < priority[path.extname(current).toLowerCase()]) {
      chosen.set(stem, entry);
    }
  }
  return [...chosen.values()].sort();
}

async function commandFind(options) {
  const keywords = readKeywords(options);
  const gapSeconds = Number(options.gap || 2);
  const padBefore = Number(options['pad-before'] || 0.4);
  const padAfter = Number(options['pad-after'] || 0.6);
  const minDuration = Number(options['min-duration'] || 1.5);

  const entries = await fs.readdir(transcriptDirectory, { withFileTypes: true }).catch(() => []);
  const transcripts = pickTranscripts(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(transcriptDirectory, entry.name)),
  );
  if (transcripts.length === 0) {
    throw new Error(
      `Нет расшифровок в ${path.relative(factoryRoot, transcriptDirectory)} — запусти transcribe или положи туда .srt/.vtt`,
    );
  }

  const sourceDirectory = options.input ? path.resolve(String(options.input)) : null;
  const videos = sourceDirectory ? await listVideos(sourceDirectory) : [];
  const videoByStem = new Map(
    videos.map((video) => [path.basename(video, path.extname(video)), video]),
  );

  const clips = [];
  const report = [];

  for (const transcriptPath of transcripts) {
    const stem = path.basename(transcriptPath, path.extname(transcriptPath));
    const segments = await loadSegments(transcriptPath);

    const hits = [];
    for (const segment of segments) {
      const text = String(segment.text || '').trim();
      const matched = matchesKeywords(text, keywords);
      if (matched.length === 0) {
        continue;
      }
      hits.push({
        start: Number(segment.start),
        end: Number(segment.end),
        text,
        keywords: matched,
      });
    }

    const merged = mergeSegments(hits, gapSeconds)
      .map((hit) => ({
        ...hit,
        start: Math.max(0, hit.start - padBefore),
        end: hit.end + padAfter,
      }))
      .filter((hit) => hit.end - hit.start >= minDuration);

    if (merged.length === 0) {
      continue;
    }

    report.push(`\n## ${stem}\n`);
    for (const hit of merged) {
      const source = videoByStem.get(stem) || `${stem} (укажи --input, чтобы подставился путь)`;
      clips.push({
        source: videoByStem.has(stem) ? path.relative(factoryRoot, source) : stem,
        start: Number(hit.start.toFixed(2)),
        end: Number(hit.end.toFixed(2)),
        keywords: hit.keywords,
        text: hit.text,
        use: false,
      });
      report.push(
        `- \`${timecode(hit.start)}–${timecode(hit.end)}\` (${(hit.end - hit.start).toFixed(1)} с, ${hit.keywords.join(', ')})\n  ${hit.text}`,
      );
    }
  }

  if (clips.length === 0) {
    process.stdout.write(`Совпадений нет. Искал: ${keywords.join(', ')}\n`);
    return;
  }

  const edlPath = path.join(workRoot, 'edl.json');
  const reportPath = path.join(workRoot, 'candidates.md');
  await fs.writeFile(
    edlPath,
    `${JSON.stringify({ canvas, keywords, clips }, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    reportPath,
    `# Кандидаты в нарезку\n\nИскал: ${keywords.join(', ')}\n${report.join('\n')}\n`,
    'utf8',
  );

  const total = clips.reduce((sum, clip) => sum + (clip.end - clip.start), 0);
  process.stdout.write(
    `Найдено фрагментов: ${clips.length}, суммарно ${timecode(total)}\n` +
      `Черновик: ${path.relative(factoryRoot, edlPath)}\n` +
      `Читаемый список: ${path.relative(factoryRoot, reportPath)}\n\n` +
      'Открой edl.json, оставь нужные фрагменты, проставь им "use": true и порядок, затем запусти cut.\n',
  );
}

// --- cut ----------------------------------------------------------------

async function cutClip(clip, index) {
  const target = path.join(segmentDirectory, `${String(index).padStart(3, '0')}.mp4`);
  const source = path.resolve(factoryRoot, clip.source);
  const duration = clip.end - clip.start;

  // Кадрируем в вертикаль: увеличиваем по меньшей стороне, лишнее срезаем.
  const videoFilter = [
    `scale=${canvas.width}:${canvas.height}:force_original_aspect_ratio=increase`,
    `crop=${canvas.width}:${canvas.height}`,
    `fps=${canvas.fps}`,
    'setsar=1',
  ].join(',');

  await run(
    ffmpegPath,
    [
      '-y',
      '-ss',
      String(clip.start),
      '-i',
      source,
      '-t',
      String(duration),
      '-vf',
      videoFilter,
      '-af',
      'loudnorm=I=-14:TP=-1.5:LRA=11',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      audioTarget.bitrate,
      '-ar',
      String(audioTarget.sampleRate),
      '-ac',
      String(audioTarget.channels),
      '-movflags',
      '+faststart',
      target,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );

  return target;
}

async function commandCut(options) {
  const edlPath = options.edl
    ? path.resolve(String(options.edl))
    : path.join(workRoot, 'edl.json');
  const edl = JSON.parse(await fs.readFile(edlPath, 'utf8'));
  const clips = (edl.clips || []).filter((clip) => clip.use === true);
  if (clips.length === 0) {
    throw new Error(`В ${path.relative(factoryRoot, edlPath)} нет фрагментов с "use": true`);
  }

  await fs.rm(segmentDirectory, { recursive: true, force: true });
  await ensureDirectory(segmentDirectory);

  const rendered = [];
  for (const [index, clip] of clips.entries()) {
    process.stdout.write(
      `[${index + 1}/${clips.length}] ${clip.source} ${timecode(clip.start)}–${timecode(clip.end)}\n`,
    );
    rendered.push(await cutClip(clip, index));
  }

  // Все фрагменты закодированы одинаково, поэтому склейка идёт без перекодирования.
  const listPath = path.join(segmentDirectory, 'concat.txt');
  await fs.writeFile(
    listPath,
    `${rendered.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n')}\n`,
    'utf8',
  );

  const output = options.output
    ? path.resolve(String(options.output))
    : path.join(workRoot, 'reel.mp4');
  await run(
    ffmpegPath,
    ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-movflags', '+faststart', output],
    { maxBuffer: 64 * 1024 * 1024 },
  );

  const duration = await probeDuration(output);
  process.stdout.write(`\nГотово: ${path.relative(factoryRoot, output)} — ${timecode(duration)}\n`);
  if (duration > 90) {
    process.stdout.write('Внимание: Reels обрезает всё длиннее 90 секунд.\n');
  }
}

// --- entry --------------------------------------------------------------

const usage = `Использование:
  node scripts/reel-cut.mjs transcribe --input <папка> [--model medium] [--language ru] [--whisper-cmd whisper]
  node scripts/reel-cut.mjs find --input <папка> [--keywords тариф,цен] [--gap 2] [--min-duration 1.5]
  node scripts/reel-cut.mjs cut [--edl reels/.cut/edl.json] [--output reels/.cut/reel.mp4]
`;

const { command, options } = parseArguments(process.argv.slice(2));

const commands = {
  transcribe: commandTranscribe,
  find: commandFind,
  cut: commandCut,
};

if (!command || !commands[command]) {
  process.stdout.write(usage);
  process.exit(command ? 1 : 0);
}

try {
  await commands[command](options);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
