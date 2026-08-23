import { createServer } from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.MOBILE_AI_MOCK_PORT ?? 3103);

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, {
      'content-type': 'application/json',
    });

    response.end(
      JSON.stringify({
        ok: true,
      }),
    );

    return;
  }

  if (request.method !== 'POST' || request.url !== '/analyze') {
    response.writeHead(404);
    response.end();
    return;
  }

  let raw = '';

  request.on('data', (chunk) => {
    raw += chunk.toString();

    if (raw.length > 100_000) {
      request.destroy();
    }
  });

  request.on('end', () => {
    try {
      if (request.headers.authorization !== 'Bearer fullstack-mobile-ai-key') {
        response.writeHead(401, {
          'content-type': 'application/json',
        });

        response.end(
          JSON.stringify({
            error: 'Invalid test API key',
          }),
        );

        return;
      }

      const body = JSON.parse(raw);

      if (body.model !== 'fullstack-mobile-ai' || typeof body.system !== 'string' || typeof body.prompt !== 'string') {
        response.writeHead(400, {
          'content-type': 'application/json',
        });

        response.end(
          JSON.stringify({
            error: 'Invalid analysis request',
          }),
        );

        return;
      }

      response.writeHead(200, {
        'content-type': 'application/json',
      });

      response.end(
        JSON.stringify({
          text: 'Release health was analyzed using the supplied SaaS Command Center evidence. The available evidence supports a limited assessment. Correlation does not prove causation.',
        }),
      );
    } catch {
      response.writeHead(400, {
        'content-type': 'application/json',
      });

      response.end(
        JSON.stringify({
          error: 'Invalid JSON',
        }),
      );
    }
  });
});

server.listen(port, host, () => {
  console.log(`Mobile AI full-stack mock listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => {
    process.exitCode = 0;
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
