import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { buildWorkspacePayload, TEST_ROUTES } from '../helpers/contracts';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { expectSuccessfulStatus, readAccessToken, readResourceId, readResponseArray } from '../helpers/response';
import { PrismaService } from 'src/database/prisma.service';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

interface WorkspaceResponse {
  id: string;
  name: string;
  role?: string;
}

describe('Workspaces E2E', () => {
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

  it('creates an additional workspace for an authenticated user', async () => {
    const agent = createAgent(app);

    const user = createTestUser();

    const registerResponse = await registerUser(agent, user);

    expectSuccessfulStatus(registerResponse);

    const accessToken = readAccessToken(registerResponse);

    const workspaceName = 'Second E2E Workspace';

    const response = await agent.post(TEST_ROUTES.workspaces.root).set(withBearer(accessToken)).send(buildWorkspacePayload(workspaceName));

    expectSuccessfulStatus(response);

    expect(readResourceId(response)).toEqual(expect.any(String));
  });

  it('lists multiple explicitly created workspaces', async () => {
    const agent = createAgent(app);

    const user = createTestUser({
      workspaceName: 'Initial Workspace',
    });

    const registerResponse = await registerUser(agent, user);

    expectSuccessfulStatus(registerResponse);

    const accessToken = readAccessToken(registerResponse);

    const firstCreateResponse = await agent.post(TEST_ROUTES.workspaces.root).set(withBearer(accessToken)).send(buildWorkspacePayload('Initial Workspace'));

    expectSuccessfulStatus(firstCreateResponse);

    const secondCreateResponse = await agent.post(TEST_ROUTES.workspaces.root).set(withBearer(accessToken)).send(buildWorkspacePayload('Additional Workspace'));

    expectSuccessfulStatus(secondCreateResponse);

    const listResponse = await agent.get(TEST_ROUTES.workspaces.root).set(withBearer(accessToken));

    expect(listResponse.status).toBe(200);

    const workspaces = readResponseArray<WorkspaceResponse>(listResponse);

    const names = workspaces.map((workspace) => workspace.name);

    expect(names).toEqual(expect.arrayContaining(['Initial Workspace', 'Additional Workspace']));
  });
  it('rejects anonymous workspace creation', async () => {
    const response = await request(app.getHttpServer()).post(TEST_ROUTES.workspaces.root).send(buildWorkspacePayload('Anonymous Workspace'));

    expect(response.status).toBe(401);
  });

  it('rejects invalid workspace names', async () => {
    const agent = createAgent(app);

    const registerResponse = await registerUser(agent, createTestUser());

    expectSuccessfulStatus(registerResponse);

    const accessToken = readAccessToken(registerResponse);

    const response = await agent.post(TEST_ROUTES.workspaces.root).set(withBearer(accessToken)).send({
      name: ' ',
      unexpectedField: true,
    });

    expect(response.status).toBe(400);
  });

  it('prevents a user from accessing another workspace applications', async () => {
    const firstAgent = createAgent(app);

    const firstRegisterResponse = await registerUser(firstAgent, createTestUser());

    expectSuccessfulStatus(firstRegisterResponse);

    const firstToken = readAccessToken(firstRegisterResponse);

    const workspaceResponse = await firstAgent
      .post(TEST_ROUTES.workspaces.root)
      .set(withBearer(firstToken))
      .send(buildWorkspacePayload('Private Alpha Workspace'));

    expectSuccessfulStatus(workspaceResponse);

    const foreignWorkspaceId = readResourceId(workspaceResponse);

    const secondAgent = createAgent(app);

    const secondRegisterResponse = await registerUser(secondAgent, createTestUser());

    expectSuccessfulStatus(secondRegisterResponse);

    const secondToken = readAccessToken(secondRegisterResponse);

    const foreignAccessResponse = await secondAgent.get(TEST_ROUTES.workspaces.applications(foreignWorkspaceId)).set(withBearer(secondToken));

    /*
     * Either 403 or a security-hidden 404
     * is acceptable, but data must never
     * be returned.
     */
    expect([403, 404]).toContain(foreignAccessResponse.status);
  });
});
