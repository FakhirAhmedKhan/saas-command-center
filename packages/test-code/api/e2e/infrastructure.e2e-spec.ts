import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { API_PREFIX, buildWorkspacePayload, TEST_ROUTES } from '../helpers/contracts';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { readAccessToken } from '../helpers/response';
import { REQUEST_ID_HEADER } from 'src/common/middleware/request-id.middleware';
import { PrismaService } from 'src/database/prisma.service';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Covers the production bootstrap wiring applied by configureApplication():
 * the global exception filter, request-id middleware, helmet, CORS and body
 * limits. These are only reachable now that the E2E harness boots the app the
 * same way production does.
 */
describe('Infrastructure E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  let accessToken: string;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);

    const agent = createAgent(app);

    const user = createTestUser();

    accessToken = readAccessToken(await registerUser(agent, user));
  });

  afterEach(async () => {
    await app.close();
  });

  describe('error envelope', () => {
    it('returns the full production envelope for a 404', async () => {
      const response = await request(app.getHttpServer()).get(`${API_PREFIX}/this-route-does-not-exist`);

      expect(response.status).toBe(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        path: `${API_PREFIX}/this-route-does-not-exist`,
      });

      expect(typeof response.body.message).toBe('string');

      expect(response.body.timestamp).toEqual(expect.any(String));

      expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
    });

    it('reports the requestId in the body and matches the response header', async () => {
      const response = await request(app.getHttpServer()).get(`${API_PREFIX}/this-route-does-not-exist`);

      expect(response.body.requestId).toMatch(UUID_PATTERN);

      expect(response.headers[REQUEST_ID_HEADER]).toBe(response.body.requestId);
    });

    it('returns a validation envelope with an array message for a bad payload', async () => {
      const response = await request(app.getHttpServer()).post(TEST_ROUTES.workspaces.root).set(withBearer(accessToken)).send({
        name: '',
      });

      expect(response.status).toBe(400);

      expect(response.body.statusCode).toBe(400);

      expect(Array.isArray(response.body.message)).toBe(true);

      expect(response.body.path).toBe(TEST_ROUTES.workspaces.root);

      expect(response.body.requestId).toMatch(UUID_PATTERN);
    });

    it('rejects unknown body fields under forbidNonWhitelisted', async () => {
      const response = await request(app.getHttpServer())
        .post(TEST_ROUTES.workspaces.root)
        .set(withBearer(accessToken))
        .send({
          ...buildWorkspacePayload('Envelope Workspace'),
          unexpectedField: 'should be rejected',
        });

      expect(response.status).toBe(400);

      expect(JSON.stringify(response.body.message)).toMatch(/unexpectedField/);
    });

    it('does not leak a stack trace in the error body', async () => {
      const response = await request(app.getHttpServer()).get(`${API_PREFIX}/this-route-does-not-exist`);

      expect(response.body.stack).toBeUndefined();

      expect(JSON.stringify(response.body)).not.toMatch(/at .*\(.*\.ts:/);
    });
  });

  describe('request id middleware', () => {
    it('sets a generated request id on successful responses', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health);

      expect(response.headers[REQUEST_ID_HEADER]).toMatch(UUID_PATTERN);
    });

    it('echoes a client supplied request id', async () => {
      const suppliedId = 'client-supplied-request-id';

      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health).set(REQUEST_ID_HEADER, suppliedId);

      expect(response.headers[REQUEST_ID_HEADER]).toBe(suppliedId);
    });

    it('generates a fresh id when the supplied header is blank', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health).set(REQUEST_ID_HEADER, '   ');

      expect(response.headers[REQUEST_ID_HEADER]).toMatch(UUID_PATTERN);
    });

    it('issues a different id per request', async () => {
      const first = await request(app.getHttpServer()).get(TEST_ROUTES.system.health);

      const second = await request(app.getHttpServer()).get(TEST_ROUTES.system.health);

      expect(first.headers[REQUEST_ID_HEADER]).not.toBe(second.headers[REQUEST_ID_HEADER]);
    });
  });

  describe('helmet security headers', () => {
    it('applies helmet defaults to responses', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health);

      expect(response.headers['x-content-type-options']).toBe('nosniff');

      expect(response.headers['x-dns-prefetch-control']).toBe('off');

      expect(response.headers['referrer-policy']).toBeDefined();
    });

    it('disables the CSP outside production', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health);

      expect(response.headers['content-security-policy']).toBeUndefined();
    });

    it('sets a cross-origin resource policy so the tracker can load', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health);

      expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('removes the express fingerprint header', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('cors', () => {
    it('allows a configured origin with credentials', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health).set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not grant credentials to a disallowed origin', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health).set('Origin', 'https://attacker.example.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();

      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });

    it('exposes the request id header to browsers', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health).set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-expose-headers']).toMatch(/X-Request-Id/i);
    });
  });

  describe('body limits', () => {
    it('accepts a payload within the configured limit', async () => {
      const response = await request(app.getHttpServer())
        .post(TEST_ROUTES.workspaces.root)
        .set(withBearer(accessToken))
        .send(buildWorkspacePayload('Body Limit Workspace'));

      expect(response.status).toBeLessThan(400);
    });

    it('rejects a JSON payload larger than BODY_LIMIT', async () => {
      const oversizedPayload = {
        ...buildWorkspacePayload('Oversized Workspace'),
        padding: 'x'.repeat(2 * 1024 * 1024),
      };

      const response = await request(app.getHttpServer()).post(TEST_ROUTES.workspaces.root).set(withBearer(accessToken)).send(oversizedPayload);

      expect(response.status).toBe(413);
    });
  });
});
