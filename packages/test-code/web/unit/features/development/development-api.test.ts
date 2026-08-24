import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyDevelopmentTemplate,
  completeMilestone,
  completeTask,
  createBlocker,
  createMilestone,
  createTask,
  deleteBlocker,
  deleteMilestone,
  deleteTask,
  getDevelopmentSummary,
  getDevelopmentTemplates,
  moveTask,
  reopenBlocker,
  reopenMilestone,
  reopenTask,
  reorderMilestones,
  reorderTasks,
  resolveBlocker,
  setTaskStatus,
  skipMilestone,
  skipTask,
  updateBlocker,
  updateMilestone,
  updateTask,
} from '@/features/development/development-api';
import { apiRequest } from '@/features/lib/api/api-client';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);
const WORKSPACE = 'workspace-1';
const APP = 'app-1';
const BASE = `/workspaces/${WORKSPACE}/applications/${APP}/development`;

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('development-api read operations', () => {
  it('gets development templates scoped to the workspace only', async () => {
    apiRequestMock.mockResolvedValue([]);

    await getDevelopmentTemplates(WORKSPACE);

    expect(apiRequestMock).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/development/templates`);
  });

  it('gets the development summary for an application', async () => {
    apiRequestMock.mockResolvedValue({});

    await getDevelopmentSummary(WORKSPACE, APP);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/summary`);
  });
});

describe('development-api template application', () => {
  it('applies a template with replaceExisting defaulting to false', async () => {
    apiRequestMock.mockResolvedValue({});

    await applyDevelopmentTemplate(WORKSPACE, APP, 'STANDARD_SAAS');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ template: 'STANDARD_SAAS', replaceExisting: false }),
    });
  });

  it('applies a template with an explicit replaceExisting flag', async () => {
    apiRequestMock.mockResolvedValue({});

    await applyDevelopmentTemplate(WORKSPACE, APP, 'AI_SAAS', true);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ template: 'AI_SAAS', replaceExisting: true }),
    });
  });
});

describe('development-api milestone mutations', () => {
  it('creates a milestone with a POST to the milestones collection', async () => {
    apiRequestMock.mockResolvedValue({});
    const payload = { title: 'Beta launch', weight: 20, startsAt: null, dueAt: null };

    await createMilestone(WORKSPACE, APP, payload);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updates a milestone with a PATCH to its id', async () => {
    apiRequestMock.mockResolvedValue({});

    await updateMilestone(WORKSPACE, APP, 'milestone-1', { title: 'Renamed' });

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones/milestone-1`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Renamed' }),
    });
  });

  it('completes a milestone via POST /complete', async () => {
    apiRequestMock.mockResolvedValue({});

    await completeMilestone(WORKSPACE, APP, 'milestone-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones/milestone-1/complete`, { method: 'POST' });
  });

  it('reopens a milestone via POST /reopen', async () => {
    apiRequestMock.mockResolvedValue({});

    await reopenMilestone(WORKSPACE, APP, 'milestone-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones/milestone-1/reopen`, { method: 'POST' });
  });

  it('skips a milestone and sends the reason in the body', async () => {
    apiRequestMock.mockResolvedValue({});

    await skipMilestone(WORKSPACE, APP, 'milestone-1', 'Out of scope');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones/milestone-1/skip`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Out of scope' }),
    });
  });

  it('deletes a milestone with DELETE', async () => {
    apiRequestMock.mockResolvedValue({ message: 'deleted' });

    await deleteMilestone(WORKSPACE, APP, 'milestone-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones/milestone-1`, { method: 'DELETE' });
  });

  it('reorders milestones by posting the ordered id list', async () => {
    apiRequestMock.mockResolvedValue([]);

    await reorderMilestones(WORKSPACE, APP, ['m-2', 'm-1']);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds: ['m-2', 'm-1'] }),
    });
  });
});

