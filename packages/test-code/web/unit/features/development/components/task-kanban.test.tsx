// @vitest-environment jsdom
import { TaskKanban } from '@/features/development/components/task-kanban';
import { completeTask, reopenTask, setTaskStatus } from '@/features/development/development-api';
import type { ApplicationMilestone, ApplicationTask } from '@/features/development/development-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/development/development-api', () => ({
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
  setTaskStatus: vi.fn(),
}));

const completeTaskMock = vi.mocked(completeTask);
const reopenTaskMock = vi.mocked(reopenTask);
const setTaskStatusMock = vi.mocked(setTaskStatus);

function task(overrides: Partial<ApplicationTask> = {}): ApplicationTask {
  return {
    id: 'task-1',
    milestoneId: 'milestone-1',
    assigneeUserId: null,
    title: 'Write docs',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    weight: 1,
    position: 0,
    dueAt: null,
    completedAt: null,
    skippedAt: null,
    skipReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    blockers: [],
    ...overrides,
  };
}

function milestone(overrides: Partial<ApplicationMilestone> = {}): ApplicationMilestone {
  return {
    id: 'milestone-1',
    applicationId: 'app-1',
    title: 'Launch',
    description: null,
    status: 'PLANNED',
    weight: 10,
    position: 0,
    progressPercent: 0,
    startsAt: null,
    dueAt: null,
    completedAt: null,
    skippedAt: null,
    skipReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tasks: [],
    blockers: [],
    ...overrides,
  };
}

beforeEach(() => {
  completeTaskMock.mockReset().mockResolvedValue({} as never);
  reopenTaskMock.mockReset().mockResolvedValue({} as never);
  setTaskStatusMock.mockReset().mockResolvedValue({} as never);
});

describe('TaskKanban', () => {
  it('groups tasks from multiple milestones into their matching status column', () => {
    const milestones = [
      milestone({ id: 'm-1', tasks: [task({ id: 't-1', title: 'Todo task', status: 'TODO' })] }),
      milestone({ id: 'm-2', tasks: [task({ id: 't-2', title: 'Blocked task', status: 'BLOCKED' })] }),
    ];

    render(<TaskKanban workspaceId='workspace-1' applicationId='app-1' milestones={milestones} onChanged={vi.fn()} />);

    expect(screen.getByText('Todo task')).toBeInTheDocument();
    expect(screen.getByText('Blocked task')).toBeInTheDocument();
  });

  it('shows "No tasks" for a column with nothing in that status', () => {
    render(<TaskKanban workspaceId='workspace-1' applicationId='app-1' milestones={[milestone({ tasks: [task({ status: 'TODO' })] })]} onChanged={vi.fn()} />);

    // Only TODO has a task; the other three columns (In progress, Blocked, Completed) show "No tasks".
    expect(screen.getAllByText('No tasks')).toHaveLength(3);
  });

  it('calls completeTask (not setTaskStatus) when moving a task directly to Completed', async () => {
    const onChanged = vi.fn();
    const user = userEvent.setup();

    render(
      <TaskKanban
        workspaceId='workspace-1'
        applicationId='app-1'
        milestones={[milestone({ tasks: [task({ id: 't-1', status: 'TODO' })] })]}
        onChanged={onChanged}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Completed/ }));

    expect(completeTaskMock).toHaveBeenCalledWith('workspace-1', 'app-1', 't-1');
    expect(setTaskStatusMock).not.toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('calls setTaskStatus directly for a same-lane transition between TODO/IN_PROGRESS/BLOCKED', async () => {
    const user = userEvent.setup();

    render(
      <TaskKanban
        workspaceId='workspace-1'
        applicationId='app-1'
        milestones={[milestone({ tasks: [task({ id: 't-1', status: 'TODO' })] })]}
        onChanged={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Blocked/ }));

    expect(setTaskStatusMock).toHaveBeenCalledWith('workspace-1', 'app-1', 't-1', 'BLOCKED');
    expect(reopenTaskMock).not.toHaveBeenCalled();
  });

  it('reopens a completed task before setting a non-TODO target status', async () => {
    const user = userEvent.setup();

    render(
      <TaskKanban
        workspaceId='workspace-1'
        applicationId='app-1'
        milestones={[milestone({ tasks: [task({ id: 't-1', status: 'COMPLETED' })] })]}
        onChanged={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /In progress/ }));

    expect(reopenTaskMock).toHaveBeenCalledWith('workspace-1', 'app-1', 't-1');
    expect(setTaskStatusMock).toHaveBeenCalledWith('workspace-1', 'app-1', 't-1', 'IN_PROGRESS');
  });

  it('reopens a completed task and does NOT call setTaskStatus again when the target is TODO', async () => {
    const user = userEvent.setup();

    render(
      <TaskKanban
        workspaceId='workspace-1'
        applicationId='app-1'
        milestones={[milestone({ tasks: [task({ id: 't-1', status: 'COMPLETED' })] })]}
        onChanged={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /To do/ }));

    expect(reopenTaskMock).toHaveBeenCalledWith('workspace-1', 'app-1', 't-1');
    expect(setTaskStatusMock).not.toHaveBeenCalled();
  });
});
