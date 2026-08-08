/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { WorkspaceRole } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { archiveApplication, createApplication, inWorkspace } from './helpers/application';

import { createTestApp } from './helpers/create-test-app';

import {
  createBlocker,
  createMilestone,
  createTask,
  developmentRoutes,
  expectDevelopmentSuccess,
  getDevelopmentSummary,
  listBlockers,
  listMilestones,
  listTemplates,
  updateMilestone,
} from './helpers/development';

import { resetDatabase } from './helpers/database';

import {
  addWorkspaceMember,
  expectAccessDenied,
  registerWorkspaceTestUser,
  type WorkspaceTestUser,
} from './helpers/workspace';

interface RoleMatrix {
  owner: WorkspaceTestUser;
  admin: WorkspaceTestUser;
  developer: WorkspaceTestUser;
  viewer: WorkspaceTestUser;
}

describe('Development Roles E2E', () => {
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

  async function createRoleMatrix(): Promise<RoleMatrix> {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const rawAdmin = await registerWorkspaceTestUser(app, prisma);

    const rawDeveloper = await registerWorkspaceTestUser(app, prisma);

    const rawViewer = await registerWorkspaceTestUser(app, prisma);

    expectDevelopmentSuccess(await addWorkspaceMember(owner, rawAdmin, WorkspaceRole.ADMIN));

    expectDevelopmentSuccess(
      await addWorkspaceMember(owner, rawDeveloper, WorkspaceRole.DEVELOPER),
    );

    expectDevelopmentSuccess(await addWorkspaceMember(owner, rawViewer, WorkspaceRole.VIEWER));

    return {
      owner,

      admin: inWorkspace(rawAdmin, owner.workspaceId),

      developer: inWorkspace(rawDeveloper, owner.workspaceId),

      viewer: inWorkspace(rawViewer, owner.workspaceId),
    };
  }

  it('allows all workspace members to read templates, summary, milestones, and blockers', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.owner);

    for (const actor of [matrix.owner, matrix.admin, matrix.developer, matrix.viewer]) {
      expect((await listTemplates(actor)).status).toBe(200);

      expect((await getDevelopmentSummary(actor, application.id)).status).toBe(200);

      expect((await listMilestones(actor, application.id)).status).toBe(200);

      expect((await listBlockers(actor, application.id)).status).toBe(200);
    }
  });

  it('allows OWNER, ADMIN, and DEVELOPER to mutate development data', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.owner);

    for (const actor of [matrix.owner, matrix.admin, matrix.developer]) {
      const milestone = await createMilestone(actor, application.id);

      await createTask(actor, application.id, milestone.id);

      await createBlocker(actor, application.id, {
        milestoneId: milestone.id,
      });

      expect(
        (
          await updateMilestone(actor, application.id, milestone.id, {
            description: `Updated by ${actor.userId}`,
          })
        ).status,
      ).toBe(200);
    }
  });

  it('prevents VIEWER from all development mutations', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.owner);

    const milestone = await createMilestone(matrix.owner, application.id);

    const createMilestoneResponse = await matrix.viewer.agent
      .post(developmentRoutes.milestones(matrix.viewer.workspaceId, application.id))
      .set('Authorization', `Bearer ${matrix.viewer.accessToken}`)
      .send({
        title: 'Viewer Milestone',
      });

    expect(createMilestoneResponse.status).toBe(403);

    const updateResponse = await updateMilestone(matrix.viewer, application.id, milestone.id, {
      title: 'Viewer Update',
    });

    expect(updateResponse.status).toBe(403);

    const taskResponse = await matrix.viewer.agent
      .post(developmentRoutes.tasks(matrix.viewer.workspaceId, application.id, milestone.id))
      .set('Authorization', `Bearer ${matrix.viewer.accessToken}`)
      .send({
        title: 'Viewer Task',
      });

    expect(taskResponse.status).toBe(403);

    const blockerResponse = await matrix.viewer.agent
      .post(developmentRoutes.blockers(matrix.viewer.workspaceId, application.id))
      .set('Authorization', `Bearer ${matrix.viewer.accessToken}`)
      .send({
        title: 'Viewer Blocker',
      });

    expect(blockerResponse.status).toBe(403);
  });

  it('prevents outsider and anonymous access', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.owner);

    const outsider = await registerWorkspaceTestUser(app, prisma);

    const outsiderResponse = await outsider.agent
      .get(developmentRoutes.summary(matrix.owner.workspaceId, application.id))
      .set('Authorization', `Bearer ${outsider.accessToken}`);

    expectAccessDenied(outsiderResponse);

    const anonymousResponse = await request(app.getHttpServer()).get(
      developmentRoutes.summary(matrix.owner.workspaceId, application.id),
    );

    expect(anonymousResponse.status).toBe(401);
  });

  it('prevents development access through a foreign application ID', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaApplication = await createApplication(betaOwner);

    const response = await getDevelopmentSummary(alphaOwner, betaApplication.id);

    expect(response.status).toBe(404);
  });

  it('rejects development mutations on archived applications', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.owner);

    expectDevelopmentSuccess(await archiveApplication(matrix.owner, application.id));

    for (const actor of [matrix.owner, matrix.admin, matrix.developer]) {
      const response = await actor.agent
        .post(developmentRoutes.milestones(actor.workspaceId, application.id))
        .set('Authorization', `Bearer ${actor.accessToken}`)
        .send({
          title: 'Archived Application Milestone',
        });

      expect([400, 403, 409]).toContain(response.status);
    }
  });
});
