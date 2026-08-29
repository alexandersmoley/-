import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { sha256File } from '../renderer/lib/files.mjs';

const run = promisify(execFile);

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(scriptsDirectory, '..');
const repositoryRoot = path.resolve(factoryRoot, '..');
const inboxDirectory = path.join(factoryRoot, 'assets', 'inbox');
const indexPath = path.join(inboxDirectory, 'index.json');

const maxEdge = 2000;
const skipped = new Set(['README.md', 'index.json']);
const heicExtensions = new Set(['.heic', '.heif']);
const rasterExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);

const repositorySlug = process.env.GITHUB_REPOSITORY || 'alexandersmoley/-';
const branch = process.env.INBOX_BRANCH || process.env.GITHUB_REF_NAME || 'claude/tilde-skills-connectors-wkqjmo';

// Pages publishes instagram-factory/output only, so inbox files are served from raw instead.
// The ref spans several path segments when the branch name contains a slash, so it stays unescaped.
const publicUrl = (name) =>
  `https://raw.githubusercontent.com/${repositorySlug}/${branch}/instagram-factory/assets/inbox/${encodeURIComponent(name)}`;

async function listInbox() {
  const entries = await fs.readdir(inboxDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && !skipped.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function freeName(directory, preferred) {
  const extension = path.extname(preferred);
  const stem = path.basename(preferred, extension);
  for (let attempt = 0; ; attempt += 1) {
    const candidate = attempt === 0 ? preferred : `${stem}-${attempt}${extension}`;
    try {
      await fs.access(path.join(directory, candidate));
    } catch {
      return candidate;
    }
  }
}

async function decodeHeic(sourcePath, targetPath) {
  // sharp's prebuilt binaries usually ship without libheif, so fall back to heif-convert.
  try {
    await sharp(sourcePath).jpeg({ quality: 95 }).toFile(targetPath);
    return 'sharp';
  } catch {
    await run('heif-convert', ['-q', '95', sourcePath, targetPath]);
    return 'heif-convert';
  }
}

async function convertHeic(name) {
  const sourcePath = path.join(inboxDirectory, name);
  const targetName = await freeName(inboxDirectory, `${path.basename(name, path.extname(name))}.jpg`);
  const targetPath = path.join(inboxDirectory, targetName);
  const decoder = await decodeHeic(sourcePath, targetPath);
  await fs.unlink(sourcePath);
  console.log(`heic  ${name} -> ${targetName} (${decoder})`);
  return targetName;
}

/**
 * Re-encodes the file in place: applies the EXIF orientation, caps the long edge and
 * drops every metadata block. sharp writes no metadata unless withMetadata() is called,
 * so GPS tags cannot survive this pass.
 */
async function normalise(name) {
  const filePath = path.join(inboxDirectory, name);
  const extension = path.extname(name).toLowerCase();
  const before = await sharp(filePath).metadata();
  const longEdge = Math.max(before.width, before.height);
  const pipeline = sharp(filePath).rotate();
  if (longEdge > maxEdge) {
    pipeline.resize({
      width: before.width >= before.height ? maxEdge : null,
      height: before.height > before.width ? maxEdge : null,
      fit: 'inside',
      withoutEnlargement: true
    });
  }
  if (extension === '.png') pipeline.png({ compressionLevel: 9 });
  else if (extension === '.webp') pipeline.webp({ quality: 90 });
  else pipeline.jpeg({ quality: 90, mozjpeg: true });

  const temporaryPath = `${filePath}.tmp`;
  await pipeline.toFile(temporaryPath);
  await fs.rename(temporaryPath, filePath);

  const after = await sharp(filePath).metadata();
  const resized = longEdge > maxEdge ? `, ${before.width}x${before.height} -> ${after.width}x${after.height}` : '';
  console.log(`clean ${name} (exif stripped${resized})`);
  return after;
}

async function committedAt(name) {
  const relativePath = path.relative(repositoryRoot, path.join(inboxDirectory, name));
  try {
    const { stdout } = await run('git', ['log', '-1', '--format=%cI', '--', relativePath], { cwd: repositoryRoot });
    const value = stdout.trim();
    if (value) return value;
  } catch {
    // Falls through: a file added in this run has no commit of its own yet.
  }
  return null;
}

async function main() {
  await fs.mkdir(inboxDirectory, { recursive: true });

  for (const name of await listInbox()) {
    if (heicExtensions.has(path.extname(name).toLowerCase())) await convertHeic(name);
  }

  const files = [];
  for (const name of await listInbox()) {
    const filePath = path.join(inboxDirectory, name);
    const extension = path.extname(name).toLowerCase();
    const entry = { name, url: publicUrl(name) };

    if (rasterExtensions.has(extension)) {
      const metadata = await normalise(name);
      entry.width = metadata.width;
      entry.height = metadata.height;
    } else {
      // Anything that is not a still image is inventoried but left untouched.
      console.log(`keep  ${name} (not a still image, left as is)`);
      entry.width = null;
      entry.height = null;
    }

    entry.bytes = (await fs.stat(filePath)).size;
    entry.sha256 = await sha256File(filePath);
    entry.committedAt = await committedAt(name);
    files.push(entry);
  }

  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    note: 'Перевалка для медиа с телефона. Отобранные кадры переезжают в assets/photos/ через scripts/promote-media.mjs, остальное удаляется. Файл собирается автоматически.',
    maxEdge,
    count: files.length,
    files
  };
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`\nindex.json: ${files.length} file(s)`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
