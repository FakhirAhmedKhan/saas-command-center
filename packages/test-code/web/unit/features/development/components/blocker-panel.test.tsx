// @vitest-environment jsdom
import { BlockerPanel } from '@/features/development/components/blocker-panel';
import { createBlocker, deleteBlocker, reopenBlocker, resolveBlocker } from '@/features/development/development-api';
import type { ApplicationBlocker, ApplicationMilestone, ApplicationTask } from '@/features/development/development-types';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/development/development-api', () => ({
  createBlocker: vi.fn(),
  deleteBlocker: vi.fn(),
  reopenBlocker: vi.fn(),
  resolveBlocker: vi.fn(),
}));

const createBlockerMock = vi.mocked(createBlocker);
const deleteBlockerMock = vi.mocked(deleteBlocker);
const reopenBlockerMock = vi.mocked(reopenBlocker);
const resolveBlockerMock = vi.mocked(resolveBlocker);

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

function blocker(overrides: Partial<ApplicationBlocker> = {}): ApplicationBlocker {
  return {
    id: 'blocker-1',
    applicationId: 'app-1',
    milestoneId: null,
    taskId: null,
    title: 'API outage',
    description: null,
    severity: 'HIGH',
    status: 'OPEN',
    openedAt: '2026-01-01T00:00:00.000Z',
    resolvedAt: null,
    resolution: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  createBlockerMock.mockReset().mockResolvedValue({} as never);
  deleteBlockerMock.mockReset().mockResolvedValue({} as never);
  reopenBlockerMock.mockReset().mockResolvedValue({} as never);
  resolveBlockerMock.mockReset().mockResolvedValue({} as never);
  vi.restoreAllMocks();
});

describe('BlockerPanel empty and rendering', () => {
  it('shows an empty-state message when there are no blockers', () => {
    render(<BlockerPanel workspaceId='workspace-1' applicationId='app-1' milestones={[]} blockers={[]} onChanged={vi.fn()} />);

    expect(screen.getByText('No blockers recorded.')).toBeInTheDocument();
  });

  it('shows "Open" for an OPEN blocker and "Resolved" for a RESOLVED one', () => {
    render(
      <BlockerPanel
        workspaceId='workspace-1'
        applicationId='app-1'
        milestones={[]}
        blockers={[
          blocker({ id: 'b-1', title: 'Open one', status: 'OPEN' }),
          blocker({ id: 'b-2', title: 'Resolved one', status: 'RESOLVED', resolution: 'Fixed it' }),
        ]}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Resolution: Fixed it')).toBeInTheDocument();
  });

  it('shows a Resolve button for an open blocker and a Reopen button for a resolved one', () => {
    render(
      <BlockerPanel workspaceId='workspace-1' applicationId='app-1' milestones={[]} blockers={[blocker({ id: 'b-1', status: 'OPEN' })]} onChanged={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: /Resolve/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reopen/ })).not.toBeInTheDocument();
  });
});

describe('BlockerPanel task scoping in the create form', () => {
  it('offers all tasks across milestones when no milestone is selected', () => {
    const milestones = [
      milestone({ id: 'm-1', title: 'Milestone A', tasks: [task({ id: 't-1', title: 'Task A1' })] }),
      milestone({ id: 'm-2', title: 'Milestone B', tasks: [task({ id: 't-2', title: 'Task B1' })] }),
    ];

    render(<BlockerPanel workspaceId='workspace-1' applicationId='app-1' milestones={milestones} blockers={[]} onChanged={vi.fn()} />);

    const taskSelect = screen.getByDisplayValue('No specific task');

    expect(within(taskSelect).getByText('Task A1')).toBeInTheDocument();
    expect(within(taskSelect).getByText('Task B1')).toBeInTheDocument();
  });

  it('narrows the task options to only the selected milestone', async () => {
    const milestones = [
      milestone({ id: 'm-1', title: 'Milestone A', tasks: [task({ id: 't-1', title: 'Task A1' })] }),
      milestone({ id: 'm-2', title: 'Milestone B', tasks: [task({ id: 't-2', title: 'Task B1' })] }),
    ];

    const user = userEvent.setup();

    render(<BlockerPanel workspaceId='workspace-1' applicationId='app-1' milestones={milestones} blockers={[]} onChanged={vi.fn()} />);

    const milestoneSelect = screen.getByDisplayValue('Application-level');

    await user.selectOptions(milestoneSelect, 'm-1');

    const taskSelect = screen.getByDisplayValue('No specific task');

    expect(within(taskSelect).getByText('Task A1')).toBeInTheDocument();
    expect(within(taskSelect).queryByText('Task B1')).not.toBeInTheDocument();
  });
});

