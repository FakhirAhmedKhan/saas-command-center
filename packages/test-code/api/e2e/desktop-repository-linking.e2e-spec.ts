import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { addWorkspaceMember, registerWorkspaceTestUser } from '../helpers/workspace';
import { PrismaService } from 'src/database/prisma.service';
import { RepositoryProvider, WorkspaceRole } from 'src/generated/prisma/enums';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

describe('Desktop Repository Linking E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  let sequence = 0;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    sequence = 0;
  });

  afterEach(async () => {
    await resetDatabase(prisma);

    await app.close();
  });

  function nextExternalId(prefix: string): string {
    sequence += 1;

    return `${prefix}${Date.now()}${sequence}`.slice(0, 32);
  }

  async function createDesktopApp(owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>) {
    sequence += 1;

    const response = await owner.agent
      .post(`/api/v1/workspaces/${owner.workspaceId}/desktop-apps`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: `Desktop Repository App ${Date.now()}-${sequence}`,

        platform: 'CROSS_PLATFORM',

        framework: 'ELECTRON',

        architecture: 'X64',

        packageName: `com.commandcenter.desktop.repo${Date.now()}${sequence}`,
      });

    expect(response.status).toBe(201);

    return response.body as {
      id: string;
      applicationId: string;
    };
  }

  async function createRepository(
    workspaceId: string,
    options: {
      archived?: boolean;
      isAvailable?: boolean;
      name?: string;
    } = {},
  ) {
    const { archived = false, isAvailable = true, name = 'desktop-repository' } = options;

    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: nextExternalId('installation'),

        accountLogin: 'command-center',

        accountType: 'Organization',
      },
    });

    sequence += 1;

    const repositoryName = `${name}-${sequence}`;

    return prisma.repositoryConnection.create({
      data: {
        workspaceId,

        installationId: installation.id,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: nextExternalId('repository'),

        owner: 'command-center',

        name: repositoryName,

        fullName: `command-center/${repositoryName}`,

        defaultBranch: 'main',

        isPrivate: false,

        htmlUrl: `https://github.com/command-center/${repositoryName}`,

        archived,

        isAvailable,
      },
    });
  }

  function repositoryPath(workspaceId: string, desktopAppId: string) {
    return `/api/v1/workspaces/${workspaceId}` + `/desktop-apps/${desktopAppId}` + '/repository';
  }

  it('links repository to desktop application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repository = await createRepository(owner.workspaceId);

    const response = await owner.agent.post(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${owner.accessToken}`).send({
      repositoryId: repository.id,
    });

    expect(response.status).toBe(201);

    expect(response.body.id).toBe(repository.id);

    expect(response.body.applicationId).toBe(desktopApp.applicationId);

    const persisted = await prisma.repositoryConnection.findUnique({
      where: {
        id: repository.id,
      },
    });

    expect(persisted?.applicationId).toBe(desktopApp.applicationId);
  });

  it('returns linked repository after reload/read', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repository = await createRepository(owner.workspaceId);

    await owner.agent
      .post(repositoryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        repositoryId: repository.id,
      })
      .expect(201);

    const response = await owner.agent.get(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(repository.id);

    expect(response.body.fullName).toBe(repository.fullName);

    expect(response.body.defaultBranch).toBe('main');
  });

  it('changes repository without leaving duplicate desktop links', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repositoryA = await createRepository(owner.workspaceId, {
      name: 'desktop-a',
    });

    const repositoryB = await createRepository(owner.workspaceId, {
      name: 'desktop-b',
    });

    await owner.agent
      .post(repositoryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        repositoryId: repositoryA.id,
      })
      .expect(201);

    await owner.agent
      .post(repositoryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        repositoryId: repositoryB.id,
      })
      .expect(201);

    const linkedRepositories = await prisma.repositoryConnection.findMany({
      where: {
        workspaceId: owner.workspaceId,

        applicationId: desktopApp.applicationId,
      },

      orderBy: {
        id: 'asc',
      },
    });

    expect(linkedRepositories).toHaveLength(1);

    expect(linkedRepositories[0]?.id).toBe(repositoryB.id);

    const previousRepository = await prisma.repositoryConnection.findUnique({
      where: {
        id: repositoryA.id,
      },
    });

    expect(previousRepository?.applicationId).toBeNull();
  });

  it('unlinks repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repository = await createRepository(owner.workspaceId);

    await owner.agent
      .post(repositoryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        repositoryId: repository.id,
      })
      .expect(201);

    const deleteResponse = await owner.agent.delete(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(200);

    expect(deleteResponse.body).toEqual({
      success: true,
    });

    const persisted = await prisma.repositoryConnection.findUnique({
      where: {
        id: repository.id,
      },
    });

    expect(persisted?.applicationId).toBeNull();

    const readResponse = await owner.agent.get(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${owner.accessToken}`);

    expect(readResponse.status).toBe(200);

    expect(readResponse.text).toBe('');
    expect(readResponse.body).toEqual({});
  });

  it('rejects repository from another workspace', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);

    const workspaceB = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(workspaceA);

    const repository = await createRepository(workspaceB.workspaceId);

    const response = await workspaceA.agent
      .post(repositoryPath(workspaceA.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${workspaceA.accessToken}`)
      .send({
        repositoryId: repository.id,
      });

    /*
     * Same-workspace find should hide the
     * foreign resource.
     */
    expect([403, 404]).toContain(response.status);

    const persisted = await prisma.repositoryConnection.findUnique({
      where: {
        id: repository.id,
      },
    });

    expect(persisted?.applicationId).toBeNull();
  });

  it('rejects missing repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const response = await owner.agent.post(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${owner.accessToken}`).send({
      repositoryId: randomUUID(),
    });

    expect(response.status).toBe(404);
  });

  it('rejects malformed repository ID', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const response = await owner.agent.post(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${owner.accessToken}`).send({
      repositoryId: 'not-a-uuid',
    });

    expect(response.status).toBe(400);
  });

  it('rejects archived repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repository = await createRepository(owner.workspaceId, {
      archived: true,
    });

    const response = await owner.agent.post(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${owner.accessToken}`).send({
      repositoryId: repository.id,
    });

    expect(response.status).toBe(400);
  });

  it('rejects unavailable repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repository = await createRepository(owner.workspaceId, {
      isAvailable: false,
    });

    const response = await owner.agent.post(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${owner.accessToken}`).send({
      repositoryId: repository.id,
    });

    /*
     * Depending on RepositoriesService.findOne()
     * unavailable repositories may be hidden as 404
     * or returned and rejected by this service as 400.
     */
    expect([400, 404]).toContain(response.status);
  });

  it('prevents viewer from linking repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repository = await createRepository(owner.workspaceId);

    const membershipResponse = await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    expect([200, 201]).toContain(membershipResponse.status);

    const response = await viewer.agent.post(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${viewer.accessToken}`).send({
      repositoryId: repository.id,
    });

    expect(response.status).toBe(403);
  });

  it('prevents viewer from unlinking repository', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repository = await createRepository(owner.workspaceId);

    await owner.agent
      .post(repositoryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        repositoryId: repository.id,
      })
      .expect(201);

    await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    const response = await viewer.agent.delete(repositoryPath(owner.workspaceId, desktopApp.id)).set('Authorization', `Bearer ${viewer.accessToken}`);

    expect(response.status).toBe(403);
  });

  it('requires authentication for repository modification', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const desktopApp = await createDesktopApp(owner);

    const repository = await createRepository(owner.workspaceId);

    const response = await owner.agent.post(repositoryPath(owner.workspaceId, desktopApp.id)).send({
      repositoryId: repository.id,
    });

    expect(response.status).toBe(401);
  });
});
