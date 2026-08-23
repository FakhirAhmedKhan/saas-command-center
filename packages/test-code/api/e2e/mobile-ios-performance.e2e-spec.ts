import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { MobilePerformanceMetricType, MobilePlatform, MobileTelemetryProvider } from 'src/generated/prisma/enums';

import type { MobileTelemetryProviderAdapter, MobileTelemetryProviderContext } from 'src/modules/mobile-apps/telemetry/mobile-telemetry-provider.interface';

import { MobileTelemetryProviderRegistry } from 'src/modules/mobile-apps/telemetry/mobile-telemetry-provider.registry';

import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

process.env.MOBILE_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 13).toString('base64');

class FakeIosTelemetryProvider implements MobileTelemetryProviderAdapter {
  readonly provider = MobileTelemetryProvider.SENTRY;

  crashData = {
    crashCount: 4,
    affectedUsers: 3,
    crashFreeUsersRate: 98.5,
    hangCount: 2,
  };

  performanceData = {
    coldStartupMs: 2200,
    warmStartupMs: 780,
    memoryMb: 210,
    networkLatencyMs: 180,
    apiFailureRate: 0.5,
    slowScreenCount: 1,
  };

  versionData = [
    {
      version: '7.2.0',
      buildNumber: '920',
      activeUsers: 8000,
      adoptionRate: 74.5,
    },
  ];

  validateConfig(config: Record<string, string>) {
    if (!config.authToken) {
      throw new Error('authToken required');
    }
  }

  async getCrashes(_context: MobileTelemetryProviderContext) {
    return this.crashData;
  }

  async getPerformance(_context: MobileTelemetryProviderContext) {
    return this.performanceData;
  }

  async getVersions(_context: MobileTelemetryProviderContext) {
    return this.versionData;
  }
}

