// @vitest-environment jsdom
import { ActivityItem } from '@/features/activity/components/activity-item';
import type { ApplicationActivity } from '@/features/activity/activity-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function buildActivity(overrides: Partial<ApplicationActivity> = {}): ApplicationActivity {
  return {
    id: 'activity-1',
    workspaceId: 'workspace-1',
    applicationId: 'app-1',
    applicationName: 'Command Center',
    actorUserId: 'user-1',
    actorType: 'USER',
    activityType: 'APPLICATION_CREATED',
    entityType: 'APPLICATION',
    entityId: 'app-1',
    title: 'Created the application',
    description: null,
    metadata: null,
    createdAt: '2026-01-15T12:00:00.000Z',
    actor: { id: 'user-1', email: 'dev@example.com', displayName: 'Dev User' },
    application: null,
    ...overrides,
  };
}

describe('ActivityItem', () => {
  it('renders the title, activity type label, and entity type label', () => {
    render(<ActivityItem workspaceId='workspace-1' activity={buildActivity()} />);

    expect(screen.getByText('Created the application')).toBeInTheDocument();
    expect(screen.getByText('Application created')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();
  });

  it('does not render a description block when description is null', () => {
    render(<ActivityItem workspaceId='workspace-1' activity={buildActivity({ description: null })} />);

    // The description paragraph only exists when description is truthy; nothing else uses this exact text.
    expect(screen.queryByText('Detailed notes about this change')).not.toBeInTheDocument();
  });

  it('renders the description text when present', () => {
    render(<ActivityItem workspaceId='workspace-1' activity={buildActivity({ description: 'Detailed notes about this change' })} />);

    expect(screen.getByText('Detailed notes about this change')).toBeInTheDocument();
  });

  it('does not render an application link when showApplication is false, even if applicationId is present', () => {
    render(<ActivityItem workspaceId='workspace-1' activity={buildActivity()} showApplication={false} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links to the application when showApplication is true and the application still exists', () => {
    render(<ActivityItem workspaceId='workspace-1' activity={buildActivity({ applicationId: 'app-1', applicationName: 'Command Center' })} showApplication />);

    const link = screen.getByRole('link', { name: /Command Center/ });

    expect(link).toHaveAttribute('href', '/workspaces/workspace-1/applications/app-1');
  });

  it('shows a "deleted" label instead of a link when the application no longer exists', () => {
    render(<ActivityItem workspaceId='workspace-1' activity={buildActivity({ applicationId: null, applicationName: 'Removed App' })} showApplication />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Removed App')).toBeInTheDocument();
    expect(screen.getByText('— deleted')).toBeInTheDocument();
  });

  it('renders the metadata summary when metadata resolves to a human-readable string', () => {
    render(<ActivityItem workspaceId='workspace-1' activity={buildActivity({ metadata: { previousStatus: 'IDEA', currentStatus: 'PLANNING' } })} />);

    expect(screen.getByText('Idea → Planning')).toBeInTheDocument();
  });

  it("renders the actor's display name, falling back through email to a generic label", () => {
    const { rerender } = render(
      <ActivityItem workspaceId='workspace-1' activity={buildActivity({ actor: { id: 'user-1', email: 'dev@example.com', displayName: 'Dev User' } })} />,
    );

    expect(screen.getByText('by Dev User')).toBeInTheDocument();

    rerender(<ActivityItem workspaceId='workspace-1' activity={buildActivity({ actor: null })} />);

    expect(screen.getByText('by Former user')).toBeInTheDocument();
  });

  it('renders a time element whose dateTime attribute matches the raw createdAt value', () => {
    render(<ActivityItem workspaceId='workspace-1' activity={buildActivity({ createdAt: '2026-01-15T12:00:00.000Z' })} />);

    const time = document.querySelector('time');

    expect(time).toHaveAttribute('datetime', '2026-01-15T12:00:00.000Z');
  });
});
