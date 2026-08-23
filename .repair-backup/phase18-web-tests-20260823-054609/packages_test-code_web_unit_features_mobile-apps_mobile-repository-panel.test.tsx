// @vitest-environment jsdom
import { MobileRepositoryPanel } from '@/features/mobile-apps/mobile-repository-panel';

import { getMobileRepository, linkMobileRepository, unlinkMobileRepository } from '@/features/mobile-apps/mobile-apps-api';

import { listRepositories } from '@/features/repositories/repositories-api';

import { render, screen, waitFor } from '@testing-library/react';

import userEvent from '@testing-library/user-event';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/mobile-apps/mobile-apps-api', () => ({
  getMobileRepository: vi.fn(),

  linkMobileRepository: vi.fn(),

  unlinkMobileRepository: vi.fn(),
}));

vi.mock('@/features/repositories/repositories-api', () => ({
  listRepositories: vi.fn(),
}));

const mockedGetMobileRepository = vi.mocked(getMobileRepository);

const mockedLinkMobileRepository = vi.mocked(linkMobileRepository);

const mockedUnlinkMobileRepository = vi.mocked(unlinkMobileRepository);

const mockedListRepositories = vi.mocked(listRepositories);

const mobileApp = {
  id: 'mobile-1',

  applicationId: 'application-1',

  platform: 'ANDROID',

  framework: 'ANDROID_NATIVE',

  packageId: 'com.example.mobile',

  bundleId: null,

  minOsVersion: '26',

  targetOsVersion: '36',

  currentVersion: '1.0.0',

  currentBuildNumber: '100',

  createdAt: new Date().toISOString(),

  updatedAt: new Date().toISOString(),

  application: {
    id: 'application-1',

    workspaceId: 'workspace-1',

    name: 'Mobile Test App',

    slug: 'mobile-test-app',

    type: 'MOBILE',

    archivedAt: null,

    createdAt: new Date().toISOString(),

    updatedAt: new Date().toISOString(),
  },
} as const;

const repository = {
  id: 'repository-1',

  workspaceId: 'workspace-1',

  applicationId: null,

  owner: 'command-center',

  name: 'android-app',

  fullName: 'command-center/android-app',

  defaultBranch: 'main',

  archived: false,

  isAvailable: true,
} as never;

describe('MobileRepositoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetMobileRepository.mockResolvedValue(null);

    mockedListRepositories.mockResolvedValue({
      repositories: [repository],
    } as never);

    mockedLinkMobileRepository.mockResolvedValue({
      ...repository,

      applicationId: 'application-1',
    } as never);

    mockedUnlinkMobileRepository.mockResolvedValue({
      success: true,
    });
  });

  it('loads available repositories', async () => {
    render(<MobileRepositoryPanel workspaceId='workspace-1' mobileApp={mobileApp} />);

    expect(await screen.findByText('command-center/android-app')).toBeInTheDocument();

    expect(mockedGetMobileRepository).toHaveBeenCalledWith('workspace-1', 'mobile-1');

    expect(mockedListRepositories).toHaveBeenCalledWith('workspace-1');
  });

  it('links selected repository', async () => {
    const user = userEvent.setup();

    const changed = vi.fn();

    render(<MobileRepositoryPanel workspaceId='workspace-1' mobileApp={mobileApp} onRepositoryChanged={changed} />);

    await screen.findByText('command-center/android-app');

    await user.selectOptions(screen.getByLabelText('Mobile repository'), 'repository-1');

    await user.click(
      screen.getByRole('button', {
        name: 'Connect Repository',
      }),
    );

    await waitFor(() => {
      expect(mockedLinkMobileRepository).toHaveBeenCalledWith('workspace-1', 'mobile-1', 'repository-1');
    });

    expect(changed).toHaveBeenCalled();
  });
});
