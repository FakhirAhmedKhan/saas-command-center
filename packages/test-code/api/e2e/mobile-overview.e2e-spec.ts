import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { RepositoryProvider } from 'src/generated/prisma/enums';

import { withBearer } from '../helpers/auth';

import { createTestApp } from '../helpers/create-test-app';

import { resetDatabase } from '../helpers/database';

import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

describe('Mobile Overview E2E', () => {
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

  async function createMobile(owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>, overrides: Record<string, unknown> = {}) {
    const response = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Karwa Passenger',

        platform: 'ANDROID',

        framework: 'ANDROID_NATIVE',

        packageId: 'com.karwa.app',

        minOsVersion: '26',

        targetOsVersion: '36',

        currentVersion: '6.14.0',

        currentBuildNumber: '815',

        ...overrides,
      });

    expect(response.status).toBe(201);

    return response.body;
  }

  async function createRepository(workspaceId: string, applicationId: string) {
    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: '760001',

        accountLogin: 'karwa',

        accountType: 'Organization',
      },
    });

    return prisma.repositoryConnection.create({
      data: {
        workspaceId,

        installationId: installation.id,

        applicationId,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: '860001',

        owner: 'karwa',

        name: 'karwa-android',

        fullName: 'karwa/karwa-android',

        defaultBranch: 'development',

        isPrivate: true,

        htmlUrl: 'https://github.com/karwa/karwa-android',

        archived: false,

        isAvailable: true,
      },
    });
  }

  it('returns mobile overview metadata', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    const response = await owner.agent.get(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/overview`).set(withBearer(owner.accessToken));

    expect(response.status).toBe(200);

    expect(response.body.mobileApp).toMatchObject({
      id: mobile.id,

      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',

      packageId: 'com.karwa.app',

      minOsVersion: '26',

      targetOsVersion: '36',

      currentVersion: '6.14.0',

      currentBuildNumber: '815',
    });

    expect(response.body.repository).toBeNull();

    expect(response.body.latestBuild).toBeNull();

    expect(response.body.latestRelease).toBeNull();

    expect(response.body.latestPerformance).toBeNull();
  });

  it('returns linked repository data', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    const repository = await createRepository(owner.workspaceId, mobile.applicationId);

    const response = await owner.agent.get(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/overview`).set(withBearer(owner.accessToken));

    expect(response.status).toBe(200);

    expect(response.body.repository).toMatchObject({
      id: repository.id,

      fullName: 'karwa/karwa-android',

      defaultBranch: 'development',

      archived: false,

      isAvailable: true,
    });
  });

  it('handles missing optional metadata', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner, {
      packageId: null,

      minOsVersion: null,

      targetOsVersion: null,

      currentVersion: null,

      currentBuildNumber: null,
    });

    const response = await owner.agent.get(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/overview`).set(withBearer(owner.accessToken));

    expect(response.status).toBe(200);

    expect(response.body.mobileApp.currentVersion).toBeNull();

    expect(response.body.mobileApp.currentBuildNumber).toBeNull();
  });

  it('prevents another workspace from opening overview', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);

    const workspaceB = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(workspaceA);

    const response = await workspaceB.agent
      .get(`${API}/workspaces/${workspaceA.workspaceId}/mobile-apps/${mobile.id}/overview`)
      .set(withBearer(workspaceB.accessToken));

    expect([403, 404]).toContain(response.status);
  });

  it('keeps archived mobile application available for historical overview', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    await owner.agent.delete(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}`).set(withBearer(owner.accessToken)).expect(200);

    const response = await owner.agent.get(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/overview`).set(withBearer(owner.accessToken));

    expect(response.status).toBe(200);

    expect(response.body.mobileApp.application.archivedAt).not.toBeNull();
  });

  it('rejects unauthenticated overview access', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    await owner.agent.get(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/overview`).expect(401);
  });
});
