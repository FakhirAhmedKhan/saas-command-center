import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { expectSuccessfulStatus, readAccessToken } from '../helpers/response';
import type { WorkspaceBlueprint, WorkspaceCreationResult, WorkspaceOnboardingAnswers, WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { ForbiddenException, type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';
import { PersonalRepositoriesService } from 'src/modules/repositories/services/personal-repositories.service';
import request, { type Response } from 'supertest';

const sessionsRoute = '/api/v1/workspace-onboarding/sessions';

function readData<T>(response: Response): T {
  const body = response.body as {
    data?: T;
  };

  return body.data ?? (response.body as T);
}

async function registerOwner(app: INestApplication, prisma: PrismaService, email: string) {
  const response = await registerUser(createAgent(app), createTestUser({ email }));

  expectSuccessfulStatus(response);

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email,
    },
  });

  return {
    user,
    accessToken: readAccessToken(response),
  };
}

async function createReadySession(app: INestApplication, accessToken: string, repositories: 'CONNECT_LATER' | 'CONNECT_NOW'): Promise<WorkspaceOnboardingSessionResponse> {
  const answers: WorkspaceOnboardingAnswers = {
    productIdea: 'A secure task management product for distributed teams',
    workspaceName: 'Guided Runtime',
    productType: 'PRODUCTIVITY_SAAS',
    targetUsers: ['DISTRIBUTED_TEAMS'],
    applicationTypes: ['WEB'],
    coreFeatures: ['TASKS', 'COLLABORATION'],
    authentication: true,
    collaboration: true,
    notifications: ['EMAIL'],
    repositories,
    environments: ['DEVELOPMENT', 'PRODUCTION'],
    qualityRequirements: ['CI_CD', 'MONITORING', 'SECURITY'],
  };
  const created = await request(app.getHttpServer()).post(sessionsRoute).set(withBearer(accessToken));

  expect(created.status).toBe(201);

  const session = readData<WorkspaceOnboardingSessionResponse>(created);
  const updated = await request(app.getHttpServer()).patch(`${sessionsRoute}/${session.id}/answers`).set(withBearer(accessToken)).send({ answers });

  expect(updated.status).toBe(200);

  const generated = await request(app.getHttpServer()).post(`${sessionsRoute}/${session.id}/blueprint`).set(withBearer(accessToken));

  expect(generated.status).toBe(201);

  return readData<WorkspaceOnboardingSessionResponse>(generated);
}

async function updateRepositories(app: INestApplication, accessToken: string, session: WorkspaceOnboardingSessionResponse, repositories: WorkspaceBlueprint['repositories']): Promise<WorkspaceOnboardingSessionResponse> {
  const response = await request(app.getHttpServer())
    .patch(`${sessionsRoute}/${session.id}/blueprint`)
    .set(withBearer(accessToken))
    .send({
      expectedRevision: session.blueprintRevision,
      blueprint: {
        ...session.blueprint!,
        repositories,
      },
    });

  expect(response.status).toBe(200);

  return readData<WorkspaceOnboardingSessionResponse>(response);
}

async function confirm(app: INestApplication, accessToken: string, session: WorkspaceOnboardingSessionResponse, idempotencyKey = randomUUID()): Promise<Response> {
  return request(app.getHttpServer()).post(`${sessionsRoute}/${session.id}/confirm`).set(withBearer(accessToken)).send({
    expectedRevision: session.blueprintRevision,
    blueprintHash: session.blueprintHash,
    idempotencyKey,
  });
}

