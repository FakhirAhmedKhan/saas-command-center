import { context } from 'esbuild';

import { createServer } from 'node:http';

import { readFile } from 'node:fs/promises';

const port = Number(process.env.TRACKER_PORT) || 3002;

const outputFile = new URL('../dist/tracker.js', import.meta.url);

const buildContext = await context({
  entryPoints: [new URL('../src/tracker.ts', import.meta.url).pathname],

  outfile: outputFile.pathname,

  bundle: true,

  minify: true,

  format: 'iife',

  platform: 'browser',

  target: ['es2020'],

  legalComments: 'none',

  banner: {
    js: '/*! Command Center Analytics Tracker v1.0.0 */',
  },
});

await buildContext.watch();

const server = createServer(async (request, response) => {
  if (request.url !== '/tracker.js' && request.url !== '/') {
    response.statusCode = 404;

    response.end('Not found');

    return;
  }

  try {
    const content = await readFile(outputFile);

    response.statusCode = 200;

    response.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    response.setHeader('Access-Control-Allow-Origin', '*');

    response.setHeader('Cache-Control', 'no-store');

    response.end(content);
  } catch {
    response.statusCode = 503;

    response.end('Tracker is building');
  }
});

server.listen(port, () => {
  console.log(`Tracker running at http://localhost:${port}/tracker.js`);
});

async function shutdown() {
  await buildContext.dispose();

  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);

process.on('SIGTERM', shutdown);