describe('BlockerPanel create flow', () => {
  it('shows a validation error and does not call createBlocker when the title is too short', async () => {
    const user = userEvent.setup();

    render(<BlockerPanel workspaceId='workspace-1' applicationId='app-1' milestones={[]} blockers={[]} onChanged={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Blocker title'), 'a');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Add' }));
    });

    expect(screen.getByText('Blocker title is required.')).toBeInTheDocument();
    expect(createBlockerMock).not.toHaveBeenCalled();
  });

  it('creates a blocker with null milestoneId/taskId when none are chosen', async () => {
    const onChanged = vi.fn();
    const user = userEvent.setup();

    render(<BlockerPanel workspaceId='workspace-1' applicationId='app-1' milestones={[]} blockers={[]} onChanged={onChanged} />);

    await user.type(screen.getByPlaceholderText('Blocker title'), 'Deploy is broken');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Add' }));
    });

    expect(createBlockerMock).toHaveBeenCalledWith('workspace-1', 'app-1', {
      title: 'Deploy is broken',
      severity: 'HIGH',
      milestoneId: null,
      taskId: null,
    });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});

describe('BlockerPanel resolve/reopen/delete via prompts and confirms', () => {
  it('resolves a blocker only when window.prompt returns a non-empty resolution', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Patched the API');
    const user = userEvent.setup();

    render(
      <BlockerPanel workspaceId='workspace-1' applicationId='app-1' milestones={[]} blockers={[blocker({ id: 'b-1', status: 'OPEN' })]} onChanged={vi.fn()} />,
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Resolve/ }));
    });

    expect(resolveBlockerMock).toHaveBeenCalledWith('workspace-1', 'app-1', 'b-1', 'Patched the API');
  });

  it('does not resolve a blocker when window.prompt is dismissed (returns null)', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    const user = userEvent.setup();

    render(
      <BlockerPanel workspaceId='workspace-1' applicationId='app-1' milestones={[]} blockers={[blocker({ id: 'b-1', status: 'OPEN' })]} onChanged={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /Resolve/ }));

    expect(resolveBlockerMock).not.toHaveBeenCalled();
  });

  it('deletes a blocker only when window.confirm returns true', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <BlockerPanel
        workspaceId='workspace-1'
        applicationId='app-1'
        milestones={[]}
        blockers={[blocker({ id: 'b-1', title: 'Delete me' })]}
        onChanged={vi.fn()}
      />,
    );

    const deleteButton = screen.getAllByRole('button').at(-1)!;

    await act(async () => {
      await user.click(deleteButton);
    });

    expect(deleteBlockerMock).toHaveBeenCalledWith('workspace-1', 'app-1', 'b-1');
  });

  it('does not delete a blocker when window.confirm returns false', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();

    render(
      <BlockerPanel
        workspaceId='workspace-1'
        applicationId='app-1'
        milestones={[]}
        blockers={[blocker({ id: 'b-1', title: 'Keep me' })]}
        onChanged={vi.fn()}
      />,
    );

    const deleteButton = screen.getAllByRole('button').at(-1)!;

    await user.click(deleteButton);

    expect(deleteBlockerMock).not.toHaveBeenCalled();
  });

  it('reopens a resolved blocker directly, without a prompt', async () => {
    const user = userEvent.setup();

    render(
      <BlockerPanel
        workspaceId='workspace-1'
        applicationId='app-1'
        milestones={[]}
        blockers={[blocker({ id: 'b-1', status: 'RESOLVED' })]}
        onChanged={vi.fn()}
      />,
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Reopen/ }));
    });

    expect(reopenBlockerMock).toHaveBeenCalledWith('workspace-1', 'app-1', 'b-1');
  });
});
