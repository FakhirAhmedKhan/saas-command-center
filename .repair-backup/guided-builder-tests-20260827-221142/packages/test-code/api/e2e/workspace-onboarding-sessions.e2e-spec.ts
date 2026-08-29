import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';
import type { Response } from 'supertest';
import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { expectSuccessfulStatus, readAccessToken } from '../helpers/response';

const onboardingRoot = '/api/v1/workspace-onboarding/sessions';

interface SessionResponse {
  id: string;
  status: string;
  answers: WorkspaceOnboardingAnswers;
  blueprint: WorkspaceBlueprint | null;
  blueprintRevision: number;
  blueprintHash: string | null;
  workspaceId: string | null;
}

type TestAgent = ReturnType<typeof createAgent>;

describe('Workspace onboarding sessions E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: TestAgent;

  const previousFeatureFlag = process.env.GUIDED_WORKSPACE_BUILDER_ENABLED;

  const previousGenerator = process.env.WORKSPACE_GENERATOR_PROVIDER;

  beforeAll(() => {
    process.env.GUIDED_WORKSPACE_BUILDER_ENABLED = 'true';
    process.env.WORKSPACE_GENERATOR_PROVIDER = 'rules';
  });

  afterAll(() => {
    if (previousFeatureFlag === undefined) {
      delete process.env.GUIDED_WORKSPACE_BUILDER_ENABLED;
    } else {
      process.env.GUIDED_WORKSPACE_BUILDER_ENABLED = previousFeatureFlag;
    }

    if (previousGenerator === undefined) {
      delete process.env.WORKSPACE_GENERATOR_PROVIDER;
    } else {
      process.env.WORKSPACE_GENERATOR_PROVIDER = previousGenerator;
    }
  });

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    agent = createAgent(app);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates, resumes, updates and deletes an owned session', async () => {
    const accessToken = await registerOwner(agent);

    const created = await createSession(agent, accessToken);

    const updated = await agent
      .patch(`${onboardingRoot}/${created.id}/answers`)
      .set(withBearer(accessToken))
      .send({
        answers: {
          workspaceName: 'TodoFlow',
          applicationTypes: ['WEB'],
        },
      });

    expect(updated.status).toBe(200);
    expect(sessionBody(updated).answers.workspaceName).toBe('TodoFlow');

    const questions = await agent.get(`${onboardingRoot}/${created.id}/questions`).set(withBearer(accessToken));

    expect(questions.status).toBe(200);
    expect(questions.body).toMatchObject({
      completed: expect.any(Number),
      total: expect.any(Number),
      percent: expect.any(Number),
    });

    const resumed = await agent.get(`${onboardingRoot}/${created.id}`).set(withBearer(accessToken));

    expect(resumed.status).toBe(200);
    expect(sessionBody(resumed).answers.applicationTypes).toEqual(['WEB']);

    const removed = await agent.delete(`${onboardingRoot}/${created.id}`).set(withBearer(accessToken));

    expect(removed.status).toBe(204);

    const persisted = await prisma.workspaceOnboardingSession.findUnique({
      where: {
        id: created.id,
      },
    });

    expect(persisted).toBeNull();
  });

  it('generates a deterministic schema-valid blueprint', async () => {
    const accessToken = await registerOwner(agent);
    const session = await createSession(agent, accessToken);

    await saveCompleteAnswers(agent, session.id, accessToken, {
      applicationTypes: ['WEB'],
      mobilePlatforms: undefined,
      desktopPlatforms: undefined,
    });

    const first = await generateBlueprint(agent, session.id, accessToken);

    expect(first.status).toBe(201);

    const firstSession = sessionBody(first);

    expect(firstSession).toMatchObject({
      status: 'BLUEPRINT_READY',
      blueprintRevision: 1,
      blueprintHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      blueprint: {
        schemaVersion: 1,
        generator: {
          provider: 'rules',
          version: '2.0.0',
        },
        workspace: {
          name: 'TodoFlow',
          slug: 'todoflow',
        },
        applications: [
          {
            type: 'WEB',
            platforms: ['WEB'],
            stack: ['NEXT_JS', 'TYPESCRIPT'],
            source: 'RULE',
          },
        ],
      },
    });

    const second = await generateBlueprint(agent, session.id, accessToken);

    expect(second.status).toBe(201);

    const secondSession = sessionBody(second);

    expect(secondSession.blueprint).toEqual(firstSession.blueprint);

    expect(secondSession.blueprintRevision).toBe(2);
    expect(secondSession.blueprintHash).toBe(firstSession.blueprintHash);
  });

  it('does not expose a session to another user', async () => {
    const ownerToken = await registerOwner(agent);

    const ownerSession = await createSession(agent, ownerToken);

    const outsiderAgent = createAgent(app);
    const outsiderToken = await registerOwner(outsiderAgent);

    const response = await outsiderAgent.get(`${onboardingRoot}/${ownerSession.id}`).set(withBearer(outsiderToken));

    expect(response.status).toBe(404);
  });

  it('rejects stale blueprint edits', async () => {
    const accessToken = await registerOwner(agent);
    const session = await createSession(agent, accessToken);

    await saveCompleteAnswers(agent, session.id, accessToken);

    const generated = sessionBody(await generateBlueprint(agent, session.id, accessToken));

    expect(generated.blueprint).not.toBeNull();

    const response = await agent.patch(`${onboardingRoot}/${session.id}/blueprint`).set(withBearer(accessToken)).send({
      expectedRevision: 0,
      blueprint: generated.blueprint,
    });

    expect(response.status).toBe(409);
  });

  it('transactionally creates web, mobile and desktop applications and handles an idempotent retry', async () => {
    const accessToken = await registerOwner(agent);
    const session = await createSession(agent, accessToken);

    await saveCompleteAnswers(agent, session.id, accessToken);

    const generated = sessionBody(await generateBlueprint(agent, session.id, accessToken));

    const validation = await agent.post(`${onboardingRoot}/${session.id}/validate`).set(withBearer(accessToken));

    expect(validation.status).toBe(200);
    expect(validation.body).toMatchObject({
      valid: true,
      revision: generated.blueprintRevision,
      hash: generated.blueprintHash,
      issues: [],
    });

    const idempotencyKey = randomUUID();

    const confirmationPayload = {
      expectedRevision: generated.blueprintRevision,
      blueprintHash: generated.blueprintHash,
      idempotencyKey,
    };

    const confirmed = await agent.post(`${onboardingRoot}/${session.id}/confirm`).set(withBearer(accessToken)).send(confirmationPayload);

    expect(confirmed.status).toBe(201);

    const workspaceId = String(confirmed.body.workspaceId);

    expect(workspaceId).toMatch(/^[0-9a-f-]{36}$/);

    const retry = await agent.post(`${onboardingRoot}/${session.id}/confirm`).set(withBearer(accessToken)).send(confirmationPayload);

    expect(retry.status).toBe(201);
    expect(retry.body.workspaceId).toBe(workspaceId);

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: {
        members: true,
        saasApplications: {
          include: {
            technologies: true,
            mobileApplication: true,
            desktopApplication: true,
            applicationEnvironments: true,
          },
          orderBy: {
            type: 'asc',
          },
        },
      },
    });

    expect(workspace).not.toBeNull();
    expect(workspace?.name).toBe('TodoFlow');
    expect(workspace?.members).toHaveLength(1);
    expect(workspace?.saasApplications).toHaveLength(3);

    expect(workspace?.saasApplications.map(({ type }) => type)).toEqual(['DESKTOP', 'MOBILE', 'WEB']);

    const mobile = workspace?.saasApplications.find(({ type }) => type === 'MOBILE');

    const desktop = workspace?.saasApplications.find(({ type }) => type === 'DESKTOP');

    expect(mobile?.mobileApplication).not.toBeNull();
    expect(desktop?.desktopApplication).not.toBeNull();

    for (const application of workspace?.saasApplications ?? []) {
      expect(application.applicationEnvironments).toHaveLength(2);
    }

    expect(
      await prisma.workspace.count({
        where: {
          id: workspaceId,
        },
      }),
    ).toBe(1);

    const completed = await prisma.workspaceOnboardingSession.findUnique({
      where: {
        id: session.id,
      },
    });

    expect(completed).toMatchObject({
      status: 'COMPLETED',
      workspaceId,
      idempotencyKey,
    });
  });

  it('refuses CONNECT_NOW until verified repositories are selected', async () => {
    const accessToken = await registerOwner(agent);
    const session = await createSession(agent, accessToken);

    await saveCompleteAnswers(agent, session.id, accessToken, {
      repositories: 'CONNECT_NOW',
    });

    const generated = sessionBody(await generateBlueprint(agent, session.id, accessToken));

    const response = await agent.post(`${onboardingRoot}/${session.id}/confirm`).set(withBearer(accessToken)).send({
      expectedRevision: generated.blueprintRevision,
      blueprintHash: generated.blueprintHash,
      idempotencyKey: randomUUID(),
    });

    expect(response.status).toBe(422);

    expect(
      await prisma.workspaceOnboardingSession.findUnique({
        where: {
          id: session.id,
        },
        select: {
          status: true,
          workspaceId: true,
        },
      }),
    ).toEqual({
      status: 'BLUEPRINT_READY',
      workspaceId: null,
    });

    expect(await prisma.workspace.count()).toBe(0);
  });
});

