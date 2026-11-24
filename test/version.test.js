import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('extension manifest and docs match package.json version', () => {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  const docsHtml = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');

  assert.equal(manifest.version, version);
  assert.match(docsHtml, new RegExp(`<p class="version-pill">v${version.replaceAll('.', '\\.')} · Manifest V3 · MIT</p>`));
  assert.match(docsHtml, new RegExp(`<span>New Tab-Dashboard v${version.replaceAll('.', '\\.')} · MIT License</span>`));
});
