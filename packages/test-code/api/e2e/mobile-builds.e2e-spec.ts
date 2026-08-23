import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { RepositoryProvider } from 'src/generated/prisma/enums';

import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

describe('Mobile Builds E2E', () => {
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

  async function fixture() {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobileResponse = await owner.agent.post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`).set(withBearer(owner.accessToken)).send({
      name: 'Build App',

      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',
    });

    expect(mobileResponse.status).toBe(201);

    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId: owner.workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: 'phase8-install',

        accountLogin: 'command-center',

        accountType: 'Organization',
      },
    });

    const repository = await prisma.repositoryConnection.create({
      data: {
        workspaceId: owner.workspaceId,

        installationId: installation.id,

        applicationId: mobileResponse.body.applicationId,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: 'phase8-repo',

        owner: 'command-center',

        name: 'android',

        fullName: 'command-center/android',

        defaultBranch: 'development',

        isPrivate: true,

        htmlUrl: 'https://github.com/command-center/android',

        archived: false,

        isAvailable: true,
      },
    });

    return {
      owner,
      mobile: mobileResponse.body,
      repository,
    };
  }

  function buildPayload(repositoryId: string, status: 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED' = 'QUEUED') {
    return {
      repositoryId,

      workflowRunId: '123456',

      commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',

      branch: 'development',

      version: '6.14.0',

      buildNumber: '815',

      platform: 'ANDROID',

      status,

      startedAt: '2026-08-22T10:00:00.000Z',

      completedAt: status === 'SUCCESS' || status === 'FAILED' ? '2026-08-22T10:08:32.000Z' : null,
    };
  }

  it('creates build from GitHub ingestion', async () => {
    const data = await fixture();

    const response = await data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/ingest/github`)
      .set(withBearer(data.owner.accessToken))
      .send(buildPayload(data.repository.id));

    expect(response.status).toBe(201);

    expect(response.body.ignored).toBe(false);

    expect(response.body.build.status).toBe('QUEUED');
  });

  it('does not duplicate repeated workflow delivery', async () => {
    const data = await fixture();

    const url = `${API}/workspaces/${data.owner.workspaceId}` + `/mobile-apps/${data.mobile.id}` + '/builds/ingest/github';

    const payload = buildPayload(data.repository.id);

    await data.owner.agent.post(url).set(withBearer(data.owner.accessToken)).send(payload).expect(201);

    await data.owner.agent.post(url).set(withBearer(data.owner.accessToken)).send(payload).expect(201);

    expect(await prisma.mobileBuild.count()).toBe(1);
  });

  it('transitions queued to building to success', async () => {
    const data = await fixture();

    const url = `${API}/workspaces/${data.owner.workspaceId}` + `/mobile-apps/${data.mobile.id}` + '/builds/ingest/github';

    for (const status of ['QUEUED', 'BUILDING', 'SUCCESS'] as const) {
      await data.owner.agent.post(url).set(withBearer(data.owner.accessToken)).send(buildPayload(data.repository.id, status)).expect(201);
    }

    const build = await prisma.mobileBuild.findFirstOrThrow();

    expect(build.status).toBe('SUCCESS');

    expect(build.durationMs).toBe(512000);
  });

  it('stores failed build', async () => {
    const data = await fixture();

    await data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/ingest/github`)
      .set(withBearer(data.owner.accessToken))
      .send(buildPayload(data.repository.id, 'FAILED'))
      .expect(201);

    expect((await prisma.mobileBuild.findFirstOrThrow()).status).toBe('FAILED');
  });

  it('ignores unrelated repository', async () => {
    const data = await fixture();

    const other = await registerWorkspaceTestUser(app, prisma);

    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId: other.workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: 'other-install',

        accountLogin: 'other',

        accountType: 'Organization',
      },
    });

    const repository = await prisma.repositoryConnection.create({
      data: {
        workspaceId: other.workspaceId,

        installationId: installation.id,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: 'other-repo',

        owner: 'other',

        name: 'other',

        fullName: 'other/other',

        defaultBranch: 'main',

        isPrivate: true,

        htmlUrl: 'https://github.com/other/other',

        archived: false,

        isAvailable: true,
      },
    });

    const response = await data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/ingest/github`)
      .set(withBearer(data.owner.accessToken))
      .send(buildPayload(repository.id));

    expect(response.body.ignored).toBe(true);

    expect(await prisma.mobileBuild.count()).toBe(0);
  });

  it('lists only current app builds', async () => {
    const data = await fixture();

    await data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/ingest/github`)
      .set(withBearer(data.owner.accessToken))
      .send(buildPayload(data.repository.id, 'SUCCESS'))
      .expect(201);

    const response = await data.owner.agent
      .get(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds`)
      .set(withBearer(data.owner.accessToken));

    expect(response.status).toBe(200);

    expect(response.body).toHaveLength(1);
  });
});
