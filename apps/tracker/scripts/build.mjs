import {
  build,
} from 'esbuild';

import {
  gzipSync,
} from 'node:zlib';

import {
  mkdir,
  readFile,
} from 'node:fs/promises';

const outputFile =
  new URL(
    '../dist/tracker.js',
    import.meta.url,
  );

await mkdir(
  new URL(
    '../dist/',
    import.meta.url,
  ),
  {
    recursive: true,
  },
);

await build({
  entryPoints: [
    new URL(
      '../src/tracker.ts',
      import.meta.url,
    ).pathname,
  ],

  outfile:
    outputFile.pathname,

  bundle: true,

  minify: true,

  format: 'iife',

  platform: 'browser',

  target: [
    'es2020',
  ],

  legalComments: 'none',

  sourcemap: false,

  banner: {
    js:
      '/*! Command Center Analytics Tracker v1.0.0 */',
  },
});

const bundle =
  await readFile(outputFile);

const gzipSize =
  gzipSync(bundle).length;

const maximumGzipSize =
  12 * 1024;

console.log(
  `Tracker bundle: ${bundle.length} bytes`,
);

console.log(
  `Tracker gzip: ${gzipSize} bytes`,
);

if (
  gzipSize >
  maximumGzipSize
) {
  throw new Error(
    `Tracker exceeds ${maximumGzipSize} byte gzip budget`,
  );
}