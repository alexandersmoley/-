import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../renderer/lib/files.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(scriptsDirectory, '..');
const inboxDirectory = path.join(factoryRoot, 'assets', 'inbox');
const photosDirectory = path.join(factoryRoot, 'assets', 'photos');
const indexPath = path.join(inboxDirectory, 'index.json');

const usage = `Usage: node scripts/promote-media.mjs <inbox-file> <new-name> [--force]

Moves one file out of assets/inbox/ into assets/photos/ under a proper name,
drops its entry from assets/inbox/index.json and removes the inbox original.

  <inbox-file>  file name inside assets/inbox/, e.g. IMG_0581.jpg
  <new-name>    target name, e.g. alexsmoley-photo-desk.jpg
                the extension may be omitted and is then taken from the source
  --force       overwrite an existing file in assets/photos/
`;

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseArguments(argv) {
  const positional = argv.filter((value) => !value.startsWith('--'));
  const force = argv.includes('--force');
  if (positional.length !== 2) throw new Error(usage);
  return { source: positional[0], target: positional[1], force };
}

function resolveTargetName(target, sourceExtension) {
  const extension = path.extname(target) || sourceExtension;
  const stem = path.basename(target, path.extname(target));
  if (!namePattern.test(stem)) {
    throw new Error(`Target name must be lowercase kebab-case, got: ${stem}`);
  }
  return `${stem}${extension.toLowerCase()}`;
}

async function main() {
  const { source, target, force } = parseArguments(process.argv.slice(2));

  if (path.basename(source) !== source) throw new Error(`Pass a bare file name inside assets/inbox/, got: ${source}`);
  const sourcePath = path.join(inboxDirectory, source);
  try {
    const stats = await fs.stat(sourcePath);
    if (!stats.isFile()) throw new Error('not a file');
  } catch (error) {
    throw new Error(`No such file in assets/inbox/: ${source} (${error.message})`);
  }

  const targetName = resolveTargetName(target, path.extname(source));
  const targetPath = path.join(photosDirectory, targetName);
  let exists = true;
  try {
    await fs.access(targetPath);
  } catch {
    exists = false;
  }
  if (exists && !force) {
    throw new Error(`assets/photos/${targetName} already exists. Pass --force to overwrite.`);
  }

  await fs.mkdir(photosDirectory, { recursive: true });
  await fs.rename(sourcePath, targetPath);

  let removedFromIndex = false;
  try {
    const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    const remaining = index.files.filter((entry) => entry.name !== source);
    removedFromIndex = remaining.length !== index.files.length;
    index.files = remaining;
    index.count = remaining.length;
    index.generatedAt = new Date().toISOString();
    await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // No index yet: the workflow rebuilds it on the next push.
  }

  const sha = await sha256File(targetPath);
  const { size } = await fs.stat(targetPath);
  console.log(`assets/inbox/${source} -> assets/photos/${targetName}`);
  console.log(`  sha256 ${sha}`);
  console.log(`  bytes  ${size}`);
  console.log(`  index  ${removedFromIndex ? 'entry removed' : 'no entry to remove'}`);
  console.log('\nThe inbox original is gone: the file was moved, not copied.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
