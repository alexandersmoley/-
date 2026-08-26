import fs from 'node:fs/promises';
import { listJsonFiles } from './files.mjs';

export async function loadApprovedPosts({ postsDirectory, validate }) {
  const files = await listJsonFiles(postsDirectory);
  const posts = [];

  for (const file of files) {
    const post = JSON.parse(await fs.readFile(file, 'utf8'));
    validate(post, file);
    if (post.status === 'approved-for-render') posts.push({ post, sourcePath: file });
  }

  if (posts.length === 0) {
    throw new Error(`No structured posts with status approved-for-render in ${postsDirectory}`);
  }

  return posts;
}
