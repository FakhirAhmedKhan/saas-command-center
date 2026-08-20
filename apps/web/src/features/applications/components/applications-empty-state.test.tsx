// @vitest-environment jsdom
import { ApplicationsEmptyState } from './applications-empty-state';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const WORKSPACE_ID = 'workspace-1';

describe('ApplicationsEmptyState', () => {
  it('shows the filtered-empty message and wires the clear-filters action when filters are active', async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();

    render(<ApplicationsEmptyState workspaceId={WORKSPACE_ID} hasActiveFilters isArchivedView={false} onClearFilters={onClearFilters} />);

    expect(screen.getByRole('heading', { name: 'No applications match these filters' })).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: 'Clear filters' });

    await user.click(clearButton);

    expect(onClearFilters).toHaveBeenCalledTimes(1);

    // The "create application" link must not render while filters own the empty state.
    expect(screen.queryByRole('link', { name: /create application/i })).not.toBeInTheDocument();
  });

  it('takes priority over the archived view when both are true', () => {
    render(<ApplicationsEmptyState workspaceId={WORKSPACE_ID} hasActiveFilters isArchivedView onClearFilters={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'No applications match these filters' })).toBeInTheDocument();
  });

  it('shows the archived-empty message with no action when viewing the archive and no filters are active', () => {
    render(<ApplicationsEmptyState workspaceId={WORKSPACE_ID} hasActiveFilters={false} isArchivedView onClearFilters={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'No archived applications' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the create-application call to action pointing at the workspace new-application route by default', () => {
    render(<ApplicationsEmptyState workspaceId={WORKSPACE_ID} hasActiveFilters={false} isArchivedView={false} onClearFilters={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'No applications yet' })).toBeInTheDocument();

    const createLink = screen.getByRole('link', { name: /create application/i });

    expect(createLink).toHaveAttribute('href', `/workspaces/${WORKSPACE_ID}/applications/new`);
  });
});
