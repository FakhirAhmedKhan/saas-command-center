import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { MobilePerformanceMetricType, MobilePlatform } from 'src/generated/prisma/enums';

const API = '/api/v1';

describe('Mobile Performance E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>;
  let workspaceId: string;
  let mobileAppId: string;
  let sequence = 0;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);

    sequence += 1;

    owner = await registerWorkspaceTestUser(app, prisma);

    workspaceId = owner.workspaceId;

    const mobile = await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: `Android Performance ${sequence}`,

        platform: 'ANDROID',

        framework: 'ANDROID_NATIVE',

        packageId: `com.commandcenter.performance${sequence}`,
      })
      .expect(201);

    mobileAppId = mobile.body.id;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createMetric(
    version: string,
    metric:
      | 'CRASH_RATE'
      | 'CRASH_FREE_USERS_RATE'
      | 'CRASH_COUNT'
      | 'ANR_COUNT'
      | 'HANG_COUNT'
      | 'COLD_STARTUP_MS'
      | 'WARM_STARTUP_MS'
      | 'MEMORY_MB'
      | 'NETWORK_LATENCY_MS'
      | 'API_FAILURE_RATE'
      | 'VERSION_ADOPTION_RATE'
      | 'SLOW_SCREEN_COUNT',
    value: number,
    buildNumber = '815',
    platform: MobilePlatform = MobilePlatform.ANDROID,
  ) {
    return prisma.mobilePerformanceMetric.create({
      data: {
        workspaceId,
        mobileAppId,

        platform,

        version,
        buildNumber,

        metric: metric as MobilePerformanceMetricType,

        value,

        collectedAt: new Date(),
      },
    });
  }

  it('calculates normalized Android summary', async () => {
    await createMetric('6.14.0', 'CRASH_RATE', 0.14);

    await createMetric('6.14.0', 'COLD_STARTUP_MS', 1700);

    const response = await owner.agent.get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/summary?version=6.14.0&platform=ANDROID`).set(withBearer(owner.accessToken)).expect(200);

    expect(response.body.hasData).toBe(true);

    expect(response.body.platform).toBe('ANDROID');

    expect(response.body.metrics.CRASH_RATE.value).toBe(0.14);

    expect(response.body.metrics.COLD_STARTUP_MS.value).toBe(1700);
  });

  it('compares Android versions correctly', async () => {
    await createMetric('6.13.1', 'COLD_STARTUP_MS', 1100, '801');

    await createMetric('6.14.0', 'COLD_STARTUP_MS', 1700, '815');

    const response = await owner.agent.get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/compare?fromVersion=6.13.1&toVersion=6.14.0`).set(withBearer(owner.accessToken)).expect(200);
    const startup = response.body.metrics.find((metric: { metric: string }) => metric.metric === 'COLD_STARTUP_MS');

    expect(startup.before).toBe(1100);

    expect(startup.after).toBe(1700);

    expect(startup.direction).toBe('DEGRADED');
  });

  it('aggregates multiple samples', async () => {
    await createMetric('6.14.0', 'COLD_STARTUP_MS', 1000);

    await createMetric('6.14.0', 'COLD_STARTUP_MS', 2000);

    await createMetric('6.14.0', 'CRASH_COUNT', 2);

    await createMetric('6.14.0', 'CRASH_COUNT', 3);

    const response = await owner.agent.get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/summary?version=6.14.0`).set(withBearer(owner.accessToken)).expect(200);

    expect(response.body.metrics.COLD_STARTUP_MS.value).toBe(1500);

    expect(response.body.metrics.COLD_STARTUP_MS.samples).toBe(2);

    expect(response.body.metrics.CRASH_COUNT.value).toBe(5);
  });

  it('detects Android performance issues', async () => {
    await createMetric('6.14.0', 'CRASH_RATE', 3.2);

    await createMetric('6.14.0', 'COLD_STARTUP_MS', 3500);

    const response = await owner.agent.get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/issues?version=6.14.0`).set(withBearer(owner.accessToken)).expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: 'CRASH_RATE',
          severity: 'CRITICAL',
        }),

        expect.objectContaining({
          metric: 'COLD_STARTUP_MS',
          severity: 'WARNING',
        }),
      ]),
    );
  });

  it('prevents cross-workspace performance access', async () => {
    const second = await registerWorkspaceTestUser(app, prisma);
    const secondMobile = await second.agent
      .post(`${API}/workspaces/${second.workspaceId}/mobile-apps`)
      .set(withBearer(second.accessToken))
      .send({
        name: 'Other Performance App',

        platform: 'ANDROID',

        framework: 'ANDROID_NATIVE',

        packageId: `com.commandcenter.other${sequence}`,
      })
      .expect(201);

    await owner.agent.get(`${API}/workspaces/${workspaceId}/mobile-apps/${secondMobile.body.id}/performance/summary`).set(withBearer(owner.accessToken)).expect(404);
  });
});