async function registerOwner(testAgent: TestAgent): Promise<string> {
  const registration = await registerUser(testAgent, createTestUser());

  expectSuccessfulStatus(registration);

  return readAccessToken(registration);
}

async function createSession(testAgent: TestAgent, accessToken: string): Promise<SessionResponse> {
  const response = await testAgent.post(onboardingRoot).set(withBearer(accessToken));

  expect(response.status).toBe(201);

  return sessionBody(response);
}

async function saveCompleteAnswers(testAgent: TestAgent, sessionId: string, accessToken: string, overrides: Partial<WorkspaceOnboardingAnswers> = {}): Promise<SessionResponse> {
  const base: WorkspaceOnboardingAnswers = {
    productIdea: 'A cross-platform task management product',
    workspaceName: 'TodoFlow',
    productType: 'PRODUCTIVITY_SAAS',
    targetUsers: ['CONSUMERS'],
    applicationTypes: ['WEB', 'MOBILE', 'DESKTOP'],
    coreFeatures: ['TASKS', 'NOTIFICATIONS'],
    authentication: true,
    collaboration: false,
    notifications: ['PUSH'],
    mobilePlatforms: ['ANDROID', 'IOS'],
    desktopPlatforms: ['WINDOWS'],
    repositories: 'CONNECT_LATER',
    environments: ['DEVELOPMENT', 'PRODUCTION'],
    qualityRequirements: ['CI_CD', 'MONITORING', 'SECURITY'],
  };

  const answers: WorkspaceOnboardingAnswers = {
    ...base,
    ...overrides,
  };

  for (const key of Object.keys(answers) as Array<keyof WorkspaceOnboardingAnswers>) {
    if (answers[key] === undefined) {
      delete answers[key];
    }
  }

  const response = await testAgent.patch(`${onboardingRoot}/${sessionId}/answers`).set(withBearer(accessToken)).send({
    answers,
  });

  expect(response.status).toBe(200);

  return sessionBody(response);
}

function generateBlueprint(testAgent: TestAgent, sessionId: string, accessToken: string): Promise<Response> {
  return testAgent.post(`${onboardingRoot}/${sessionId}/blueprint`).set(withBearer(accessToken));
}

function sessionBody(response: Response): SessionResponse {
  return response.body as SessionResponse;
}
