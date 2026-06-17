import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const outDir = path.join(root, 'dist');
const outFile = path.join(outDir, 'namo-migration-kit.tar.gz');

await mkdir(outDir, { recursive: true });

const includes = [
  '.gitignore',
  'AGENTS.md',
  'README.md',
  'README.en.md',
  'README.ja.md',
  'LOCAL_PREVIEW.md',
  'package.json',
  'package-lock.json',
  'vite.config.mjs',
  'index.html',
  'sample',
  'src',
  'shared',
  'scripts/analyze-sitebuilder-export.mjs',
  'scripts/build-token-admin-zip.mjs',
  'scripts/extract-wordpress-documents.mjs',
  'scripts/gen-dotted-map.mjs',
  'scripts/init-site.mjs',
  'scripts/mirror-document-images.mjs',
  'scripts/optimize-assets-fast.mjs',
  'scripts/package-migration-kit.mjs',
  'scripts/verify-site-package.mjs',
  'scripts/verify-site-preview.mjs',
  'sites/_template',
];

const result = spawnSync(
  'tar',
  ['--exclude=.DS_Store', '-czf', outFile, ...includes],
  { cwd: root, stdio: 'inherit' },
);

if (result.status !== 0) {
  throw new Error(`tar failed with status ${result.status}`);
}

console.log(`Wrote ${path.relative(root, outFile)}`);
