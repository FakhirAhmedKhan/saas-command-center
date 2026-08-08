import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { createApplication, readApiItems } from './helpers/application';

import { withBearer } from './helpers/auth';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import {
  expectAccessDenied,
  registerWorkspaceTestUser,
  type WorkspaceTestUser,
} from './helpers/workspace';

import {
  archiveWebsite,
  connectWebsite,
  createWebsite,
  disableWebsite,
  disconnectWebsite,
  enableWebsite,
  expectWebsiteSuccess,
  restoreWebsite,
  rotateWebsiteKey,
  updateWebsite,
  websiteRoutes,
} from './helpers/website';

describe('Website Activity E2E', () => {
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

  async function listActivity(actor: WorkspaceTestUser) {
    return actor.agent
      .get(websiteRoutes.workspaceActivities(actor.workspaceId))
      .set(withBearer(actor.accessToken))
      .query({
        limit: 100,
      });
  }

  async function activityCount(actor: WorkspaceTestUser): Promise<number> {
    const response = await listActivity(actor);

    expect(response.status).toBe(200);

    return readApiItems(response, ['activities']).length;
  }

  it('writes activity for website creation and update', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const initialCount = await activityCount(owner);

    const website = await createWebsite(owner, {
      domain: 'website-activity.example.test',
    });

    expect(
      (
        await updateWebsite(owner, website.id, {
          name: 'Updated Website Activity',
        })
      ).status,
    ).toBe(200);

    const response = await listActivity(owner);

    const activities = readApiItems(response, ['activities']);

    expect(activities.length).toBeGreaterThanOrEqual(initialCount + 2);

    const serialized = JSON.stringify(activities);

    expect(serialized).toContain('website-activity.example.test');
  });

  it('writes activity for state, connection, and key-management actions', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const website = await createWebsite(owner);

    const beforeCount = await activityCount(owner);

    expectWebsiteSuccess(await disableWebsite(owner, website.id));

    expectWebsiteSuccess(await enableWebsite(owner, website.id));

    expectWebsiteSuccess(await connectWebsite(owner, website.id, application.id));

    expectWebsiteSuccess(await disconnectWebsite(owner, website.id));

    const rotateResponse = await rotateWebsiteKey(owner, website.id);

    expectWebsiteSuccess(rotateResponse);

    expectWebsiteSuccess(await archiveWebsite(owner, website.id));

    expectWebsiteSuccess(await restoreWebsite(owner, website.id));

    const afterCount = await activityCount(owner);

    expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 7);
  });

  it('does not write activity for rejected validation', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const beforeCount = await activityCount(owner);

    const response = await owner.agent
      .post(websiteRoutes.root(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        name: '',
        domain: 'example.com/path',
      });

    expect(response.status).toBe(400);

    expect(await activityCount(owner)).toBe(beforeCount);
  });

  it('keeps website activity isolated across workspaces', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    await createWebsite(alphaOwner, {
      domain: 'alpha-activity.example.test',
    });

    await createWebsite(betaOwner, {
      domain: 'beta-activity.example.test',
    });

    const alphaResponse = await listActivity(alphaOwner);

    const serialized = JSON.stringify(alphaResponse.body);

    expect(serialized).toContain('alpha-activity.example.test');

    expect(serialized).not.toContain('beta-activity.example.test');

    const foreignResponse = await betaOwner.agent
      .get(websiteRoutes.workspaceActivities(alphaOwner.workspaceId))
      .set(withBearer(betaOwner.accessToken));

    expectAccessDenied(foreignResponse);
  });

  it('does not expose raw tracking keys or authentication secrets in activity', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createWebsite(owner);

    const rotateResponse = await rotateWebsiteKey(owner, website.id);

    expectWebsiteSuccess(rotateResponse);

    const rawRotatePayload = JSON.stringify(rotateResponse.body);

    const response = await listActivity(owner);

    const serialized = JSON.stringify(response.body);

    expect(serialized).not.toContain(owner.input.password);

    expect(serialized).not.toContain(owner.accessToken);

    expect(serialized).not.toContain(rawRotatePayload);

    expect(serialized.toLowerCase()).not.toContain('passwordhash');

    expect(serialized.toLowerCase()).not.toContain('refreshtoken');
  });
});
