import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { expectSuccessfulStatus, readAccessToken } from '../helpers/response';
import type { WorkspaceOnboardingAnswers, WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import request, { type Response } from 'supertest';

const sessionsRoute = '/api/v1/workspace-onboarding/sessions';
const completeAnswers: WorkspaceOnboardingAnswers = {
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

function readSession(response: Response): WorkspaceOnboardingSessionResponse {
  const body = response.body as {
    data?: unknown;
  };

  return (body.data ?? response.body) as WorkspaceOnboardingSessionResponse;
}

async function registerAccessToken(app: INestApplication, email: string): Promise<string> {
  const response = await registerUser(createAgent(app), createTestUser({ email }));

  expectSuccessfulStatus(response);

  return readAccessToken(response);
}

async function createSession(app: INestApplication, accessToken: string): Promise<Response> {
  return request(app.getHttpServer()).post(sessionsRoute).set(withBearer(accessToken));
}

async function updateAnswers(app: INestApplication, sessionId: string, accessToken: string, answers: WorkspaceOnboardingAnswers): Promise<Response> {
  return request(app.getHttpServer()).patch(`${sessionsRoute}/${sessionId}/answers`).set(withBearer(accessToken)).send({ answers });
}

describe('Workspace onboarding sessions E2E', () => {
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
    await app.close();
  });

  afterAll(() => {
    if (previousFeatureFlag === undefined) {
      delete process.env.GUIDED_WORKSPACE_BUILDER_ENABLED;
    } else {
      process.env.GUIDED_WORKSPACE_BUILDER_ENABLED = previousFeatureFlag;
    }
  });

  it('creates, resumes, updates and deletes an owned session', async () => {
    const accessToken = await registerAccessToken(app, 'guided-owner@example.test');
    const created = await createSession(app, accessToken);

    expect(created.status).toBe(201);

    const session = readSession(created);
    const updated = await updateAnswers(app, session.id, accessToken, {
      workspaceName: 'TodoFlow',
      applicationTypes: ['WEB'],
    });

    expect(updated.status).toBe(200);
    expect(readSession(updated).answers.workspaceName).toBe('TodoFlow');

    const resumed = await request(app.getHttpServer()).get(`${sessionsRoute}/${session.id}`).set(withBearer(accessToken));

    expect(resumed.status).toBe(200);
    expect(readSession(resumed).answers.applicationTypes).toEqual(['WEB']);

    const removed = await request(app.getHttpServer()).delete(`${sessionsRoute}/${session.id}`).set(withBearer(accessToken));

    expect(removed.status).toBe(204);
  });

  it('generates a deterministic persisted blueprint', async () => {
    const accessToken = await registerAccessToken(app, 'guided-generator@example.test');
    const created = await createSession(app, accessToken);
    const session = readSession(created);
    const updated = await updateAnswers(app, session.id, accessToken, completeAnswers);

    expect(updated.status).toBe(200);

    const firstGeneration = await request(app.getHttpServer()).post(`${sessionsRoute}/${session.id}/blueprint`).set(withBearer(accessToken));

    expect(firstGeneration.status).toBe(201);

    const first = readSession(firstGeneration);

    expect(first).toMatchObject({
      status: 'BLUEPRINT_READY',
      blueprintRevision: 1,
      blueprint: {
        schemaVersion: 1,
        generator: {
          provider: 'rules',
          version: expect.any(String),
        },
        workspace: {
          name: 'TodoFlow',
          slug: 'todoflow',
        },
      },
    });

    expect(first.blueprintHash).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));

    const secondGeneration = await request(app.getHttpServer()).post(`${sessionsRoute}/${session.id}/blueprint`).set(withBearer(accessToken));

    expect(secondGeneration.status).toBe(201);

    const second = readSession(secondGeneration);

    expect(second.blueprint).toEqual(first.blueprint);
    expect(second.blueprintRevision).toBe(first.blueprintRevision + 1);

    const persisted = await prisma.workspaceOnboardingSession.findUnique({
      where: {
        id: session.id,
      },
    });

    expect(persisted?.blueprintRevision).toBe(second.blueprintRevision);
    expect(persisted?.blueprintHash).toBe(second.blueprintHash);
  });

  it('does not expose a session to another user', async () => {
    const ownerToken = await registerAccessToken(app, 'guided-private-owner@example.test');
    const outsiderToken = await registerAccessToken(app, 'guided-outsider@example.test');
    const created = await createSession(app, ownerToken);
    const session = readSession(created);
    const response = await request(app.getHttpServer()).get(`${sessionsRoute}/${session.id}`).set(withBearer(outsiderToken));

    expect(response.status).toBe(404);
  });
});