describe('development-api task mutations', () => {
  it('creates a task nested under its milestone', async () => {
    apiRequestMock.mockResolvedValue({});
    const payload = { title: 'Write tests', priority: 'HIGH' as const, weight: 5, dueAt: null };

    await createTask(WORKSPACE, APP, 'milestone-1', payload);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones/milestone-1/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updates a task via PATCH', async () => {
    apiRequestMock.mockResolvedValue({});

    await updateTask(WORKSPACE, APP, 'task-1', { weight: 8 });

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/tasks/task-1`, {
      method: 'PATCH',
      body: JSON.stringify({ weight: 8 }),
    });
  });

  it('sets a restricted task status via POST /status', async () => {
    apiRequestMock.mockResolvedValue({});

    await setTaskStatus(WORKSPACE, APP, 'task-1', 'BLOCKED');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/tasks/task-1/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'BLOCKED' }),
    });
  });

  it('completes a task via POST /complete', async () => {
    apiRequestMock.mockResolvedValue({});

    await completeTask(WORKSPACE, APP, 'task-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/tasks/task-1/complete`, { method: 'POST' });
  });

  it('reopens a task via POST /reopen', async () => {
    apiRequestMock.mockResolvedValue({});

    await reopenTask(WORKSPACE, APP, 'task-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/tasks/task-1/reopen`, { method: 'POST' });
  });

  it('skips a task and sends the reason', async () => {
    apiRequestMock.mockResolvedValue({});

    await skipTask(WORKSPACE, APP, 'task-1', 'No longer needed');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/tasks/task-1/skip`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'No longer needed' }),
    });
  });

  it('moves a task to a target milestone', async () => {
    apiRequestMock.mockResolvedValue({});

    await moveTask(WORKSPACE, APP, 'task-1', 'milestone-2');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/tasks/task-1/move`, {
      method: 'POST',
      body: JSON.stringify({ targetMilestoneId: 'milestone-2' }),
    });
  });

  it('reorders tasks within a milestone', async () => {
    apiRequestMock.mockResolvedValue([]);

    await reorderTasks(WORKSPACE, APP, 'milestone-1', ['t-2', 't-1']);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/milestones/milestone-1/tasks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds: ['t-2', 't-1'] }),
    });
  });

  it('deletes a task with DELETE', async () => {
    apiRequestMock.mockResolvedValue({ message: 'deleted' });

    await deleteTask(WORKSPACE, APP, 'task-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/tasks/task-1`, { method: 'DELETE' });
  });
});

describe('development-api blocker mutations', () => {
  it('creates a blocker with the full payload', async () => {
    apiRequestMock.mockResolvedValue({});
    const payload = { title: 'API down', severity: 'CRITICAL' as const, milestoneId: null, taskId: null };

    await createBlocker(WORKSPACE, APP, payload);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/blockers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updates a blocker via PATCH', async () => {
    apiRequestMock.mockResolvedValue({});

    await updateBlocker(WORKSPACE, APP, 'blocker-1', { severity: 'LOW' });

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/blockers/blocker-1`, {
      method: 'PATCH',
      body: JSON.stringify({ severity: 'LOW' }),
    });
  });

  it('resolves a blocker and sends the resolution text', async () => {
    apiRequestMock.mockResolvedValue({});

    await resolveBlocker(WORKSPACE, APP, 'blocker-1', 'Patched upstream');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/blockers/blocker-1/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution: 'Patched upstream' }),
    });
  });

  it('reopens a blocker via POST /reopen', async () => {
    apiRequestMock.mockResolvedValue({});

    await reopenBlocker(WORKSPACE, APP, 'blocker-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/blockers/blocker-1/reopen`, { method: 'POST' });
  });

  it('deletes a blocker with DELETE', async () => {
    apiRequestMock.mockResolvedValue({ message: 'deleted' });

    await deleteBlocker(WORKSPACE, APP, 'blocker-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/blockers/blocker-1`, { method: 'DELETE' });
  });
});
