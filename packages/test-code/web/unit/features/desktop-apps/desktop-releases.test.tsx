// @vitest-environment jsdom

import { DesktopReleases } from '@/features/desktop-apps/desktop-releases';
import { createDesktopRelease, listDesktopBuilds, listDesktopReleases, updateDesktopReleaseStatus } from '@/features/desktop-apps/desktop-apps-api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  createDesktopRelease: vi.fn(),
  listDesktopBuilds: vi.fn(),
  listDesktopReleases: vi.fn(),
  updateDesktopReleaseStatus: vi.fn(),
}));

const listReleasesMock = vi.mocked(listDesktopReleases);
const listBuildsMock = vi.mocked(listDesktopBuilds);
const createReleaseMock = vi.mocked(createDesktopRelease);
const updateStatusMock = vi.mocked(updateDesktopReleaseStatus);

const build = {
  id: 'build-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  repositoryId: 'repo-1',
  workflowRunId: '184',
  source: 'GITHUB_ACTIONS',
  commitSha: 'abcdef1234567890',
  branch: 'main',
  version: '2.4.0',
  buildNumber: '184',
  platform: 'WINDOWS',
  architecture: 'X64',
  status: 'SUCCESS',
  startedAt: '2026-08-23T01:00:00.000Z',
  completedAt: '2026-08-23T01:04:00.000Z',
  durationMs: 240000,
  createdAt: '2026-08-23T01:00:00.000Z',
  updatedAt: '2026-08-23T01:04:00.000Z',
} as const;

const release = {
  id: 'release-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  buildId: 'build-1',
  version: '2.4.0',
  buildNumber: '184',
  channel: 'STABLE',
  platform: 'WINDOWS',
  architecture: 'X64',
  status: 'PUBLISHED',
  releaseNotes: 'Stable release notes',
  releasedAt: '2026-08-23T02:00:00.000Z',
  createdAt: '2026-08-23T01:30:00.000Z',
  updatedAt: '2026-08-23T02:00:00.000Z',
  build: {
    ...build,
    artifacts: [
      {
        id: 'artifact-1',
        buildId: 'build-1',
        providerArtifactId: 'provider-artifact-1',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'command-center-2.4.0-x64.msi',
        sizeBytes: 88_000_000,
        checksum: 'sha256:test',
        externalUrl: 'https://example.test/app.msi',
        createdAt: '2026-08-23T01:05:00.000Z',
      },
    ],
  },
} as const;

describe('DesktopReleases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    listBuildsMock.mockResolvedValue([build] as never);
    listReleasesMock.mockResolvedValue([] as never);
    createReleaseMock.mockResolvedValue(release as never);
    updateStatusMock.mockResolvedValue(release as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders the empty release state', async () => {
    render(<DesktopReleases workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('No desktop releases yet')).toBeInTheDocument();
  });

  it('creates a release from a successful build', async () => {
    const user = userEvent.setup();

    render(<DesktopReleases workspaceId='workspace-1' desktopAppId='desktop-1' />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Create Release',
      }),
    );

    await user.selectOptions(screen.getByLabelText('Successful build'), 'build-1');

    await user.selectOptions(screen.getByLabelText('Update channel'), 'STABLE');

    await user.type(screen.getByLabelText('Release notes'), 'Ship stable build');

    await user.click(
      screen.getByRole('button', {
        name: 'Create Desktop Release',
      }),
    );

    await waitFor(() => {
      expect(createReleaseMock).toHaveBeenCalledWith(
        'workspace-1',
        'desktop-1',
        expect.objectContaining({
          buildId: 'build-1',
          channel: 'STABLE',
          version: '2.4.0',
          buildNumber: '184',
          releaseNotes: 'Ship stable build',
        }),
      );
    });
  });

  it('renders source -> build -> artifact -> release traceability', async () => {
    listReleasesMock.mockResolvedValue([release] as never);

    render(<DesktopReleases workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('2.4.0')).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('command-center-2.4.0-x64.msi')).toBeInTheDocument();
    expect(screen.getByText('Source → Build → Artifact → Release')).toBeInTheDocument();
  });

  it('rolls back a published release', async () => {
    listReleasesMock.mockResolvedValue([release] as never);

    render(<DesktopReleases workspaceId='workspace-1' desktopAppId='desktop-1' />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Roll Back',
      }),
    );

    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalledWith('workspace-1', 'desktop-1', 'release-1', 'ROLLED_BACK');
    });
  });
});
