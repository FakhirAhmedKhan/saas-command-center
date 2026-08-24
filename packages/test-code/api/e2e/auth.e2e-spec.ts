import { createAgent, createTestUser, loginUser, registerUser, withBearer } from '../helpers/auth';
import { TEST_ROUTES } from '../helpers/contracts';
import { buildCookieWithValue, readCookiePair, readCookieValue, readFirstSetCookie } from '../helpers/cookie';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { expectSuccessfulStatus, readAccessToken, readResponseEmail, readSetCookies } from '../helpers/response';
import type { INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';
import request from 'supertest';

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function tamperJwt(token: string): string {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Expected a JWT with three segments.');
  }

  const signature = parts[2];

  if (!signature) {
    throw new Error('JWT signature is missing.');
  }

  const firstCharacter = signature[0];

  if (!firstCharacter) {
    throw new Error('JWT signature is empty.');
  }

  const replacement = firstCharacter === 'a' ? 'b' : 'a';

  parts[2] = `${replacement}${signature.slice(1)}`;

  return parts.join('.');
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected an object but received ${typeof value}.`);
  }

  return value as Record<string, unknown>;
}

describe('Phase 11 - Foundation & Authentication E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('registration', () => {
    it('registers a new user and creates an authenticated session', async () => {
      const agent = createAgent(app);
      const user = createTestUser();
      const registerResponse = await registerUser(agent, user);

      expectSuccessfulStatus(registerResponse);

      const accessToken = readAccessToken(registerResponse);

      expect(accessToken).toEqual(expect.any(String));

      const meResponse = await agent.get(TEST_ROUTES.auth.me).set(withBearer(accessToken));

      expect(meResponse.status).toBe(200);

      expect(readResponseEmail(meResponse)).toBe(user.email);
    });

    it('registers the user without automatically creating a workspace', async () => {
      const user = createTestUser();
      const response = await registerUser(createAgent(app), user);

      expectSuccessfulStatus(response);

      const databaseUser = await prisma.user.findUnique({
        where: {
          email: user.email,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      });

      if (!databaseUser) {
        throw new Error('Registered user was not persisted.');
      }

      expect(databaseUser.email).toBe(user.email);
      expect(databaseUser.displayName).toBe(user.name);

      const membership = await prisma.workspaceMember.findFirst({
        where: {
          userId: databaseUser.id,
        },
      });

      expect(membership).toBeNull();
    });
    it('does not expose a refresh token or password hash in the registration body', async () => {
      const response = await registerUser(createAgent(app), createTestUser());

      expectSuccessfulStatus(response);

      const body: unknown = response.body;
      const serialized = JSON.stringify(body).toLowerCase();

      expect(serialized).not.toContain('refreshtoken');

      expect(serialized).not.toContain('passwordhash');
    });

    it('rejects duplicate email registration with 409 conflict', async () => {
      const user = createTestUser();
      const firstResponse = await registerUser(createAgent(app), user);

      expectSuccessfulStatus(firstResponse);

      const secondResponse = await registerUser(createAgent(app), {
        ...user,

        workspaceName: 'Another Workspace',
      });

      expect(secondResponse.status).toBe(409);
    });

    it('rejects invalid registration input', async () => {
      const response = await request(app.getHttpServer()).post(TEST_ROUTES.auth.register).send({
        displayName: '',
        email: 'not-an-email',
        password: '123',
        workspaceName: '',
        unexpectedField: 'must be rejected',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('login and protected-route authorization', () => {
    it('logs in using valid credentials', async () => {
      const user = createTestUser();
      const registrationAgent = createAgent(app);

      expectSuccessfulStatus(await registerUser(registrationAgent, user));

      const loginAgent = createAgent(app);
      const loginResponse = await loginUser(loginAgent, user);

      expectSuccessfulStatus(loginResponse);

      const accessToken = readAccessToken(loginResponse);

      expect(accessToken).toEqual(expect.any(String));

      const meResponse = await loginAgent.get(TEST_ROUTES.auth.me).set(withBearer(accessToken));

      expect(meResponse.status).toBe(200);

      expect(readResponseEmail(meResponse)).toBe(user.email);
    });

    it('rejects an invalid password without exposing account internals', async () => {
      const user = createTestUser();

      expectSuccessfulStatus(await registerUser(createAgent(app), user));

      const response = await loginUser(createAgent(app), {
        email: user.email,
        password: 'IncorrectPassword123!',
      });

      expect(response.status).toBe(401);

      const body: unknown = response.body;
      const responseText = JSON.stringify(body).toLowerCase();

      expect(responseText).not.toContain('hash');

      expect(responseText).not.toContain('database');
    });

    it('rejects an unknown email with the same generic authentication failure', async () => {
      const user = createTestUser();

      expectSuccessfulStatus(await registerUser(createAgent(app), user));

      const response = await loginUser(createAgent(app), {
        email: `missing-${user.email}`,
        password: user.password,
      });

      expect(response.status).toBe(401);

      const body: unknown = response.body;
      const responseText = JSON.stringify(body).toLowerCase();

      expect(responseText).not.toContain('hash');

      expect(responseText).not.toContain('database');
    });

    it('rejects access to protected routes without an access token', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.auth.me);

      expect(response.status).toBe(401);
    });

    it('rejects a tampered access token', async () => {
      const response = await registerUser(createAgent(app), createTestUser());

      expectSuccessfulStatus(response);

      const accessToken = readAccessToken(response);
      const tamperedAccessToken = tamperJwt(accessToken);
      const protectedResponse = await request(app.getHttpServer()).get(TEST_ROUTES.auth.me).set(withBearer(tamperedAccessToken));

      expect(protectedResponse.status).toBe(401);
    });

    it('rejects a refresh token when it is presented as a Bearer access token', async () => {
      const response = await registerUser(createAgent(app), createTestUser());

      expectSuccessfulStatus(response);

      const refreshCookie = readCookiePair(readFirstSetCookie(response));
      const refreshToken = readCookieValue(refreshCookie);
      const protectedResponse = await request(app.getHttpServer()).get(TEST_ROUTES.auth.me).set(withBearer(refreshToken));

      expect(protectedResponse.status).toBe(401);
    });
  });

  describe('refresh cookie security', () => {
    it('sets HttpOnly, SameSite, and Path attributes on the refresh cookie', async () => {
      const response = await registerUser(createAgent(app), createTestUser());

      expectSuccessfulStatus(response);

      const setCookie = readFirstSetCookie(response);

      expect(setCookie).toMatch(/;\s*HttpOnly(?:;|$)/i);

      expect(setCookie).toMatch(/;\s*SameSite=(Lax|Strict|None)(?:;|$)/i);

      expect(setCookie).toMatch(/;\s*Path=[^;]+/i);
    });

    it('stores only the SHA-256 hash of the refresh token', async () => {
      const response = await registerUser(createAgent(app), createTestUser());

      expectSuccessfulStatus(response);

      const refreshCookie = readCookiePair(readFirstSetCookie(response));
      const rawRefreshToken = readCookieValue(refreshCookie);
      const expectedHash = hashRefreshToken(rawRefreshToken);
      const session = await prisma.authSession.findUnique({
        where: {
          refreshTokenHash: expectedHash,
        },
        select: {
          refreshTokenHash: true,
        },
      });

      expect(session).not.toBeNull();

      expect(session?.refreshTokenHash).toBe(expectedHash);

      expect(session?.refreshTokenHash).not.toBe(rawRefreshToken);

      expect(session?.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('rejects refresh when the refresh cookie is missing', async () => {
      const response = await request(app.getHttpServer()).post(TEST_ROUTES.auth.refresh);

      expect(response.status).toBe(401);
    });

    it('rejects a tampered refresh token', async () => {
      const registrationResponse = await registerUser(createAgent(app), createTestUser());

      expectSuccessfulStatus(registrationResponse);

      const validCookie = readCookiePair(readFirstSetCookie(registrationResponse));
      const tamperedCookie = buildCookieWithValue(validCookie, 'not-a-valid-refresh-token');
      const response = await request(app.getHttpServer()).post(TEST_ROUTES.auth.refresh).set('Cookie', tamperedCookie);

      expect(response.status).toBe(401);
    });
  });

  describe('refresh rotation and replay protection', () => {
    it('rotates the refresh session and returns a new access token', async () => {
      const user = createTestUser();
      const agent = createAgent(app);

      expectSuccessfulStatus(await registerUser(agent, user));

      const loginResponse = await loginUser(agent, user);

      expectSuccessfulStatus(loginResponse);

      const firstAccessToken = readAccessToken(loginResponse);
      const firstCookie = readCookiePair(readFirstSetCookie(loginResponse));
      const refreshResponse = await agent.post(TEST_ROUTES.auth.refresh);

      expectSuccessfulStatus(refreshResponse);

      const secondAccessToken = readAccessToken(refreshResponse);
      const secondCookie = readCookiePair(readFirstSetCookie(refreshResponse));

      expect(secondAccessToken).toEqual(expect.any(String));

      expect(secondAccessToken).not.toBe(firstAccessToken);

      expect(secondCookie).not.toBe(firstCookie);

      const meResponse = await agent.get(TEST_ROUTES.auth.me).set(withBearer(secondAccessToken));

      expect(meResponse.status).toBe(200);
    });

    it('rejects old refresh-token reuse and revokes the whole refresh-token family', async () => {
      const user = createTestUser();

      expectSuccessfulStatus(await registerUser(createAgent(app), user));

      const agent = createAgent(app);
      const loginResponse = await loginUser(agent, user);

      expectSuccessfulStatus(loginResponse);

      const oldCookie = readCookiePair(readFirstSetCookie(loginResponse));
      const oldRefreshToken = readCookieValue(oldCookie);
      const oldRefreshTokenHash = hashRefreshToken(oldRefreshToken);
      const oldSession = await prisma.authSession.findUnique({
        where: {
          refreshTokenHash: oldRefreshTokenHash,
        },
        select: {
          familyId: true,
        },
      });

      if (!oldSession) {
        throw new Error('Expected the original refresh session to exist.');
      }

      const firstRefreshResponse = await agent.post(TEST_ROUTES.auth.refresh);

      expectSuccessfulStatus(firstRefreshResponse);

      const replayResponse = await request(app.getHttpServer()).post(TEST_ROUTES.auth.refresh).set('Cookie', oldCookie);

      expect(replayResponse.status).toBe(401);

      const familySessions = await prisma.authSession.findMany({
        where: {
          familyId: oldSession.familyId,
        },
        select: {
          revokedAt: true,
        },
      });

      expect(familySessions.length).toBeGreaterThanOrEqual(2);

      expect(familySessions.every((session) => session.revokedAt !== null)).toBe(true);

      const rotatedChildRefreshResponse = await agent.post(TEST_ROUTES.auth.refresh);

      expect(rotatedChildRefreshResponse.status).toBe(401);
    });

    it('rejects an expired refresh session and records EXPIRED revocation', async () => {
      const agent = createAgent(app);
      const registrationResponse = await registerUser(agent, createTestUser());

      expectSuccessfulStatus(registrationResponse);

      const refreshCookie = readCookiePair(readFirstSetCookie(registrationResponse));
      const rawRefreshToken = readCookieValue(refreshCookie);
      const refreshTokenHash = hashRefreshToken(rawRefreshToken);

      await prisma.authSession.update({
        where: {
          refreshTokenHash,
        },
        data: {
          expiresAt: new Date(Date.now() - 60_000),
        },
      });

      const refreshResponse = await request(app.getHttpServer()).post(TEST_ROUTES.auth.refresh).set('Cookie', refreshCookie);

      expect(refreshResponse.status).toBe(401);

      const session = await prisma.authSession.findUnique({
        where: {
          refreshTokenHash,
        },
        select: {
          revokedAt: true,
          revokeReason: true,
        },
      });

      expect(session?.revokedAt).toBeInstanceOf(Date);

      expect(session?.revokeReason).toBe('EXPIRED');
    });
  });

  describe('logout', () => {
    it('revokes the current refresh session and clears the refresh cookie', async () => {
      const agent = createAgent(app);
      const registrationResponse = await registerUser(agent, createTestUser());

      expectSuccessfulStatus(registrationResponse);

      const originalCookie = readCookiePair(readFirstSetCookie(registrationResponse));
      const rawRefreshToken = readCookieValue(originalCookie);
      const refreshTokenHash = hashRefreshToken(rawRefreshToken);
      const logoutResponse = await agent.post(TEST_ROUTES.auth.logout);

      expect(logoutResponse.status).toBe(200);

      const clearCookies = readSetCookies(logoutResponse);

      expect(clearCookies.length).toBeGreaterThan(0);

      const clearCookieText = clearCookies.join('; ');
      const clearsUsingMaxAge = /Max-Age=0/i.test(clearCookieText);
      const clearsUsingExpiredDate = /Expires=[^;]*(?:1970|1969)/i.test(clearCookieText);

      expect(clearsUsingMaxAge || clearsUsingExpiredDate).toBe(true);

      const session = await prisma.authSession.findUnique({
        where: {
          refreshTokenHash,
        },
        select: {
          revokedAt: true,
          revokeReason: true,
        },
      });

      expect(session?.revokedAt).toBeInstanceOf(Date);

      expect(session?.revokeReason).toBe('LOGOUT');

      const refreshResponse = await agent.post(TEST_ROUTES.auth.refresh);

      expect(refreshResponse.status).toBe(401);

      const oldCookieReplayResponse = await request(app.getHttpServer()).post(TEST_ROUTES.auth.refresh).set('Cookie', originalCookie);

      expect(oldCookieReplayResponse.status).toBe(401);
    });

    it('keeps logout idempotent when no refresh cookie exists', async () => {
      const firstResponse = await request(app.getHttpServer()).post(TEST_ROUTES.auth.logout);
      const secondResponse = await request(app.getHttpServer()).post(TEST_ROUTES.auth.logout);

      expect(firstResponse.status).toBe(200);

      expect(secondResponse.status).toBe(200);
    });
  });

  describe('logout-all', () => {
    it('rejects logout-all without a valid access token', async () => {
      const response = await request(app.getHttpServer()).post(TEST_ROUTES.auth.logoutAll);

      expect(response.status).toBe(401);
    });

    it('revokes every active refresh session for the authenticated user', async () => {
      const user = createTestUser();
      const registrationAgent = createAgent(app);
      const firstLoginAgent = createAgent(app);
      const secondLoginAgent = createAgent(app);
      const registrationResponse = await registerUser(registrationAgent, user);

      expectSuccessfulStatus(registrationResponse);

      const firstLoginResponse = await loginUser(firstLoginAgent, user);

      expectSuccessfulStatus(firstLoginResponse);

      const secondLoginResponse = await loginUser(secondLoginAgent, user);

      expectSuccessfulStatus(secondLoginResponse);

      const databaseUser = await prisma.user.findUnique({
        where: {
          email: user.email,
        },
        select: {
          id: true,
        },
      });

      if (!databaseUser) {
        throw new Error('Expected registered user to exist.');
      }

      const activeSessionsBefore = await prisma.authSession.count({
        where: {
          userId: databaseUser.id,
          revokedAt: null,
        },
      });

      expect(activeSessionsBefore).toBeGreaterThanOrEqual(3);

      const accessToken = readAccessToken(firstLoginResponse);
      const logoutAllResponse = await firstLoginAgent.post(TEST_ROUTES.auth.logoutAll).set(withBearer(accessToken));

      expect(logoutAllResponse.status).toBe(200);

      const sessionsAfter = await prisma.authSession.findMany({
        where: {
          userId: databaseUser.id,
        },
        select: {
          revokedAt: true,
          revokeReason: true,
        },
      });

      expect(sessionsAfter.length).toBeGreaterThanOrEqual(3);

      expect(sessionsAfter.every((session) => session.revokedAt !== null)).toBe(true);

      expect(sessionsAfter.every((session) => session.revokeReason === 'LOGOUT_ALL')).toBe(true);

      expect((await registrationAgent.post(TEST_ROUTES.auth.refresh)).status).toBe(401);

      expect((await firstLoginAgent.post(TEST_ROUTES.auth.refresh)).status).toBe(401);

      expect((await secondLoginAgent.post(TEST_ROUTES.auth.refresh)).status).toBe(401);
    });
  });

  describe('public health', () => {
    it('returns minimal public health without authentication or secret leakage', async () => {
      const response = await request(app.getHttpServer()).get(TEST_ROUTES.system.health);

      expect(response.status).toBe(200);

      const bodyValue: unknown = response.body;
      const body = asRecord(bodyValue);

      expect(body.status).toBe('ok');

      expect(body.timestamp).toEqual(expect.any(String));

      const timestamp = body.timestamp;

      if (typeof timestamp !== 'string') {
        throw new Error('Expected health timestamp to be a string.');
      }

      expect(Number.isNaN(Date.parse(timestamp))).toBe(false);

      // Public health must stay intentionally minimal.
      expect(Object.keys(body).sort()).toEqual(['status', 'timestamp']);

      const serializedBody = JSON.stringify(body).toLowerCase();

      expect(serializedBody).not.toContain('database_url');
      expect(serializedBody).not.toContain('jwt_access_secret');
      expect(serializedBody).not.toContain('jwt_refresh_secret');
      expect(serializedBody).not.toContain('password');
      expect(serializedBody).not.toContain('connectionstring');
    });
  });
});
