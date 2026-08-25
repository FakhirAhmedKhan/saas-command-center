import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { RepositoryProvider } from 'src/generated/prisma/enums';

const API = '/api/v1';

describe('Mobile Full Flow E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes create, repository, build, tests, and release lifecycle', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const mobileResponse = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Mobile Full Flow',
        platform: 'ANDROID',
        framework: 'ANDROID_NATIVE',
        packageId: 'com.commandcenter.fullflow',
        currentVersion: '1.0.0',
        currentBuildNumber: '100',
      })
      .expect(201);
    const mobile = mobileResponse.body as {
      id: string;
      applicationId: string;
    };
    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId: owner.workspaceId,
        provider: RepositoryProvider.GITHUB,
        externalInstallationId: 'mobile-full-flow-installation',
        accountLogin: 'command-center',
        accountType: 'Organization',
      },
    });
    const repository = await prisma.repositoryConnection.create({
      data: {
        workspaceId: owner.workspaceId,
        installationId: installation.id,
        provider: RepositoryProvider.GITHUB,
        externalRepoId: 'mobile-full-flow-repository',
        owner: 'command-center',
        name: 'mobile-full-flow',
        fullName: 'command-center/mobile-full-flow',
        defaultBranch: 'main',
        isPrivate: true,
        htmlUrl: 'https://github.com/command-center/mobile-full-flow',
        archived: false,
        isAvailable: true,
      },
    });

    await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/repository`)
      .set(withBearer(owner.accessToken))
      .send({
        repositoryId: repository.id,
      })
      .expect(201);

    const buildUrl = `${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/builds/ingest/github`;
    const buildPayload = {
      repositoryId: repository.id,
      workflowRunId: 'mobile-full-flow-run-100',
      commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
      branch: 'main',
      version: '1.0.0',
      buildNumber: '100',
      platform: 'ANDROID',
      status: 'SUCCESS',
      startedAt: '2026-08-25T10:00:00.000Z',
      completedAt: '2026-08-25T10:05:00.000Z',
    };
    const buildResponse = await owner.agent.post(buildUrl).set(withBearer(owner.accessToken)).send(buildPayload).expect(201);

    await owner.agent.post(buildUrl).set(withBearer(owner.accessToken)).send(buildPayload).expect(201);

    expect(
      await prisma.mobileBuild.count({
        where: {
          repositoryId: repository.id,
          workflowRunId: buildPayload.workflowRunId,
        },
      }),
    ).toBe(1);

    const build = buildResponse.body.build as {
      id: string;
      commitSha: string;
    };
    const testResponse = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/builds/${build.id}/tests/ingest`)
      .set(withBearer(owner.accessToken))
      .send({
        type: 'UNIT',
        status: 'PASSED',
        passed: 120,
        failed: 0,
        skipped: 2,
        durationMs: 24000,
      })
      .expect(201);

    expect(testResponse.body).toMatchObject({
      type: 'UNIT',
      status: 'PASSED',
      passed: 120,
      failed: 0,
      skipped: 2,
    });

    const releaseResponse = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases`)
      .set(withBearer(owner.accessToken))
      .send({
        buildId: build.id,
        environment: 'PRODUCTION',
        releaseNotes: 'Verified full-flow release',
      })
      .expect(201);
    const releaseUrl = `${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/releases/${releaseResponse.body.id}/status`;

    await owner.agent
      .patch(releaseUrl)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'READY',
      })
      .expect(200);

    const releasedResponse = await owner.agent
      .patch(releaseUrl)
      .set(withBearer(owner.accessToken))
      .send({
        status: 'RELEASED',
      })
      .expect(200);

    expect(releasedResponse.body).toMatchObject({
      buildId: build.id,
      version: '1.0.0',
      buildNumber: '100',
      environment: 'PRODUCTION',
      status: 'RELEASED',
      commitSha: build.commitSha,
    });

    const persistedRepository = await prisma.repositoryConnection.findUniqueOrThrow({
      where: {
        id: repository.id,
      },
    });

    expect(persistedRepository.applicationId).toBe(mobile.applicationId);
    expect(await prisma.mobileTestRun.count({ where: { buildId: build.id } })).toBe(1);
    expect(await prisma.mobileRelease.count({ where: { buildId: build.id } })).toBe(1);
  });
});
