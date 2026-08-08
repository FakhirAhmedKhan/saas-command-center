import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { createApplication } from './helpers/application';

import { createTestApp } from './helpers/create-test-app';

import {
  completeMilestone,
  completeTask,
  createMilestone,
  createTask,
  expectDevelopmentSuccess,
  findNumberDeep,
  findRecordById,
  findStringDeep,
  getDevelopmentSummary,
  listMilestones,
  readDevelopmentItems,
  reopenMilestone,
  reopenTask,
  skipMilestone,
  skipTask,
} from './helpers/development';

import { resetDatabase } from './helpers/database';

import { registerWorkspaceTestUser } from './helpers/workspace';

describe('Development Progress E2E', () => {
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

  async function readProgress(
    owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>,
    applicationId: string,
  ): Promise<number> {
    const response = await getDevelopmentSummary(owner, applicationId);

    expect(response.status).toBe(200);

    const progress = findNumberDeep(response.body, ['percentage', 'progressPercent', 'progress']);

    if (progress === undefined) {
      throw new Error(`Progress was not found in ${JSON.stringify(response.body)}`);
    }

    return progress;
  }

  it('starts at zero progress', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    expect(await readProgress(owner, application.id)).toBe(0);
  });

  it('calculates weighted task and milestone progress', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const heavyMilestone = await createMilestone(owner, application.id, {
      title: 'Heavy Milestone',
      weight: 2,
    });

    const lightMilestone = await createMilestone(owner, application.id, {
      title: 'Light Milestone',
      weight: 1,
    });

    const heavyTask = await createTask(owner, application.id, heavyMilestone.id, {
      weight: 1,
    });

    await createTask(owner, application.id, lightMilestone.id, {
      weight: 1,
    });

    expectDevelopmentSuccess(await completeTask(owner, application.id, heavyTask.id));

    expect(await readProgress(owner, application.id)).toBe(67);
  });

  it('calculates milestone progress from weighted tasks', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id, {
      weight: 1,
    });

    const heavyTask = await createTask(owner, application.id, milestone.id, {
      title: 'Heavy Task',
      weight: 3,
    });

    await createTask(owner, application.id, milestone.id, {
      title: 'Light Task',
      weight: 1,
    });

    expectDevelopmentSuccess(await completeTask(owner, application.id, heavyTask.id));

    expect(await readProgress(owner, application.id)).toBe(75);
  });

  it('excludes skipped tasks from applicable task weight', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id);

    const completed = await createTask(owner, application.id, milestone.id, {
      weight: 1,
    });

    const skipped = await createTask(owner, application.id, milestone.id, {
      weight: 3,
    });

    expectDevelopmentSuccess(await completeTask(owner, application.id, completed.id));

    expectDevelopmentSuccess(await skipTask(owner, application.id, skipped.id));

    expect(await readProgress(owner, application.id)).toBe(100);
  });

  it('excludes skipped milestones from application progress', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const completedMilestone = await createMilestone(owner, application.id, {
      weight: 1,
    });

    const skippedMilestone = await createMilestone(owner, application.id, {
      weight: 9,
    });

    expectDevelopmentSuccess(await completeMilestone(owner, application.id, completedMilestone.id));

    expectDevelopmentSuccess(await skipMilestone(owner, application.id, skippedMilestone.id));

    expect(await readProgress(owner, application.id)).toBe(100);
  });

  it('recalculates progress after task reopen', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id);

    const task = await createTask(owner, application.id, milestone.id);

    expectDevelopmentSuccess(await completeTask(owner, application.id, task.id));

    expect(await readProgress(owner, application.id)).toBe(100);

    expectDevelopmentSuccess(await reopenTask(owner, application.id, task.id));

    expect(await readProgress(owner, application.id)).toBe(0);
  });

  it('supports manual milestone complete and reopen when it has no tasks', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id);

    expectDevelopmentSuccess(await completeMilestone(owner, application.id, milestone.id));

    expect(await readProgress(owner, application.id)).toBe(100);

    expectDevelopmentSuccess(await reopenMilestone(owner, application.id, milestone.id));

    expect(await readProgress(owner, application.id)).toBe(0);
  });

  it('derives milestone status from task progress', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const milestone = await createMilestone(owner, application.id);

    const firstTask = await createTask(owner, application.id, milestone.id);

    const secondTask = await createTask(owner, application.id, milestone.id);

    expectDevelopmentSuccess(await completeTask(owner, application.id, firstTask.id));

    let milestones = readDevelopmentItems(await listMilestones(owner, application.id), [
      'milestones',
    ]);

    let stored = findRecordById(milestones, milestone.id);

    expect(findStringDeep(stored, ['status'])).toBe('IN_PROGRESS');

    expectDevelopmentSuccess(await completeTask(owner, application.id, secondTask.id));

    milestones = readDevelopmentItems(await listMilestones(owner, application.id), ['milestones']);

    stored = findRecordById(milestones, milestone.id);

    expect(findStringDeep(stored, ['status'])).toBe('COMPLETED');
  });
});
