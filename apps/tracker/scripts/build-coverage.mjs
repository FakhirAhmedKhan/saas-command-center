// Builds an unminified tracker bundle for coverage runs.
//
// The test harness executes the built bundle inside a vm rather than importing
// the TypeScript sources, so coverage measured against the production build
// would report on a single minified line. This build keeps the same entry point
// but preserves readable output and an inline source map so v8 coverage can map
// results back to src/.
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const outputFile = resolve(packageRoot, 'dist-coverage', 'tracker.js');

await mkdir(dirname(outputFile), { recursive: true });

await build({
  absWorkingDir: packageRoot,
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
