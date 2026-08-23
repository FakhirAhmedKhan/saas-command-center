// @vitest-environment jsdom

import { DesktopAppCard } from '@/features/desktop-apps/desktop-app-card';
import type { DesktopApplicationDetails } from '@command-center/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const desktopApp: DesktopApplicationDetails = {
  id: 'desktop-1',

  applicationId: 'application-1',

  platform: 'CROSS_PLATFORM',

  framework: 'ELECTRON',

  architecture: 'X64',

  packageName: 'com.commandcenter.desktop',

  currentVersion: '2.4.0',

  currentBuildNumber: '184',

  minimumOsVersion: 'Windows 10',

  updateChannel: 'stable',

  createdAt: '2026-08-23T00:00:00.000Z',

  updatedAt: '2026-08-23T00:00:00.000Z',

  application: {
    id: 'application-1',

    workspaceId: 'workspace-1',

    name: 'Command Center Desktop',

    slug: 'command-center-desktop',

    type: 'DESKTOP',

    archivedAt: null,

    createdAt: '2026-08-23T00:00:00.000Z',

    updatedAt: '2026-08-23T00:00:00.000Z',
  },
};

describe('DesktopAppCard', () => {
  it('renders desktop metadata', () => {
    render(<DesktopAppCard workspaceId='workspace-1' desktopApp={desktopApp} />);

    expect(screen.getByText('Command Center Desktop')).toBeInTheDocument();

    expect(screen.getByText('Cross-platform')).toBeInTheDocument();

    expect(screen.getByText('Electron')).toBeInTheDocument();

    expect(screen.getByText('x64')).toBeInTheDocument();

    expect(screen.getByText('2.4.0')).toBeInTheDocument();

    expect(screen.getByText('184')).toBeInTheDocument();
  });

  it('links to open and edit routes', () => {
    render(<DesktopAppCard workspaceId='workspace-1' desktopApp={desktopApp} />);

    expect(
      screen.getByRole('link', {
        name: /open/i,
      }),
    ).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1');

    expect(
      screen.getByRole('link', {
        name: /edit/i,
      }),
    ).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1#edit');
  });
});
