import type { INestApplication } from '@nestjs/common';
import type { FastifyAdapter } from '@nestjs/platform-fastify';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';

describe('Workspace onboarding sessions E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => resetDatabase(prisma));
  afterAll(async () => app.close());

  it('creates, resumes, updates and deletes an owned session', async () => {
    // Replace registerUser with the repository's existing authenticated fixture.
    const owner = await registerUser(app, 'guided-owner@example.test');
    const server = app.getHttpAdapter().getInstance<FastifyAdapter>();

    const created = await server.inject({
      method: 'POST',
      url: '/api/v1/workspace-onboarding/sessions',
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });

    expect(created.statusCode).toBe(201);
    const session = created.json();

    const updated = await server.inject({
      method: 'PATCH',
      url: `/api/v1/workspace-onboarding/sessions/${session.id}/answers`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: {
        answers: {
          workspaceName: 'TodoFlow',
          applicationTypes: ['WEB'],
        },
      },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json().answers.workspaceName).toBe('TodoFlow');

    const resumed = await server.inject({
      method: 'GET',
      url: `/api/v1/workspace-onboarding/sessions/${session.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });

    expect(resumed.statusCode).toBe(200);
    expect(resumed.json().answers.applicationTypes).toEqual(['WEB']);

    const removed = await server.inject({
      method: 'DELETE',
      url: `/api/v1/workspace-onboarding/sessions/${session.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });

    expect(removed.statusCode).toBe(204);
  });
  it('generates a deterministic schema-valid blueprint', async () => {
    const owner = await registerUser(app, 'guided-generator@example.test');
    const session = await createSession(app, owner.accessToken);

    await updateAnswers(app, session.id, owner.accessToken, {
      productIdea: 'A task management product',
      workspaceName: 'TodoFlow',
      productType: 'PRODUCTIVITY_SAAS',
      targetUsers: ['CONSUMERS'],
      applicationTypes: ['WEB'],
      coreFeatures: ['TASKS'],
      authentication: true,
      repositories: 'CONNECT_LATER',
      environments: ['DEVELOPMENT', 'PRODUCTION'],
      qualityRequirements: ['CI_CD', 'MONITORING', 'SECURITY'],
    });

    const response = await generateBlueprint(app, session.id, owner.accessToken);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: 'BLUEPRINT_READY',
      blueprint: {
        schemaVersion: 1,
        generator: { provider: 'rules', version: '1.0.0' },
        workspace: { name: 'TodoFlow', slug: 'todoflow' },
        applications: [
          {
            type: 'WEB',
            platforms: ['WEB'],
            stack: ['NEXT_JS', 'TYPESCRIPT'],
          },
        ],
      },
    });
  });
  it('does not expose a session to another user', async () => {
    const owner = await registerUser(app, 'guided-owner@example.test');
    const outsider = await registerUser(app, 'guided-outsider@example.test');
    const session = await createSession(app, owner.accessToken);
    const response = await getSession(app, session.id, outsider.accessToken);

    expect(response.statusCode).toBe(404);
  });
});

function registerUser(app: INestApplication<any>, arg1: string) {
  throw new Error('Function not implemented.');
}

function createSession(app: INestApplication<any>, accessToken: any) {
  throw new Error('Function not implemented.');
}

function updateAnswers(
  app: INestApplication<any>,
  id: any,
  accessToken: any,
  arg3: {
    productIdea: string;
    workspaceName: string;
    productType: string;
    targetUsers: string[];
    applicationTypes: string[];
    coreFeatures: string[];
    authentication: boolean;
    repositories: string;
    environments: string[];
    qualityRequirements: string[];
  },
) {
  throw new Error('Function not implemented.');
}

function generateBlueprint(app: INestApplication<any>, id: any, accessToken: any) {
  throw new Error('Function not implemented.');
}
