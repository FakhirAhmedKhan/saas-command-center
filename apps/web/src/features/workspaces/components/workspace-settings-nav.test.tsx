// @vitest-environment jsdom
import { WorkspaceSettingsNav } from './workspace-settings-nav';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

const WORKSPACE_ID = 'workspace-1';

describe('WorkspaceSettingsNav', () => {
  it('marks General as the current page on the base settings route, and no other tab', () => {
    usePathnameMock.mockReturnValue(`/workspaces/${WORKSPACE_ID}/settings`);

    render(<WorkspaceSettingsNav workspaceId={WORKSPACE_ID} />);

    expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Members' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Integrations' })).not.toHaveAttribute('aria-current');
  });

  it('marks Members as current on the members sub-route, not General', () => {
    usePathnameMock.mockReturnValue(`/workspaces/${WORKSPACE_ID}/settings/members`);

    render(<WorkspaceSettingsNav workspaceId={WORKSPACE_ID} />);

    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'General' })).not.toHaveAttribute('aria-current');
  });

  it('marks Integrations as current on the integrations sub-route', () => {
    usePathnameMock.mockReturnValue(`/workspaces/${WORKSPACE_ID}/settings/integrations`);

    render(<WorkspaceSettingsNav workspaceId={WORKSPACE_ID} />);

    expect(screen.getByRole('link', { name: 'Integrations' })).toHaveAttribute('aria-current', 'page');
  });

  it('builds each tab href from the given workspaceId', () => {
    usePathnameMock.mockReturnValue(`/workspaces/${WORKSPACE_ID}/settings`);

    render(<WorkspaceSettingsNav workspaceId={WORKSPACE_ID} />);

    expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute('href', `/workspaces/${WORKSPACE_ID}/settings`);
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', `/workspaces/${WORKSPACE_ID}/settings/members`);
    expect(screen.getByRole('link', { name: 'Integrations' })).toHaveAttribute('href', `/workspaces/${WORKSPACE_ID}/settings/integrations`);
  });
});
