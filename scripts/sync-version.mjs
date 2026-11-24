import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid package.json version: ${version}`);
}

const manifestPath = path.join(root, 'extension', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.version !== version) {
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const indexPath = path.join(root, 'docs', 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');
const updatedHtml = indexHtml
  .replace(
    /(<p class="version-pill">)v[^<\s]+( · Manifest V3 · MIT<\/p>)/,
    `$1v${version}$2`,
  )
  .replace(
    /(<span>New Tab-Dashboard )v[^<\s]+( · MIT License<\/span>)/,
    `$1v${version}$2`,
  );

if (updatedHtml !== indexHtml) {
  writeFileSync(indexPath, updatedHtml);
}

if (process.env.npm_lifecycle_event === 'version') {
  execFileSync('git', ['add', 'extension/manifest.json', 'docs/index.html'], {
    cwd: root,
    stdio: 'inherit',
  });
}

console.log(`Synced version ${version}`);
