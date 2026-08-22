import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { RepositoryProvider, WorkspaceRole } from 'src/generated/prisma/enums';

import { withBearer } from '../helpers/auth';

import { createTestApp } from '../helpers/create-test-app';

import { resetDatabase } from '../helpers/database';

import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

describe('Mobile Repository Linking E2E', () => {
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

  async function createMobile(owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>) {
    const response = await owner.agent.post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`).set(withBearer(owner.accessToken)).send({
      name: 'Repository Test Mobile',

      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',

      packageId: 'com.example.mobile',
    });

    expect(response.status).toBe(201);

    return response.body as {
      id: string;

      applicationId: string;
    };
  }

  async function createRepository(workspaceId: string, suffix: string, archived = false) {
    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: `90${suffix}`,

        accountLogin: `mobile-fixture-${suffix}`,

        accountType: 'Organization',
      },
    });

    return prisma.repositoryConnection.create({
      data: {
        workspaceId,

        installationId: installation.id,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: `80${suffix}`,

        owner: 'command-center',

        name: `mobile-${suffix}`,

        fullName: `command-center/mobile-${suffix}`,

        defaultBranch: 'main',

        isPrivate: true,

        htmlUrl: `https://github.com/command-center/mobile-${suffix}`,

        archived,

        isAvailable: true,
      },
    });
  }

  it('links repository to mobile application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    const repository = await createRepository(owner.workspaceId, '101');

    const response = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/repository`)
      .set(withBearer(owner.accessToken))
      .send({
        repositoryId: repository.id,
      });

    expect(response.status).toBe(201);

    expect(response.body.id).toBe(repository.id);

    const stored = await prisma.repositoryConnection.findUniqueOrThrow({
      where: {
        id: repository.id,
      },
    });

    expect(stored.applicationId).toBe(mobile.applicationId);
  });

  it('changes repository without leaving duplicate mobile links', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    const first = await createRepository(owner.workspaceId, '201');

    const second = await createRepository(owner.workspaceId, '202');

    const url = `${API}/workspaces/${owner.workspaceId}` + `/mobile-apps/${mobile.id}/repository`;

    await owner.agent
      .post(url)
      .set(withBearer(owner.accessToken))
      .send({
        repositoryId: first.id,
      })
      .expect(201);

    await owner.agent
      .post(url)
      .set(withBearer(owner.accessToken))
      .send({
        repositoryId: second.id,
      })
      .expect(201);

    const links = await prisma.repositoryConnection.findMany({
      where: {
        workspaceId: owner.workspaceId,

        applicationId: mobile.applicationId,
      },
    });

    expect(links).toHaveLength(1);

    expect(links[0]?.id).toBe(second.id);
  });

  it('unlinks repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    const repository = await createRepository(owner.workspaceId, '301');

    const url = `${API}/workspaces/${owner.workspaceId}` + `/mobile-apps/${mobile.id}/repository`;

    await owner.agent
      .post(url)
      .set(withBearer(owner.accessToken))
      .send({
        repositoryId: repository.id,
      })
      .expect(201);

    await owner.agent.delete(url).set(withBearer(owner.accessToken)).expect(200);

    const stored = await prisma.repositoryConnection.findUniqueOrThrow({
      where: {
        id: repository.id,
      },
    });

    expect(stored.applicationId).toBeNull();
  });

  it('rejects repository from another workspace', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);

    const workspaceB = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(workspaceA);

    const repository = await createRepository(workspaceB.workspaceId, '401');

    const response = await workspaceA.agent
      .post(`${API}/workspaces/${workspaceA.workspaceId}/mobile-apps/${mobile.id}/repository`)
      .set(withBearer(workspaceA.accessToken))
      .send({
        repositoryId: repository.id,
      });

    expect(response.status).toBe(404);
  });

  it('rejects archived repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    const repository = await createRepository(owner.workspaceId, '501', true);

    const response = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/repository`)
      .set(withBearer(owner.accessToken))
      .send({
        repositoryId: repository.id,
      });

    expect(response.status).toBe(400);
  });

  it('prevents viewer from changing repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner);

    const repository = await createRepository(owner.workspaceId, '601');

    await prisma.workspaceMember.updateMany({
      where: {
        workspaceId: owner.workspaceId,
      },

      data: {
        role: WorkspaceRole.VIEWER,
      },
    });

    const response = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/repository`)
      .set(withBearer(owner.accessToken))
      .send({
        repositoryId: repository.id,
      });

    expect(response.status).toBe(403);
  });
});
