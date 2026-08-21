import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const trackerRoot = resolve(packageRoot, '../../../apps/tracker');

const outputFile = resolve(packageRoot, 'dist-coverage', 'tracker.js');

await mkdir(dirname(outputFile), { recursive: true });

await build({
  absWorkingDir: trackerRoot,
  entryPoints: ['src/tracker.ts'],
  outfile: outputFile,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  sourcemap: 'inline',
  sourcesContent: true,
  minify: false,
  legalComments: 'none',
  charset: 'utf8',
});

console.log(`Tracker coverage bundle built: ${outputFile}`);
