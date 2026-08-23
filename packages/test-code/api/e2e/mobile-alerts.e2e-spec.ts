import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { MobilePerformanceMetricType, RepositoryProvider } from 'src/generated/prisma/enums';

import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

describe('Mobile Alerts E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>;

  let workspaceId: string;
  let mobileAppId: string;
  let applicationId: string;

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
        name: `Alert App ${sequence}`,

        platform: 'ANDROID',

        framework: 'ANDROID_NATIVE',

        packageId: `com.commandcenter.alert${sequence}`,
      })
      .expect(201);

    mobileAppId = mobile.body.id;

    applicationId = mobile.body.applicationId;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createCrashRule(threshold: number) {
    const response = await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/alerts/rules`)
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Crash rate alert',

        type: 'CRASH_RATE',

        threshold,

        cooldownMinutes: 1,

        enabled: true,
      })
      .expect(201);

    return response.body;
  }

  async function createBuildFailureRule() {
    const response = await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/alerts/rules`)
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Build failure alert',

        type: 'BUILD_FAILED',

        cooldownMinutes: 1,

        enabled: true,
      })
      .expect(201);

    return response.body;
  }

  async function createCrashRate(value: number) {
    return prisma.mobilePerformanceMetric.create({
      data: {
        workspaceId,
        mobileAppId,

        platform: 'ANDROID',

        version: '1.0.0',

        buildNumber: '100',

        metric: MobilePerformanceMetricType.CRASH_RATE,

        value,

        collectedAt: new Date(),
      },
    });
  }

  async function evaluate() {
    return owner.agent.post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/alerts/evaluate`).set(withBearer(owner.accessToken)).expect(201);
  }

  async function createRepository() {
    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: `alert-install-${sequence}`,

        accountLogin: 'alerts',

        accountType: 'Organization',
      },
    });

    return prisma.repositoryConnection.create({
      data: {
        workspaceId,

        installationId: installation.id,

        applicationId,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: `alert-repo-${sequence}`,

        owner: 'alerts',

        name: 'mobile',

        fullName: 'alerts/mobile',

        defaultBranch: 'main',

        isPrivate: true,

        htmlUrl: 'https://github.com/alerts/mobile',

        archived: false,

        isAvailable: true,
      },
    });
  }

  async function createBuild(input: { status: 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' }) {
    const repository = await createRepository();

    return prisma.mobileBuild.create({
      data: {
        workspaceId,
        mobileAppId,

        repositoryId: repository.id,

        workflowRunId: `alert-build-${sequence}`,

        source: 'GITHUB_ACTIONS',

        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

        branch: 'main',

        version: '1.0.0',

        buildNumber: '100',

        platform: 'ANDROID',

        status: input.status,
      },
    });
  }

  it('metric below threshold creates no incident', async () => {
    await createCrashRule(2);

    await createCrashRate(1);

    await evaluate();

    expect(await prisma.mobileAlertIncident.count()).toBe(0);
  });

  it('metric above threshold creates one incident and notifications', async () => {
    await createCrashRule(2);

    await createCrashRate(3);

    await evaluate();

    expect(await prisma.mobileAlertIncident.count()).toBe(1);

    expect(await prisma.notification.count()).toBeGreaterThan(0);
  });

  it('duplicate evaluation does not duplicate active incident', async () => {
    await createCrashRule(2);

    await createCrashRate(3);

    await evaluate();
    await evaluate();
    await evaluate();

    expect(
      await prisma.mobileAlertIncident.count({
        where: {
          status: 'OPEN',
        },
      }),
    ).toBe(1);
  });

  it('recovery resolves incident', async () => {
    await createCrashRule(2);

    await createCrashRate(3);

    await evaluate();

    await prisma.mobilePerformanceMetric.deleteMany();

    await createCrashRate(1);

    await evaluate();

    expect((await prisma.mobileAlertIncident.findFirstOrThrow()).status).toBe('RESOLVED');
  });

  it('disabled rule does not trigger', async () => {
    const rule = await createCrashRule(2);

    await prisma.mobileAlertRule.update({
      where: {
        id: rule.id,
      },

      data: {
        enabled: false,
      },
    });

    await createCrashRate(10);

    await evaluate();

    expect(await prisma.mobileAlertIncident.count()).toBe(0);
  });

  it('failed build triggers build-failure incident', async () => {
    await createBuildFailureRule();

    await createBuild({
      status: 'FAILED',
    });

    await evaluate();

    expect(
      await prisma.mobileAlertIncident.count({
        where: {
          status: 'OPEN',
        },
      }),
    ).toBe(1);
  });
});
