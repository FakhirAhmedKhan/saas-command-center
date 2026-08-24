// @vitest-environment jsdom

import { getDesktopRepository, linkDesktopRepository, unlinkDesktopRepository } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopRepositoryPanel } from '@/features/desktop-apps/desktop-repository-panel';
import { listRepositories } from '@/features/repositories/repositories-api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  getDesktopRepository: vi.fn(),

  linkDesktopRepository: vi.fn(),

  unlinkDesktopRepository: vi.fn(),
}));

vi.mock('@/features/repositories/repositories-api', () => ({
  listRepositories: vi.fn(),
}));

const mockedGetDesktopRepository = vi.mocked(getDesktopRepository);

const mockedLinkDesktopRepository = vi.mocked(linkDesktopRepository);

const mockedUnlinkDesktopRepository = vi.mocked(unlinkDesktopRepository);

const mockedListRepositories = vi.mocked(listRepositories);

type DesktopRepositoryFixture = NonNullable<Awaited<ReturnType<typeof getDesktopRepository>>>;

const now = '2026-08-23T00:00:00.000Z';

const desktopApp = {
  id: 'desktop-1',

  applicationId: 'application-1',

  platform: 'CROSS_PLATFORM',

  framework: 'ELECTRON',

  architecture: 'X64',

  packageName: 'com.example.desktop',

  currentVersion: '1.0.0',

  currentBuildNumber: '100',

  minimumOsVersion: 'Windows 10',

  updateChannel: 'stable',

  createdAt: now,

  updatedAt: now,

  application: {
    id: 'application-1',

    workspaceId: 'workspace-1',

    name: 'Desktop Test App',

    slug: 'desktop-test-app',

    type: 'DESKTOP',

    archivedAt: null,

    createdAt: now,

    updatedAt: now,
  },
} as const;

const repositoryA: DesktopRepositoryFixture = {
  id: 'repository-1',

  workspaceId: 'workspace-1',

  installationId: 'installation-1',

  applicationId: null,

  provider: 'GITHUB',

  externalRepoId: '1001',

  owner: 'command-center',

  name: 'desktop-app',

  fullName: 'command-center/desktop-app',

  defaultBranch: 'main',

  isPrivate: false,

  htmlUrl: 'https://github.com/command-center/desktop-app',

  archived: false,

  isAvailable: true,

  lastSyncedAt: null,

  createdAt: now,

  updatedAt: now,

  application: null,

  installation: {
    id: 'installation-1',

    externalInstallationId: '9001',

    accountLogin: 'command-center',

    accountType: 'Organization',

    connectedAt: now,

    lastSyncedAt: null,
  },
} as DesktopRepositoryFixture;

const repositoryB: DesktopRepositoryFixture = {
  ...repositoryA,

  id: 'repository-2',

  externalRepoId: '1002',

  name: 'desktop-next',

  fullName: 'command-center/desktop-next',

  htmlUrl: 'https://github.com/command-center/desktop-next',
} as DesktopRepositoryFixture;

describe('DesktopRepositoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetDesktopRepository.mockResolvedValue(null);

    mockedListRepositories.mockResolvedValue({
      installations: [],

      repositories: [repositoryA, repositoryB],
    } as never);

    mockedLinkDesktopRepository.mockImplementation(
      async (_workspaceId, _desktopAppId, repositoryId) =>
        ({
          ...(repositoryId === 'repository-2' ? repositoryB : repositoryA),

          applicationId: 'application-1',
        }) as never,
    );

    mockedUnlinkDesktopRepository.mockResolvedValue({
      success: true,
    });
  });

  it('loads available repositories', async () => {
    render(<DesktopRepositoryPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    expect(
      await screen.findByRole('option', {
        name: 'command-center/desktop-app (main)',
      }),
    ).toBeInTheDocument();

    expect(mockedGetDesktopRepository).toHaveBeenCalledWith('workspace-1', 'desktop-1');

    expect(mockedListRepositories).toHaveBeenCalledWith('workspace-1');
  });

  it('links selected repository', async () => {
    const user = userEvent.setup();

    const changed = vi.fn();

    render(<DesktopRepositoryPanel workspaceId='workspace-1' desktopApp={desktopApp} onRepositoryChanged={changed} />);

    await screen.findByRole('option', {
      name: 'command-center/desktop-app (main)',
    });

    await user.selectOptions(screen.getByLabelText('Desktop repository'), 'repository-1');

    await user.click(
      screen.getByRole('button', {
        name: 'Connect Repository',
      }),
    );

    await waitFor(() => {
      expect(mockedLinkDesktopRepository).toHaveBeenCalledWith('workspace-1', 'desktop-1', 'repository-1');
    });

    expect(changed).toHaveBeenCalledTimes(1);

    expect(
      screen.getByText('command-center/desktop-app', {
        exact: true,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('changes repository', async () => {
    mockedGetDesktopRepository.mockResolvedValue({
      ...repositoryA,

      applicationId: 'application-1',
    } as never);

    const user = userEvent.setup();

    render(<DesktopRepositoryPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    expect(
      await screen.findByText('command-center/desktop-app', {
        exact: true,
      }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Desktop repository'), 'repository-2');

    await user.click(
      screen.getByRole('button', {
        name: 'Change Repository',
      }),
    );

    await waitFor(() => {
      expect(mockedLinkDesktopRepository).toHaveBeenCalledWith('workspace-1', 'desktop-1', 'repository-2');
    });

    expect(
      await screen.findByText('command-center/desktop-next', {
        exact: true,
      }),
    ).toBeInTheDocument();
  });

  it('unlinks repository', async () => {
    mockedGetDesktopRepository.mockResolvedValue({
      ...repositoryA,

      applicationId: 'application-1',
    } as never);

    const user = userEvent.setup();

    render(<DesktopRepositoryPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    await screen.findByRole('button', {
      name: 'Unlink',
    });

    await user.click(
      screen.getByRole('button', {
        name: 'Unlink',
      }),
    );

    await waitFor(() => {
      expect(mockedUnlinkDesktopRepository).toHaveBeenCalledWith('workspace-1', 'desktop-1');
    });

    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('shows repository loading failures', async () => {
    mockedGetDesktopRepository.mockRejectedValue(new Error('Repository API failed'));

    render(<DesktopRepositoryPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Repository API failed');
  });

  it('does not show archived repositories as selectable', async () => {
    mockedListRepositories.mockResolvedValue({
      installations: [],

      repositories: [
        {
          ...repositoryA,

          archived: true,
        },
      ],
    } as never);

    render(<DesktopRepositoryPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    expect(await screen.findByText(/No available repositories/)).toBeInTheDocument();

    expect(
      screen.queryByRole('option', {
        name: /command-center\/desktop-app/,
      }),
    ).not.toBeInTheDocument();
  });

  it('does not allow repository assigned to another application', async () => {
    mockedListRepositories.mockResolvedValue({
      installations: [],

      repositories: [
        {
          ...repositoryA,

          applicationId: 'different-application',
        },
      ],
    } as never);

    render(<DesktopRepositoryPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    expect(await screen.findByText(/No available repositories/)).toBeInTheDocument();
  });
});
