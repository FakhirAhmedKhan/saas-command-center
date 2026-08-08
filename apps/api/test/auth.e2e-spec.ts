/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { createAgent, createTestUser, loginUser, registerUser, withBearer } from './helpers/auth';

import { TEST_ROUTES } from './helpers/contracts';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import {
  expectSuccessfulStatus,
  readAccessToken,
  readResponseEmail,
  readSetCookies,
} from './helpers/response';
import { PrismaService } from '../src/database/prisma.service';

describe('Authentication E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

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

  it('rejects duplicate email registration', async () => {
    const user = createTestUser();

    const firstAgent = createAgent(app);

    const firstResponse = await registerUser(firstAgent, user);

    expectSuccessfulStatus(firstResponse);

    const secondAgent = createAgent(app);

    const secondResponse = await registerUser(secondAgent, {
      ...user,

      workspaceName: 'Another Workspace',
    });

    expect([400, 409]).toContain(secondResponse.status);
  });

  it('rejects invalid registration input', async () => {
    const response = await request(app.getHttpServer()).post(TEST_ROUTES.auth.register).send({
      name: '',
      email: 'not-an-email',
      password: '123',
      workspaceName: '',
      unexpectedField: 'must be rejected',
    });

    expect(response.status).toBe(400);
  });

  it('logs in using valid credentials', async () => {
    const user = createTestUser();

    const registrationAgent = createAgent(app);

    expectSuccessfulStatus(await registerUser(registrationAgent, user));

    const loginAgent = createAgent(app);

    const loginResponse = await loginUser(loginAgent, user);

    expectSuccessfulStatus(loginResponse);

    expect(readAccessToken(loginResponse)).toEqual(expect.any(String));
  });

  it('rejects an invalid password without revealing account details', async () => {
    const user = createTestUser();

    const registrationAgent = createAgent(app);

    expectSuccessfulStatus(await registerUser(registrationAgent, user));

    const response = await loginUser(createAgent(app), {
      email: user.email,

      password: 'IncorrectPassword123!',
    });

    expect(response.status).toBe(401);

    const responseText = JSON.stringify(response.body).toLowerCase();

    expect(responseText).not.toContain('hash');

    expect(responseText).not.toContain('database');
  });

  it('rejects access to protected routes without an access token', async () => {
    const response = await request(app.getHttpServer()).get(TEST_ROUTES.auth.me);

    expect(response.status).toBe(401);
  });

  it('rotates the refresh session and returns a new access token', async () => {
    const user = createTestUser();

    const agent = createAgent(app);

    expectSuccessfulStatus(await registerUser(agent, user));

    const loginResponse = await loginUser(agent, user);

    expectSuccessfulStatus(loginResponse);

    const firstCookies = readSetCookies(loginResponse);

    expect(firstCookies.length).toBeGreaterThan(0);

    expect(firstCookies.join(';')).toContain('HttpOnly');

    const refreshResponse = await agent.post(TEST_ROUTES.auth.refresh);

    expectSuccessfulStatus(refreshResponse);

    const refreshedAccessToken = readAccessToken(refreshResponse);

    expect(refreshedAccessToken).toEqual(expect.any(String));

    expect(refreshedAccessToken.length).toBeGreaterThan(20);

    const meAfterRefresh = await agent
      .get(TEST_ROUTES.auth.me)
      .set(withBearer(refreshedAccessToken));

    expect(meAfterRefresh.status).toBe(200);

    const rotatedCookies = readSetCookies(refreshResponse);

    expect(rotatedCookies.length).toBeGreaterThan(0);

    expect(rotatedCookies.join(';')).not.toBe(firstCookies.join(';'));
  });

  it('revokes the refresh session on logout', async () => {
    const user = createTestUser();

    const agent = createAgent(app);

    expectSuccessfulStatus(await registerUser(agent, user));

    const loginResponse = await loginUser(agent, user);

    expectSuccessfulStatus(loginResponse);

    const accessToken = readAccessToken(loginResponse);

    const logoutResponse = await agent.post(TEST_ROUTES.auth.logout).set(withBearer(accessToken));

    expect([200, 204]).toContain(logoutResponse.status);

    const refreshResponse = await agent.post(TEST_ROUTES.auth.refresh);

    expect(refreshResponse.status).toBe(401);
  });
});
