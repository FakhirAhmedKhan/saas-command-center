import {
  addLink,
  addTechnology,
  applicationRoutes,
  archiveApplication,
  createApplication,
  readApiItems,
  recordString,
  restoreApplication,
  updateApplication,
} from '../helpers/application';
import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { expectAccessDenied, registerWorkspaceTestUser, type WorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

describe('Application Activity E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function listApplicationActivity(actor: WorkspaceTestUser, applicationId: string, query: Record<string, string | number> = {}) {
    return actor.agent.get(applicationRoutes.applicationActivities(actor.workspaceId, applicationId)).set(withBearer(actor.accessToken)).query(query);
  }

  async function listWorkspaceActivity(actor: WorkspaceTestUser, query: Record<string, string | number> = {}) {
    return actor.agent.get(applicationRoutes.workspaceActivities(actor.workspaceId)).set(withBearer(actor.accessToken)).query(query);
  }

  it('writes application create and update activities', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner, {
      name: 'Activity Test Application',
    });

    const createActivityResponse = await listApplicationActivity(owner, application.id);

    expect(createActivityResponse.status).toBe(200);

    const beforeUpdate = readApiItems(createActivityResponse, ['activities']);

    expect(beforeUpdate.length).toBeGreaterThanOrEqual(1);

    expect(
      (
        await updateApplication(owner, application.id, {
          name: 'Updated Activity Application',
        })
      ).status,
    ).toBe(200);

    const updateActivityResponse = await listApplicationActivity(owner, application.id);

    const afterUpdate = readApiItems(updateActivityResponse, ['activities']);

    expect(afterUpdate.length).toBeGreaterThan(beforeUpdate.length);

    expect(JSON.stringify(afterUpdate)).toContain(application.id);
  });

  it('writes technology, link, archive, and restore activities', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const initialResponse = await listApplicationActivity(owner, application.id);

    const initialCount = readApiItems(initialResponse, ['activities']).length;

    expect([200, 201]).toContain((await addTechnology(owner, application.id)).status);

    expect([200, 201]).toContain((await addLink(owner, application.id)).status);

    expect((await archiveApplication(owner, application.id)).status).toBe(200);

    expect((await restoreApplication(owner, application.id)).status).toBe(200);

    const finalResponse = await listApplicationActivity(owner, application.id);

    const finalItems = readApiItems(finalResponse, ['activities']);

    expect(finalItems.length).toBeGreaterThanOrEqual(initialCount + 4);
  });

  it('does not create activity for rejected operation', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const beforeResponse = await listApplicationActivity(owner, application.id);

    const beforeCount = readApiItems(beforeResponse, ['activities']).length;

    const invalidResponse = await updateApplication(owner, application.id, {
      name: '',
    });

    expect(invalidResponse.status).toBe(400);

    const afterResponse = await listApplicationActivity(owner, application.id);

    const afterCount = readApiItems(afterResponse, ['activities']).length;

    expect(afterCount).toBe(beforeCount);
  });

  it('supports filters and pagination', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    expect(
      (
        await updateApplication(owner, application.id, {
          shortDescription: 'Activity filter update',
        })
      ).status,
    ).toBe(200);

    const allResponse = await listApplicationActivity(owner, application.id, {
      limit: 100,
    });

    const allItems = readApiItems(allResponse, ['activities']);

    expect(allItems.length).toBeGreaterThanOrEqual(2);

    const first = allItems[0];

    const query: Record<string, string | number> = {
      page: 1,
      limit: 1,
    };

    const activityType = recordString(first, 'activityType', 'type');

    const actorType = recordString(first, 'actorType');

    const entityType = recordString(first, 'entityType');

    const actorUserId = recordString(first, 'actorUserId');

    const createdAt = recordString(first, 'createdAt');

    if (activityType) {
      query.activityType = activityType;
    }

    if (actorType) {
      query.actorType = actorType;
    }

    if (entityType) {
      query.entityType = entityType;
    }

    if (actorUserId) {
      query.actorUserId = actorUserId;
    }

    if (createdAt) {
      const time = new Date(createdAt).getTime();

      query.from = new Date(time - 60_000).toISOString();

      query.to = new Date(time + 60_000).toISOString();
    }

    const filteredResponse = await listApplicationActivity(owner, application.id, query);

    expect(filteredResponse.status).toBe(200);

    expect(readApiItems(filteredResponse, ['activities'])).toHaveLength(1);

    expect(
      (
        await listApplicationActivity(owner, application.id, {
          page: 0,
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await listApplicationActivity(owner, application.id, {
          activityType: 'INVALID_ACTIVITY',
        })
      ).status,
    ).toBe(400);
  });

  it('keeps workspace activity isolated', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    const alphaApp = await createApplication(alphaOwner);

    const betaApp = await createApplication(betaOwner);

    const alphaActivityResponse = await listWorkspaceActivity(alphaOwner);

    const alphaActivities = readApiItems(alphaActivityResponse, ['activities']);

    const serialized = JSON.stringify(alphaActivities);

    expect(serialized).toContain(alphaApp.id);

    expect(serialized).not.toContain(betaApp.id);

    const foreignResponse = await betaOwner.agent.get(applicationRoutes.workspaceActivities(alphaOwner.workspaceId)).set(withBearer(betaOwner.accessToken));

    expectAccessDenied(foreignResponse);

    const wrongApplicationResponse = await alphaOwner.agent
      .get(applicationRoutes.applicationActivities(alphaOwner.workspaceId, betaApp.id))
      .set(withBearer(alphaOwner.accessToken));

    expect(wrongApplicationResponse.status).toBe(404);
  });

  it('does not expose authentication secrets', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const response = await listApplicationActivity(owner, application.id);

    expect(response.status).toBe(200);

    const serialized = JSON.stringify(response.body).toLowerCase();

    expect(serialized).not.toContain(owner.input.password.toLowerCase());

    expect(serialized).not.toContain(owner.accessToken.toLowerCase());

    expect(serialized).not.toContain('refreshtoken');

    expect(serialized).not.toContain('passwordhash');
  });
});
