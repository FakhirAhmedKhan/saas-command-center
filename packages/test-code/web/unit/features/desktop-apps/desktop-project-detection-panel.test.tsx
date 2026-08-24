// @vitest-environment jsdom

import { applyDetectedDesktopConfiguration, detectDesktopProject } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopProjectDetectionPanel } from '@/features/desktop-apps/desktop-project-detection-panel';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  detectDesktopProject: vi.fn(),
  applyDetectedDesktopConfiguration: vi.fn(),
}));

const detectMock = vi.mocked(detectDesktopProject);

const updateMock = vi.mocked(applyDetectedDesktopConfiguration);

type DesktopAppFixture = Awaited<ReturnType<typeof applyDetectedDesktopConfiguration>>;

const desktopApp: DesktopAppFixture = {
  id: 'desktop-1',
  applicationId: 'application-1',
  platform: 'CROSS_PLATFORM',
  framework: 'OTHER',
  architecture: 'X64',
  packageName: null,
  currentVersion: null,
  currentBuildNumber: null,
  minimumOsVersion: null,
  updateChannel: 'stable',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  application: {
    id: 'application-1',
    workspaceId: 'workspace-1',
    name: 'Desktop Test',
    slug: 'desktop-test',
    type: 'DESKTOP',
    archivedAt: null,
    createdAt: '2026-08-23T00:00:00.000Z',
    updatedAt: '2026-08-23T00:00:00.000Z',
  },
} as DesktopAppFixture;

describe('DesktopProjectDetectionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    detectMock.mockResolvedValue({
      repositoryId: 'repository-1',
      repositoryFullName: 'command-center/desktop',
      branch: 'main',
      truncated: false,
      candidates: [
        {
          applicationType: 'DESKTOP',
          projectRoot: '',
          platform: 'CROSS_PLATFORM',
          framework: 'ELECTRON',
          architecture: 'X64',
          packageName: 'command-center-desktop',
          version: '1.2.0',
          buildNumber: null,
          minimumOsVersion: null,
          confidence: 'HIGH',
          score: 96,
          evidence: ['package.json', 'package.json:electron'],
          warnings: [],
        },
      ],
      primary: {
        applicationType: 'DESKTOP',
        projectRoot: '',
        platform: 'CROSS_PLATFORM',
        framework: 'ELECTRON',
        architecture: 'X64',
        packageName: 'command-center-desktop',
        version: '1.2.0',
        buildNumber: null,
        minimumOsVersion: null,
        confidence: 'HIGH',
        score: 96,
        evidence: ['package.json', 'package.json:electron'],
        warnings: [],
      },
    });

    updateMock.mockResolvedValue({
      ...desktopApp,
      framework: 'ELECTRON',
      packageName: 'command-center-desktop',
      currentVersion: '1.2.0',
    } as never);
  });

  it('runs detection and renders normalized result', async () => {
    const user = userEvent.setup();

    render(<DesktopProjectDetectionPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Repository',
      }),
    );

    expect(await screen.findByDisplayValue('command-center-desktop')).toBeInTheDocument();

    expect(screen.getByDisplayValue('1.2.0')).toBeInTheDocument();

    expect(screen.getByText('HIGH · 96%')).toBeInTheDocument();
  });

  it('allows manual correction before saving detected config', async () => {
    const user = userEvent.setup();

    render(<DesktopProjectDetectionPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Repository',
      }),
    );

    await user.selectOptions(await screen.findByLabelText('Detected architecture'), 'ARM64');

    await user.click(
      screen.getByRole('button', {
        name: 'Use Detected Configuration',
      }),
    );

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'workspace-1',
        'desktop-1',
        expect.objectContaining({
          framework: 'ELECTRON',
          architecture: 'ARM64',
          packageName: 'command-center-desktop',
        }),
      );
    });
  });

  it('renders safe no-match state', async () => {
    detectMock.mockResolvedValue({
      repositoryId: 'repository-1',
      repositoryFullName: 'command-center/web-only',
      branch: 'main',
      truncated: false,
      candidates: [],
      primary: null,
    });

    const user = userEvent.setup();

    render(<DesktopProjectDetectionPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Repository',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('No supported desktop project was detected');
  });
});
