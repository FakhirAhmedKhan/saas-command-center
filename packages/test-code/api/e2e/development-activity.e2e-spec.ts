import { applicationRoutes, createApplication, readApiItems } from '../helpers/application';
import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { completeTask, createBlocker, createMilestone, createTask, expectDevelopmentSuccess, resolveBlocker, updateMilestone } from '../helpers/development';
import { expectAccessDenied, registerWorkspaceTestUser, type WorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

describe('Development Activity E2E', () => {
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

  async function listActivity(actor: WorkspaceTestUser, applicationId: string) {
    return actor.agent.get(applicationRoutes.applicationActivities(actor.workspaceId, applicationId)).set(withBearer(actor.accessToken)).query({
      limit: 100,
    });
  }

  async function activityCount(actor: WorkspaceTestUser, applicationId: string): Promise<number> {
    const response = await listActivity(actor, applicationId);

    expect(response.status).toBe(200);

    return readApiItems(response, ['activities']).length;
  }

  it('writes activity for milestone, task, and blocker creation', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const initialCount = await activityCount(owner, application.id);

    const milestone = await createMilestone(owner, application.id);

    await createTask(owner, application.id, milestone.id);

    await createBlocker(owner, application.id, {
      milestoneId: milestone.id,
    });

    const finalCount = await activityCount(owner, application.id);

    expect(finalCount).toBeGreaterThanOrEqual(initialCount + 3);
  });

  it('writes activity for updates, completion, and blocker resolution', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id);

    const task = await createTask(owner, application.id, milestone.id);

    const blocker = await createBlocker(owner, application.id, {
      taskId: task.id,
    });

    const beforeCount = await activityCount(owner, application.id);

    expect(
      (
        await updateMilestone(owner, application.id, milestone.id, {
          title: 'Updated Milestone Activity',
        })
      ).status,
    ).toBe(200);

    expectDevelopmentSuccess(await resolveBlocker(owner, application.id, blocker.id, 'Resolved for activity test'));

    expectDevelopmentSuccess(await completeTask(owner, application.id, task.id));

    const afterCount = await activityCount(owner, application.id);

    expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 3);
  });

  it('does not create activity for rejected validation', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const beforeCount = await activityCount(owner, application.id);

    const response = await owner.agent
      .post(`/api/v1/workspaces/${owner.workspaceId}/applications/${application.id}/development/milestones`)
      .set(withBearer(owner.accessToken))
      .send({
        title: '',
        weight: 0,
      });

    expect(response.status).toBe(400);

    expect(await activityCount(owner, application.id)).toBe(beforeCount);
  });

  it('keeps development activity isolated between workspaces', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    const alphaApplication = await createApplication(alphaOwner);

    const betaApplication = await createApplication(betaOwner);

    const alphaMilestone = await createMilestone(alphaOwner, alphaApplication.id);

    const betaMilestone = await createMilestone(betaOwner, betaApplication.id);

    const alphaResponse = await listActivity(alphaOwner, alphaApplication.id);

    const serialized = JSON.stringify(alphaResponse.body);

    expect(serialized).toContain(alphaMilestone.id);

    expect(serialized).not.toContain(betaMilestone.id);

    const foreignResponse = await betaOwner.agent
      .get(applicationRoutes.applicationActivities(alphaOwner.workspaceId, alphaApplication.id))
      .set(withBearer(betaOwner.accessToken));

    expectAccessDenied(foreignResponse);
  });

  it('does not expose authentication secrets in development activity', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    await createMilestone(owner, application.id, {
      description: 'Normal non-sensitive metadata',
    });

    const response = await listActivity(owner, application.id);

    const serialized = JSON.stringify(response.body).toLowerCase();

    expect(serialized).not.toContain(owner.input.password.toLowerCase());

    expect(serialized).not.toContain(owner.accessToken.toLowerCase());

    expect(serialized).not.toContain('passwordhash');

    expect(serialized).not.toContain('refreshtoken');
  });
});
