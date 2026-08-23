// @vitest-environment jsdom

import { listDesktopBuilds } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopBuilds } from '@/features/desktop-apps/desktop-builds';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  listDesktopBuilds: vi.fn(),
}));

const listMock = vi.mocked(listDesktopBuilds);

const build = {
  id: 'build-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  repositoryId: 'repository-1',
  workflowRunId: '901',
  source: 'GITHUB_ACTIONS',
  commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
  branch: 'main',
  version: '2.0.0',
  buildNumber: '200',
  platform: 'WINDOWS',
  architecture: 'X64',
  status: 'SUCCESS',
  startedAt: '2026-08-23T01:00:00.000Z',
  completedAt: '2026-08-23T01:05:00.000Z',
  durationMs: 300000,
  createdAt: '2026-08-23T01:00:00.000Z',
  updatedAt: '2026-08-23T01:05:00.000Z',
} as never;

describe('DesktopBuilds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([build]);
  });

  it('renders build lifecycle data', async () => {
    render(<DesktopBuilds workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('Success')).toBeInTheDocument();

    expect(screen.getByText('WINDOWS')).toBeInTheDocument();

    expect(screen.getByText('X64')).toBeInTheDocument();

    expect(screen.getByText('a93f1425')).toBeInTheDocument();

    expect(screen.getByText('5m 0s')).toBeInTheDocument();
  });

  it('passes filters to API', async () => {
    const user = userEvent.setup();

    render(<DesktopBuilds workspaceId='workspace-1' desktopAppId='desktop-1' />);

    await screen.findByText('Success');

    await user.selectOptions(screen.getByLabelText('Build status filter'), 'SUCCESS');

    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith(
        'workspace-1',
        'desktop-1',
        expect.objectContaining({
          status: 'SUCCESS',
        }),
      );
    });
  });
});
