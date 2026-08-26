import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const factoryRoot = path.resolve(scriptsDirectory, '..');
const outputDirectory = path.join(factoryRoot, 'output');
const summaryPath = path.join(outputDirectory, 'qa-summary.json');
const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));

if (!summary.passed || summary.posts.length === 0) {
  throw new Error('Pages build requires a successful renderer QA summary with at least one post.');
}

const reports = [];
for (const post of summary.posts) {
  await fs.access(path.join(factoryRoot, post.png));
  await fs.access(path.join(outputDirectory, post.qa));
  reports.push(JSON.parse(await fs.readFile(path.join(outputDirectory, post.qa), 'utf8')));
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

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>alexsmoley Instagram factory output</title>
  <style>
    body{margin:0;padding:48px;font:16px/1.5 system-ui,sans-serif;color:#101010;background:#f4f1e9}
    main{max-width:960px;margin:auto}article{display:grid;grid-template-columns:270px 1fr;gap:32px;align-items:start;margin:32px 0}
    img{display:block;width:270px;height:360px;object-fit:cover}a{color:#1546e8}code{word-break:break-all}
  </style>
</head>
<body><main><h1>Rendered Instagram posts</h1>${cards}<p><a href="./qa-summary.json">Pipeline QA summary</a> · <a href="./pipeline-report.md">Human-readable report</a></p></main></body>
</html>`;

const reportMarkdown = `# Instagram renderer pipeline report

**Status:** PASS

- Approved posts rendered: ${summary.approvedPostCount}
- Canvas: 1080×1440
- Pages base URL: ${summary.pagesBaseUrl}
- Social publishing: not included and not executed

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
