import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { MobilePerformanceMetricType, MobilePlatform } from 'src/generated/prisma/enums';

import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

describe('Unified Mobile Performance E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>;

  let workspaceId: string;
  let androidId: string;
  let iosId: string;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);

    owner = await registerWorkspaceTestUser(app, prisma);

    workspaceId = owner.workspaceId;

    const android = await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Unified Android',
        platform: 'ANDROID',
        framework: 'ANDROID_NATIVE',
        packageId: 'com.commandcenter.unified.android',
      })
      .expect(201);

    androidId = android.body.id;

    const ios = await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Unified iOS',
        platform: 'IOS',
        framework: 'IOS_NATIVE',
        bundleId: 'com.commandcenter.unified.ios',
      })
      .expect(201);

    iosId = ios.body.id;
  });

  afterEach(async () => {
    await app.close();
  });

  async function metric(
    mobileAppId: string,
    platform: MobilePlatform,
    version: string,
    buildNumber: string,
    type: MobilePerformanceMetricType,
    value: number,
    collectedAt = new Date(),
  ) {
    return prisma.mobilePerformanceMetric.create({
      data: {
        workspaceId,
        mobileAppId,
        platform,
        version,
        buildNumber,
        metric: type,
        value,
        collectedAt,
      },
    });
  }

  it('keeps Android and iOS performance isolated', async () => {
    await metric(androidId, MobilePlatform.ANDROID, '2.0.0', '200', MobilePerformanceMetricType.COLD_STARTUP_MS, 1500);

    await metric(iosId, MobilePlatform.IOS, '2.0.0', '200', MobilePerformanceMetricType.COLD_STARTUP_MS, 900);

    const android = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${androidId}/performance/summary`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    const ios = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${iosId}/performance/summary`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    expect(android.body.platform).toBe('ANDROID');
    expect(ios.body.platform).toBe('IOS');

    expect(android.body.metrics.COLD_STARTUP_MS.value).toBe(1500);

    expect(ios.body.metrics.COLD_STARTUP_MS.value).toBe(900);
  });

  it('filters performance by platform', async () => {
    await metric(androidId, MobilePlatform.ANDROID, '3.0.0', '300', MobilePerformanceMetricType.MEMORY_MB, 180);

    const response = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${androidId}/performance/summary?platform=ANDROID`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    expect(response.body.platform).toBe('ANDROID');

    expect(response.body.metrics.MEMORY_MB.value).toBe(180);
  });

  it('filters performance by build number', async () => {
    await metric(androidId, MobilePlatform.ANDROID, '4.0.0', '400', MobilePerformanceMetricType.COLD_STARTUP_MS, 1000);

    await metric(androidId, MobilePlatform.ANDROID, '4.0.0', '401', MobilePerformanceMetricType.COLD_STARTUP_MS, 2000);

    const response = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${androidId}/performance/summary?version=4.0.0&buildNumber=400`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    expect(response.body.buildNumber).toBe('400');

    expect(response.body.metrics.COLD_STARTUP_MS.value).toBe(1000);
  });

  it('filters metrics by date range', async () => {
    await metric(iosId, MobilePlatform.IOS, '5.0.0', '500', MobilePerformanceMetricType.MEMORY_MB, 100, new Date('2026-08-01T00:00:00.000Z'));

    await metric(iosId, MobilePlatform.IOS, '5.0.0', '500', MobilePerformanceMetricType.MEMORY_MB, 300, new Date('2026-08-20T00:00:00.000Z'));

    const response = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${iosId}/performance/summary?from=2026-08-15T00:00:00.000Z&to=2026-08-25T00:00:00.000Z`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    expect(response.body.metrics.MEMORY_MB.value).toBe(300);
  });

  it('compares versions using normalized metrics', async () => {
    await metric(androidId, MobilePlatform.ANDROID, '5.0.0', '500', MobilePerformanceMetricType.CRASH_RATE, 3);

    await metric(androidId, MobilePlatform.ANDROID, '6.0.0', '600', MobilePerformanceMetricType.CRASH_RATE, 1);

    const response = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${androidId}/performance/compare?fromVersion=5.0.0&toVersion=6.0.0`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    const crash = response.body.metrics.find((item: { metric: string }) => item.metric === 'CRASH_RATE');

    expect(crash.before).toBe(3);
    expect(crash.after).toBe(1);
    expect(crash.direction).toBe('IMPROVED');
  });

  it('lists versions independently for Android and iOS', async () => {
    await metric(androidId, MobilePlatform.ANDROID, '10.0.0', '1000', MobilePerformanceMetricType.CRASH_RATE, 1);

    await metric(iosId, MobilePlatform.IOS, '20.0.0', '2000', MobilePerformanceMetricType.CRASH_RATE, 2);

    const android = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${androidId}/performance/versions`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    const ios = await owner.agent
      .get(`${API}/workspaces/${workspaceId}/mobile-apps/${iosId}/performance/versions`)
      .set(withBearer(owner.accessToken))
      .expect(200);

    expect(android.body.some((item: { version: string }) => item.version === '10.0.0')).toBe(true);

    expect(android.body.some((item: { version: string }) => item.version === '20.0.0')).toBe(false);

    expect(ios.body.some((item: { version: string }) => item.version === '20.0.0')).toBe(true);
  });
});
