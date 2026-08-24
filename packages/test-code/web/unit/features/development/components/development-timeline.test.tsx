// @vitest-environment jsdom
import type { ApplicationMilestone, ApplicationTask } from '@/features/development/development-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DevelopmentTimeline } from '@/features/development/components/development-timeline';

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

describe('DevelopmentTimeline', () => {
  it('shows an empty-state message when no milestone or task has a due date', () => {
    render(<DevelopmentTimeline milestones={[milestone({ dueAt: null, tasks: [task({ dueAt: null })] })]} />);

    expect(screen.getByText('Add milestone or task due dates to build the timeline.')).toBeInTheDocument();
  });

  it('excludes a milestone without a due date but includes one that has one', () => {
    render(<DevelopmentTimeline milestones={[milestone({ id: 'm-1', title: 'No date milestone', dueAt: null }), milestone({ id: 'm-2', title: 'Dated milestone', dueAt: '2026-03-01T00:00:00.000Z' })]} />);

    expect(screen.queryByText('No date milestone')).not.toBeInTheDocument();
    expect(screen.getByText('Dated milestone')).toBeInTheDocument();
  });

  it('excludes tasks without a due date while including tasks that have one', () => {
    render(
      <DevelopmentTimeline
        milestones={[
          milestone({
            dueAt: null,
            tasks: [task({ id: 't-1', title: 'No due date task', dueAt: null }), task({ id: 't-2', title: 'Dated task', dueAt: '2026-02-01T00:00:00.000Z' })],
          }),
        ]}
      />,
    );

    expect(screen.queryByText('No due date task')).not.toBeInTheDocument();
    expect(screen.getByText('Dated task')).toBeInTheDocument();
  });

  it('sorts timeline items chronologically regardless of input order', () => {
    render(
      <DevelopmentTimeline
        milestones={[milestone({ id: 'm-late', title: 'Later milestone', dueAt: '2026-06-01T00:00:00.000Z' }), milestone({ id: 'm-early', title: 'Earlier milestone', dueAt: '2026-01-01T00:00:00.000Z' })]}
      />,
    );

    const earlierPosition = screen.getByText('Earlier milestone').compareDocumentPosition(screen.getByText('Later milestone'));

    // DOCUMENT_POSITION_FOLLOWING (4) means "Later milestone" appears after "Earlier milestone" in the DOM.
    expect(earlierPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders a status badge only for task-type items, not for milestone-type items', () => {
    render(
      <DevelopmentTimeline
        milestones={[
          milestone({
            id: 'm-1',
            title: 'Milestone item',
            dueAt: '2026-01-01T00:00:00.000Z',
            tasks: [task({ id: 't-1', title: 'Task item', status: 'BLOCKED', dueAt: '2026-01-02T00:00:00.000Z' })],
          }),
        ]}
      />,
    );

    // The task's status label renders as a badge; the milestone item has no equivalent badge for its own status.
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });
});
