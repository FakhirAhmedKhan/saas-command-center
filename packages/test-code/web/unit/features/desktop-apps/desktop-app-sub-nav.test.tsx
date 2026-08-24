// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';

const usePathnameMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('DesktopAppSubNav', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/workspaces/workspace-1/desktop-apps/desktop-1');
  });

  it('renders Phase 5-10 live tabs', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Builds')).toBeInTheDocument();
    expect(screen.getByText('Tests')).toBeInTheDocument();
  });
  it('renders Phase 5-11 live tabs', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Builds')).toBeInTheDocument();
    expect(screen.getByText('Tests')).toBeInTheDocument();
    expect(screen.getByText('Releases')).toBeInTheDocument();
  });

  it('links Releases to the desktop release route', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(
      screen.getByRole('link', {
        name: 'Releases',
      }),
    ).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/releases');
  });

  it('links Phase 12-14 tabs to implemented routes', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(screen.getByRole('link', { name: 'Performance' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/performance');

    expect(screen.getByRole('link', { name: 'Crashes' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/crashes');

    expect(screen.getByRole('link', { name: 'Dependencies' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/dependencies');

    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/security');
  });
  it('links Code to the desktop code route', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(
      screen.getByRole('link', {
        name: 'Code',
      }),
    ).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/code');
  });

  it('links implemented release and security routes', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(screen.getByRole('link', { name: 'Releases' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/releases');

    expect(screen.getByRole('link', { name: 'Performance' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/performance');

    expect(screen.getByRole('link', { name: 'Crashes' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/crashes');

    expect(screen.getByRole('link', { name: 'Dependencies' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/dependencies');

    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/security');
  });
});
