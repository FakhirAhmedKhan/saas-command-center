import { createServer } from 'node:http';

import { readFile } from 'node:fs/promises';

const port = Number(process.env.TRACKER_PORT) || 3002;

const outputFile = new URL('../dist/tracker.js', import.meta.url);

const content = await readFile(outputFile);

const server = createServer((request, response) => {
  if (request.url !== '/tracker.js' && request.url !== '/') {
    response.statusCode = 404;

    response.end('Not found');

    return;
  }

  response.statusCode = 200;

  response.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  response.setHeader('Access-Control-Allow-Origin', '*');

  response.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');

  response.end(content);
});

server.listen(port, () => {
  console.log(`Tracker running at http://localhost:${port}/tracker.js`);
});
