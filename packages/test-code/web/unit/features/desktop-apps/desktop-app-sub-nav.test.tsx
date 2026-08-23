// @vitest-environment jsdom

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('keeps only Phase 12+ tabs disabled', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(screen.queryByRole('link', { name: 'Performance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crashes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dependencies' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Security' })).not.toBeInTheDocument();
  });
  it('links Code to the desktop code route', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(
      screen.getByRole('link', {
        name: 'Code',
      }),
    ).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/code');
  });

  it('keeps future phases disabled instead of linking to 404 routes', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    for (const label of ['Releases', 'Performance', 'Crashes', 'Dependencies', 'Security']) {
      expect(screen.getByText(label)).toHaveAttribute('aria-disabled', 'true');
    }
  });
});