describe('Workspace onboarding confirmation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let previousFeatureFlag: string | undefined;

  beforeAll(() => {
    previousFeatureFlag = process.env.GUIDED_WORKSPACE_BUILDER_ENABLED;
    process.env.GUIDED_WORKSPACE_BUILDER_ENABLED = 'true';
  });

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  afterAll(() => {
    if (previousFeatureFlag === undefined) {
      delete process.env.GUIDED_WORKSPACE_BUILDER_ENABLED;
    } else {
      process.env.GUIDED_WORKSPACE_BUILDER_ENABLED = previousFeatureFlag;
    }
  });

  it('requires authentication for session creation', async () => {
    const response = await request(app.getHttpServer()).post(sessionsRoute);

    expect(response.status).toBe(401);
  });

  it('creates CONNECT_LATER atomically and replays the same idempotent result', async () => {
    const owner = await registerOwner(app, prisma, 'guided-confirm-later@example.test');
    const session = await createReadySession(app, owner.accessToken, 'CONNECT_LATER');
    const idempotencyKey = randomUUID();
    const first = await confirm(app, owner.accessToken, session, idempotencyKey);

    expect(first.status).toBe(201);

    const firstResult = readData<WorkspaceCreationResult>(first);
    const replay = await confirm(app, owner.accessToken, session, idempotencyKey);

    expect(replay.status).toBe(201);
    expect(readData<WorkspaceCreationResult>(replay).workspaceId).toBe(firstResult.workspaceId);

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: firstResult.workspaceId,
      },
      include: {
        members: true,
        saasApplications: true,
        workspaceOnboardingSessions: true,
      },
    });

    expect(workspace?.ownerId).toBe(owner.user.id);
    expect(workspace?.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: owner.user.id,
          role: 'OWNER',
        }),
      ]),
    );
    expect(workspace?.saasApplications).toHaveLength(1);
    expect(workspace?.workspaceOnboardingSessions[0]?.status).toBe('COMPLETED');

    expect(
      await prisma.repositoryConnection.count({
        where: {
          workspaceId: firstResult.workspaceId,
        },
      }),
    ).toBe(0);
  });

  it('rejects a stale revision without creating a partial workspace', async () => {
    const owner = await registerOwner(app, prisma, 'guided-stale-confirm@example.test');
    const session = await createReadySession(app, owner.accessToken, 'CONNECT_LATER');
    const response = await request(app.getHttpServer())
      .post(`${sessionsRoute}/${session.id}/confirm`)
      .set(withBearer(owner.accessToken))
      .send({
        expectedRevision: session.blueprintRevision + 1,
        blueprintHash: session.blueprintHash,
        idempotencyKey: randomUUID(),
      });

    expect(response.status).toBe(409);

    const persisted = await prisma.workspaceOnboardingSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
    });

    expect(persisted.status).toBe('BLUEPRINT_READY');
    expect(persisted.workspaceId).toBeNull();
    expect(persisted.idempotencyKey).toBeNull();
  });

  it('verifies and atomically connects a CONNECT_NOW repository', async () => {
    const owner = await registerOwner(app, prisma, 'guided-connect-now@example.test');
    const generated = await createReadySession(app, owner.accessToken, 'CONNECT_NOW');
    const personalRepositories = app.get(PersonalRepositoriesService);
    const findRepository = jest.spyOn(personalRepositories, 'findRepository').mockResolvedValue({
      installationId: '7001',
      repository: {
        id: 9001,
        name: 'guided-runtime',
        fullName: 'acme/guided-runtime',
        description: 'Guided builder repository',
        private: true,
        defaultBranch: 'main',
        htmlUrl: 'https://github.com/acme/guided-runtime',
        updatedAt: '2026-08-28T00:00:00.000Z',
        owner: {
          login: 'acme',
          avatarUrl: 'https://avatars.example.test/acme',
        },
      },
    });
    const session = await updateRepositories(app, owner.accessToken, generated, [
      {
        applicationType: 'WEB',
        strategy: 'CONNECT_NOW',
        repositoryId: '9001',
      },
    ]);
    const response = await confirm(app, owner.accessToken, session);

    expect(response.status).toBe(201);
    expect(findRepository).toHaveBeenCalledWith(owner.user.id, 9001);

    const result = readData<WorkspaceCreationResult>(response);
    const connection = await prisma.repositoryConnection.findFirst({
      where: {
        workspaceId: result.workspaceId,
        externalRepoId: '9001',
      },
      include: {
        installation: true,
        application: true,
      },
    });

    expect(connection).toMatchObject({
      owner: 'acme',
      name: 'guided-runtime',
      fullName: 'acme/guided-runtime',
      defaultBranch: 'main',
      isPrivate: true,
      application: {
        type: 'WEB',
      },
      installation: {
        externalInstallationId: '7001',
        connectedById: owner.user.id,
      },
    });

    expect(
      await prisma.applicationLink.count({
        where: {
          applicationId: connection!.applicationId!,
          type: 'REPOSITORY',
          url: 'https://github.com/acme/guided-runtime',
        },
      }),
    ).toBe(1);
  });

  it('blocks CONNECT_NOW when repository ownership verification fails', async () => {
    const owner = await registerOwner(app, prisma, 'guided-denied-repository@example.test');
    const generated = await createReadySession(app, owner.accessToken, 'CONNECT_NOW');
    const personalRepositories = app.get(PersonalRepositoriesService);

    jest.spyOn(personalRepositories, 'findRepository').mockRejectedValue(new ForbiddenException('Repository is not accessible through any connected GitHub installation.'));

    const session = await updateRepositories(app, owner.accessToken, generated, [
      {
        applicationType: 'WEB',
        strategy: 'CONNECT_NOW',
        repositoryId: '9999',
      },
    ]);
    const response = await confirm(app, owner.accessToken, session);

    expect(response.status).toBe(403);

    const persisted = await prisma.workspaceOnboardingSession.findUniqueOrThrow({
      where: {
        id: session.id,
      },
    });

    expect(persisted.status).toBe('BLUEPRINT_READY');
    expect(persisted.workspaceId).toBeNull();
    expect(await prisma.repositoryConnection.count()).toBe(0);
  });
});
