import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function sha256File(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function assertFile(filePath, label) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) throw new Error('not a file');
  } catch (error) {
    throw new Error(`${label} is missing: ${filePath} (${error.message})`);
  }
}

export async function listJsonFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}