describe('iOS Mobile Performance E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fake: FakeIosTelemetryProvider;

  let owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>;

  let workspaceId: string;
  let mobileAppId: string;

  let sequence = 0;

  beforeEach(async () => {
    process.env.MOBILE_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 13).toString('base64');

    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);

    fake = new FakeIosTelemetryProvider();

    const registry = app.get(MobileTelemetryProviderRegistry);

    registry.registerForTesting(MobileTelemetryProvider.SENTRY, fake);

    sequence += 1;

    owner = await registerWorkspaceTestUser(app, prisma);

    workspaceId = owner.workspaceId;

    const mobile = await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: `iOS Performance ${sequence}`,

        platform: 'IOS',

        framework: 'IOS_NATIVE',

        bundleId: `com.commandcenter.iosperformance${sequence}`,
      })
      .expect(201);

    mobileAppId = mobile.body.id;
  });

  afterEach(async () => {
    await app.close();
  });

  function connectTelemetry() {
    return owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/telemetry/connect`)
      .set(withBearer(owner.accessToken))
      .send({
        provider: 'SENTRY',

        externalProjectId: 'command-center-ios',

        config: {
          authToken: 'phase13-ios-secret',
        },
      });
  }

  function syncTelemetry() {
    return owner.agent.post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/telemetry/sync`).set(withBearer(owner.accessToken));
  }

  async function createMetric(
    version: string,

    metric: MobilePerformanceMetricType,

    value: number,

    buildNumber: string,
  ) {
    return prisma.mobilePerformanceMetric.create({
      data: {
        workspaceId,
        mobileAppId,

        platform: MobilePlatform.IOS,

        version,
        buildNumber,

        metric,
        value,

        collectedAt: new Date(),
      },
    });
  }

  it('creates native iOS application with bundle identifier', async () => {
    const mobile = await prisma.mobileApplication.findUniqueOrThrow({
      where: {
        id: mobileAppId,
      },
    });

    expect(mobile.platform).toBe(MobilePlatform.IOS);

    expect(mobile.framework).toBe('IOS_NATIVE');

    expect(mobile.bundleId).toBe(`com.commandcenter.iosperformance${sequence}`);

    expect(mobile.packageId).toBeNull();
  });

  it('persists normalized iOS telemetry metrics', async () => {
    await connectTelemetry().expect(201);

    await syncTelemetry().expect(201);

    const rows = await prisma.mobilePerformanceMetric.findMany({
      where: {
        workspaceId,
        mobileAppId,
      },
    });

    expect(rows.length).toBeGreaterThan(0);

    expect(rows.every((row) => row.platform === MobilePlatform.IOS)).toBe(true);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: 'IOS',

          version: '7.2.0',

          buildNumber: '920',

          metric: 'CRASH_COUNT',

          value: 4,
        }),

        expect.objectContaining({
          metric: 'CRASH_FREE_USERS_RATE',

          value: 98.5,
        }),

        expect.objectContaining({
          metric: 'CRASH_RATE',

          value: 1.5,
        }),

        expect.objectContaining({
          metric: 'HANG_COUNT',

          value: 2,
        }),

        expect.objectContaining({
          metric: 'COLD_STARTUP_MS',

          value: 2200,
        }),

        expect.objectContaining({
          metric: 'MEMORY_MB',

          value: 210,
        }),

        expect.objectContaining({
          metric: 'VERSION_ADOPTION_RATE',

          value: 74.5,
        }),
      ]),
    );
  });

  it('returns normalized iOS performance summary', async () => {
    await connectTelemetry().expect(201);

    await syncTelemetry().expect(201);

    const response = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/summary?version=7.2.0&platform=IOS`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    expect(response.body.hasData).toBe(true);

    expect(response.body.providerAvailable).toBe(true);

    expect(response.body.platform).toBe('IOS');

    expect(response.body.version).toBe('7.2.0');

    expect(response.body.metrics.CRASH_RATE.value).toBe(1.5);

    expect(response.body.metrics.HANG_COUNT.value).toBe(2);

    expect(response.body.metrics.COLD_STARTUP_MS.value).toBe(2200);

    expect(response.body.metrics.MEMORY_MB.value).toBe(210);
  });

  it('detects iOS hang and startup performance problems', async () => {
    fake.performanceData.coldStartupMs = 3500;

    await connectTelemetry().expect(201);

    await syncTelemetry().expect(201);

    const response = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/issues?version=7.2.0`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: 'HANG_COUNT',

          severity: 'WARNING',
        }),

        expect.objectContaining({
          metric: 'COLD_STARTUP_MS',

          severity: 'WARNING',
        }),
      ]),
    );
  });

  it('compares iOS versions correctly', async () => {
    await createMetric(
      '7.1.0',

      MobilePerformanceMetricType.COLD_STARTUP_MS,

      1200,

      '900',
    );

    await createMetric(
      '7.2.0',

      MobilePerformanceMetricType.COLD_STARTUP_MS,

      1800,

      '920',
    );

    await createMetric(
      '7.1.0',

      MobilePerformanceMetricType.CRASH_FREE_USERS_RATE,

      98,

      '900',
    );

    await createMetric(
      '7.2.0',

      MobilePerformanceMetricType.CRASH_FREE_USERS_RATE,

      99.2,

      '920',
    );

    const response = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/compare?fromVersion=7.1.0&toVersion=7.2.0`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    const startup = response.body.metrics.find((item: { metric: string }) => item.metric === 'COLD_STARTUP_MS');

    const crashFree = response.body.metrics.find((item: { metric: string }) => item.metric === 'CRASH_FREE_USERS_RATE');

    expect(startup.before).toBe(1200);

    expect(startup.after).toBe(1800);

    expect(startup.direction).toBe('DEGRADED');

    expect(crashFree.before).toBe(98);

    expect(crashFree.after).toBe(99.2);

    expect(crashFree.direction).toBe('IMPROVED');
  });

  it('returns iOS version summaries', async () => {
    await createMetric(
      '7.1.0',

      MobilePerformanceMetricType.CRASH_RATE,

      1.8,

      '900',
    );

    await createMetric(
      '7.2.0',

      MobilePerformanceMetricType.CRASH_RATE,

      1.1,

      '920',
    );

    const response = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/versions`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          version: '7.1.0',

          platform: 'IOS',
        }),

        expect.objectContaining({
          version: '7.2.0',

          platform: 'IOS',
        }),
      ]),
    );
  });
});
