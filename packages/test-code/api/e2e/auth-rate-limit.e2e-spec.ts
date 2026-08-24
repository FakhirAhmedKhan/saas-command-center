import { createAgent, createTestUser, loginUser, registerUser } from '../helpers/auth';
import { TEST_ROUTES } from '../helpers/contracts';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { expectSuccessfulStatus } from '../helpers/response';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

describe('Auth Endpoint Rate Limiting E2E (SEC-01)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let originalRegisterLimit: string | undefined;
  let originalLoginLimit: string | undefined;
  let originalRefreshLimit: string | undefined;

  beforeEach(async () => {
    originalRegisterLimit = process.env.AUTH_REGISTER_RATE_LIMIT;

    originalLoginLimit = process.env.AUTH_LOGIN_RATE_LIMIT;

    originalRefreshLimit = process.env.AUTH_REFRESH_RATE_LIMIT;

    /*
     * .env.test relaxes these to a high value so the many general-purpose
     * e2e suites that legitimately register/log in several test users
     * aren't throttled. This suite exists specifically to exercise the
     * real production defaults (5/5/10), so it restores them here.
     */
    process.env.AUTH_REGISTER_RATE_LIMIT = '5';

    process.env.AUTH_LOGIN_RATE_LIMIT = '5';

    process.env.AUTH_REFRESH_RATE_LIMIT = '10';

    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();

    if (originalRegisterLimit === undefined) {
      delete process.env.AUTH_REGISTER_RATE_LIMIT;
    } else {
      process.env.AUTH_REGISTER_RATE_LIMIT = originalRegisterLimit;
    }

    if (originalLoginLimit === undefined) {
      delete process.env.AUTH_LOGIN_RATE_LIMIT;
    } else {
      process.env.AUTH_LOGIN_RATE_LIMIT = originalLoginLimit;
    }

    if (originalRefreshLimit === undefined) {
      delete process.env.AUTH_REFRESH_RATE_LIMIT;
    } else {
      process.env.AUTH_REFRESH_RATE_LIMIT = originalRefreshLimit;
    }
  });

  it('allows login up to the configured limit and throttles the next attempt', async () => {
    const user = createTestUser();
    const registration = await registerUser(createAgent(app), user);

    expectSuccessfulStatus(registration);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginUser(createAgent(app), user);

      expectSuccessfulStatus(response);
    }

    const throttled = await loginUser(createAgent(app), user);

    expect(throttled.status).toBe(429);

    expect(JSON.stringify(throttled.body).toLowerCase()).not.toContain('database');
  });

  it('allows register up to the configured limit and throttles the next attempt', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await registerUser(createAgent(app), createTestUser());

      expectSuccessfulStatus(response);
    }

    const throttled = await registerUser(createAgent(app), createTestUser());

    expect(throttled.status).toBe(429);
  });

  it('allows refresh up to the configured limit, without breaking legitimate rotation, then throttles', async () => {
    const agent = createAgent(app);
    const registration = await registerUser(agent, createTestUser());

    expectSuccessfulStatus(registration);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await agent.post(TEST_ROUTES.auth.refresh);

      expectSuccessfulStatus(response);
    }

    const throttled = await agent.post(TEST_ROUTES.auth.refresh);

    expect(throttled.status).toBe(429);
  });

  it('keeps login throttling independent of registration throttling (different routes, same window)', async () => {
    const user = createTestUser();

    await registerUser(createAgent(app), user);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await loginUser(createAgent(app), user);
    }

    // The login bucket is now exhausted; registration must still be usable
    // since @Throttle() is scoped per route, not shared globally.
    const registerResponse = await registerUser(createAgent(app), createTestUser());

    expectSuccessfulStatus(registerResponse);
  });
});
