import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { MobileBuildStatus, MobilePlatform, RepositoryProvider } from 'src/generated/prisma/enums';

const API = '/api/v1';

describe('Mobile Releases E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sequence = 0;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  async function createReleaseFixture(options?: { buildStatus?: 'SUCCESS' | 'FAILED' }) {
    sequence += 1;

    const suffix = `${Date.now()}-${sequence}`;
    const owner = await registerWorkspaceTestUser(app, prisma);
    const mobileResponse = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: `Release App ${suffix}`,
        platform: 'ANDROID',
        framework: 'ANDROID_NATIVE',
        packageId: `com.commandcenter.release${sequence}`,
      })
      .expect(201);
    const mobile = mobileResponse.body;
    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId: owner.workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: `phase10-install-${suffix}`,

        accountLogin: `phase10-${sequence}`,

        accountType: 'Organization',
      },
    });
    const repository = await prisma.repositoryConnection.create({
      data: {
        workspaceId: owner.workspaceId,

        installationId: installation.id,

        applicationId: mobile.applicationId,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: `phase10-repo-${suffix}`,

        owner: 'command-center',

        name: `android-${sequence}`,

        fullName: `command-center/android-${sequence}`,

        defaultBranch: 'development',

        isPrivate: true,

        htmlUrl: `https://github.com/command-center/android-${sequence}`,

        archived: false,

        isAvailable: true,
      },
    });
    const status = options?.buildStatus === 'FAILED' ? MobileBuildStatus.FAILED : MobileBuildStatus.SUCCESS;
    const build = await prisma.mobileBuild.create({
      data: {
        workspaceId: owner.workspaceId,

        mobileAppId: mobile.id,

        repositoryId: repository.id,

        workflowRunId: `phase10-run-${suffix}`,

        commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',

        branch: 'development',

        version: '6.14.0',

        buildNumber: '815',

        platform: MobilePlatform.ANDROID,

        status,

        startedAt: new Date('2026-08-22T10:00:00.000Z'),

        completedAt: new Date('2026-08-22T10:08:32.000Z'),

        durationMs: 512000,
      },
    });

    return {
      owner,
      mobile,
      build,
      repository,
    };
  }

  it('creates release from successful build', async () => {
    const { owner, mobile, build } = await createReleaseFixture({
      buildStatus: 'SUCCESS',
    });
    const response = await owner.agent.post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`).set(withBearer(owner.accessToken)).send({
      buildId: build.id,

      environment: 'PRODUCTION',

      releaseNotes: 'Production release',
    });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      buildId: build.id,

      version: '6.14.0',

      buildNumber: '815',

      environment: 'PRODUCTION',

      status: 'DRAFT',

      commitSha: build.commitSha,

      releaseNotes: 'Production release',
    });
  });

  it('rejects failed build', async () => {
    const { owner, mobile, build } = await createReleaseFixture({
      buildStatus: 'FAILED',
    });

    await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: build.id,

        environment: 'BETA',
      })
      .expect(400);
  });

  it('rejects nonexistent build', async () => {
    const { owner, mobile } = await createReleaseFixture();

    await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: '11111111-1111-4111-8111-111111111111',

        environment: 'BETA',
      })
      .expect(404);
  });

  it('transitions DRAFT to READY to RELEASED to ROLLED_BACK', async () => {
    const { owner, mobile, build } = await createReleaseFixture();
    const created = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: build.id,

        environment: 'PRODUCTION',
      })
      .expect(201);
    const url = `${API}/workspaces/${owner.workspaceId}` + `/mobile-apps/${mobile.id}` + `/releases/${created.body.id}/status`;

    await owner.agent
      .patch(url)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'READY',
      })
      .expect(200);

    const released = await owner.agent
      .patch(url)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'RELEASED',
      })
      .expect(200);

    expect(released.body.status).toBe('RELEASED');

    expect(released.body.releasedAt).not.toBeNull();

    const rolledBack = await owner.agent
      .patch(url)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'ROLLED_BACK',
      })
      .expect(200);

    expect(rolledBack.body.status).toBe('ROLLED_BACK');
  });

  it('rejects invalid lifecycle transition', async () => {
    const { owner, mobile, build } = await createReleaseFixture();
    const created = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: build.id,

        environment: 'PRODUCTION',
      })
      .expect(201);

    await owner.agent
      .patch(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases/${created.body.id}/status`)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'RELEASED',
      })
      .expect(400);
  });

  it('prevents cross-workspace build release', async () => {
    const workspaceA = await createReleaseFixture();
    const workspaceB = await createReleaseFixture();

    await workspaceA.owner.agent
      .post(`${API}/workspaces/${workspaceA.owner.workspaceId}/mobile-apps/${workspaceA.mobile.id}/releases`)
      .set(withBearer(workspaceA.owner.accessToken))
      .send({
        buildId: workspaceB.build.id,

        environment: 'PRODUCTION',
      })
      .expect(404);

    expect(await prisma.mobileRelease.count()).toBe(0);
  });

  it('prevents archived app from creating a release', async () => {
    const { owner, mobile, build } = await createReleaseFixture();

    await prisma.saasApplication.update({
      where: {
        id: mobile.applicationId,
      },

      data: {
        archivedAt: new Date(),
      },
    });

    await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: build.id,

        environment: 'PRODUCTION',
      })
      .expect(400);

    expect(await prisma.mobileRelease.count()).toBe(0);
  });
});
