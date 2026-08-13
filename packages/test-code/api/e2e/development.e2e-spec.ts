import { createApplication, enumValue, recordString } from '../helpers/application';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import {
  createBlocker,
  createMilestone,
  createTask,
  deleteBlocker,
  deleteMilestone,
  deleteTask,
  developmentRoutes,
  expectDevelopmentSuccess,
  findRecordById,
  listBlockers,
  listMilestones,
  listTemplates,
  moveTask,
  readDevelopmentItems,
  // readDevelopmentRecord,
  reopenBlocker,
  reorderMilestones,
  reorderTasks,
  resolveBlocker,
  setTaskStatus,
  updateBlocker,
  updateMilestone,
  updateTask,
} from '../helpers/development';
import { expectBusinessRuleRejected, registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { BlockerStatus, WorkItemPriority } from 'src/generated/prisma/enums';

describe('Development E2E', () => {
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

  it('lists available development templates', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await listTemplates(owner);

    expect(response.status).toBe(200);

    expect(readDevelopmentItems(response, ['templates']).length).toBeGreaterThan(0);
  });

  it('creates, lists, and updates a milestone', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id, {
      title: 'Backend Foundation',

      weight: 4,
    });

    expect(recordString(milestone.record, 'title')).toBe('Backend Foundation');

    const updateResponse = await updateMilestone(owner, application.id, milestone.id, {
      title: 'Backend Foundation Updated',

      weight: 5,
    });

    expect(updateResponse.status).toBe(200);

    const listResponse = await listMilestones(owner, application.id);

    expect(listResponse.status).toBe(200);

    const records = readDevelopmentItems(listResponse, ['milestones']);

    const stored = findRecordById(records, milestone.id);

    expect(stored).toBeDefined();

    expect(recordString(stored ?? {}, 'title')).toBe('Backend Foundation Updated');
  });

  it('creates and updates a task inside a milestone', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id);

    const task = await createTask(owner, application.id, milestone.id, {
      title: 'Create Authentication',

      weight: 3,
    });

    const updateResponse = await updateTask(owner, application.id, task.id, {
      title: 'Create Secure Authentication',

      priority: enumValue(WorkItemPriority, 1),
    });

    expect(updateResponse.status).toBe(200);

    const statusResponse = await setTaskStatus(owner, application.id, task.id, 'IN_PROGRESS');

    expectDevelopmentSuccess(statusResponse);

    const listResponse = await listMilestones(owner, application.id);

    const stored = findRecordById(readDevelopmentItems(listResponse, ['milestones']), task.id);

    expect(stored).toBeDefined();

    expect(recordString(stored ?? {}, 'title')).toBe('Create Secure Authentication');

    expect(recordString(stored ?? {}, 'status')).toBe('IN_PROGRESS');
  });

  it('moves and reorders tasks and milestones', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const firstMilestone = await createMilestone(owner, application.id, {
      title: 'First Milestone',
    });

    const secondMilestone = await createMilestone(owner, application.id, {
      title: 'Second Milestone',
    });

    const firstTask = await createTask(owner, application.id, firstMilestone.id, {
      title: 'First Task',
    });

    const secondTask = await createTask(owner, application.id, secondMilestone.id, {
      title: 'Second Task',
    });

    expectDevelopmentSuccess(await moveTask(owner, application.id, firstTask.id, secondMilestone.id, 0));

    expectDevelopmentSuccess(await reorderTasks(owner, application.id, secondMilestone.id, [secondTask.id, firstTask.id]));

    expectDevelopmentSuccess(await reorderMilestones(owner, application.id, [secondMilestone.id, firstMilestone.id]));

    const listResponse = await listMilestones(owner, application.id);

    const records = readDevelopmentItems(listResponse, ['milestones']);

    expect(recordString(records[0] ?? {}, 'id')).toBe(secondMilestone.id);

    const secondStored = findRecordById(records, secondMilestone.id);

    const nestedJson = JSON.stringify(secondStored);

    expect(nestedJson).toContain(firstTask.id);

    expect(nestedJson).toContain(secondTask.id);
  });

  it('creates, updates, resolves, reopens, filters, and deletes a blocker', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id);

    const task = await createTask(owner, application.id, milestone.id);

    const blocker = await createBlocker(owner, application.id, {
      title: 'Waiting for Credentials',

      milestoneId: milestone.id,

      taskId: task.id,
    });

    const updateResponse = await updateBlocker(owner, application.id, blocker.id, {
      title: 'Waiting for Production Credentials',
    });

    expect(updateResponse.status).toBe(200);

    expectDevelopmentSuccess(await resolveBlocker(owner, application.id, blocker.id, 'Production credentials received'));

    const resolvedResponse = await listBlockers(owner, application.id, {
      status: enumValue(BlockerStatus, 1),
    });

    expect(resolvedResponse.status).toBe(200);

    expectDevelopmentSuccess(await reopenBlocker(owner, application.id, blocker.id));

    const searchResponse = await listBlockers(owner, application.id, {
      search: 'Production Credentials',
    });

    const searched = readDevelopmentItems(searchResponse, ['blockers']);

    expect(findRecordById(searched, blocker.id)).toBeDefined();

    expectDevelopmentSuccess(await deleteBlocker(owner, application.id, blocker.id));

    const finalResponse = await listBlockers(owner, application.id);

    expect(findRecordById(readDevelopmentItems(finalResponse, ['blockers']), blocker.id)).toBeUndefined();
  });

  it('deletes tasks and milestones', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id);

    const task = await createTask(owner, application.id, milestone.id);

    expectDevelopmentSuccess(await deleteTask(owner, application.id, task.id));

    expectDevelopmentSuccess(await deleteMilestone(owner, application.id, milestone.id));

    const listResponse = await listMilestones(owner, application.id);

    const records = readDevelopmentItems(listResponse, ['milestones']);

    expect(findRecordById(records, task.id)).toBeUndefined();

    expect(findRecordById(records, milestone.id)).toBeUndefined();
  });

  it('rejects invalid milestone, task, blocker, and reorder payloads', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const invalidMilestone = await owner.agent
      .post(developmentRoutes.milestones(owner.workspaceId, application.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        title: '',
        weight: 101,
      });

    expect(invalidMilestone.status).toBe(400);

    const milestone = await createMilestone(owner, application.id);

    const invalidTask = await owner.agent
      .post(developmentRoutes.tasks(owner.workspaceId, application.id, milestone.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        title: '',
        priority: 'INVALID_PRIORITY',
        weight: 0,
      });

    expect(invalidTask.status).toBe(400);

    const invalidBlocker = await owner.agent
      .post(developmentRoutes.blockers(owner.workspaceId, application.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        title: '',
        severity: 'INVALID_SEVERITY',
      });

    expect(invalidBlocker.status).toBe(400);

    const invalidReorder = await reorderMilestones(owner, application.id, ['not-a-uuid']);

    expect(invalidReorder.status).toBe(400);

    const invalidQuery = await listBlockers(owner, application.id, {
      page: 0,
      limit: 101,
    });

    expect(invalidQuery.status).toBe(400);
  });

  it('rejects child IDs belonging to another application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const firstApplication = await createApplication(owner);

    const secondApplication = await createApplication(owner);

    const firstMilestone = await createMilestone(owner, firstApplication.id);

    const firstTask = await createTask(owner, firstApplication.id, firstMilestone.id);

    const milestoneResponse = await updateMilestone(owner, secondApplication.id, firstMilestone.id, {
      title: 'Wrong Application',
    });

    expectBusinessRuleRejected(milestoneResponse);

    const taskResponse = await updateTask(owner, secondApplication.id, firstTask.id, {
      title: 'Wrong Application Task',
    });

    expectBusinessRuleRejected(taskResponse);
  });
});
