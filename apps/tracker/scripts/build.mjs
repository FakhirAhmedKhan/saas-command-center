import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const currentFile =
  fileURLToPath(import.meta.url);

const scriptsDirectory =
  dirname(currentFile);

const packageRoot =
  resolve(scriptsDirectory, '..');

const entryFile =
  resolve(packageRoot, 'src', 'tracker.ts');

const outputDirectory =
  resolve(packageRoot, 'dist');

const outputFile =
  resolve(outputDirectory, 'tracker.js');

if (!existsSync(entryFile)) {
  throw new Error(
    `Tracker entry file was not found: ${entryFile}`,
  );
}

await mkdir(
  outputDirectory,
  {
    recursive: true,
  },
);

await build({
  absWorkingDir: packageRoot,

  entryPoints: [
    'src/tracker.ts',
  ],

  outfile:
    outputFile,

  bundle:
    true,

  platform:
    'browser',

  format:
    'iife',

  target: [
    'es2020',
  ],

  sourcemap:
    true,

  minify:
    true,

  legalComments:
    'none',

  charset:
    'utf8',

  logLevel:
    'info',
});

console.log(
  `Tracker built successfully: ${outputFile}`,
);
