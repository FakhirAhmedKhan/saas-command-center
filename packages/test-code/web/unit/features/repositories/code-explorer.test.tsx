// @vitest-environment jsdom
import { CodeExplorer } from '@/features/repositories/code-explorer';
import type { RepositoryBranchesResponse, RepositoryTreeResponse } from '@/features/repositories/code-explorer.types';
import type { RepositoryConnection } from '@/features/repositories/repository.types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getRepositoryMock, getRepositoryBranchesMock, getRepositoryTreeMock, getRepositoryCodeFileMock, searchRepositoryFilesMock, getRepositoryFileDiffMock } =
  vi.hoisted(() => ({
    getRepositoryMock: vi.fn(),
    getRepositoryBranchesMock: vi.fn(),
    getRepositoryTreeMock: vi.fn(),
    getRepositoryCodeFileMock: vi.fn(),
    searchRepositoryFilesMock: vi.fn(),
    getRepositoryFileDiffMock: vi.fn(),
  }));

vi.mock('@/features/repositories/repositories-api', () => ({
  getRepository: getRepositoryMock,
}));

vi.mock('@/features/repositories/code-explorer-api', () => ({
  getRepositoryBranches: getRepositoryBranchesMock,
  getRepositoryTree: getRepositoryTreeMock,
  getRepositoryCodeFile: getRepositoryCodeFileMock,
  searchRepositoryFiles: searchRepositoryFilesMock,
  getRepositoryFileDiff: getRepositoryFileDiffMock,
}));

const WORKSPACE = 'workspace-1';
const REPOSITORY = 'repo-1';

function repositoryFixture(overrides: Partial<RepositoryConnection> = {}): RepositoryConnection {
  return {
    id: REPOSITORY,
    workspaceId: WORKSPACE,
    installationId: 'installation-1',
    applicationId: null,
    provider: 'GITHUB',
    externalRepoId: '123',
    owner: 'acme',
    name: 'demo',
    fullName: 'acme/demo',
    defaultBranch: 'main',
    isPrivate: true,
    htmlUrl: 'https://github.com/acme/demo',
    archived: false,
    isAvailable: true,
    lastSyncedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    application: null,
    installation: {
      id: 'installation-1',
      externalInstallationId: '456',
      accountLogin: 'acme',
      accountType: 'Organization',
      connectedAt: '2026-01-01T00:00:00.000Z',
      lastSyncedAt: null,
    },

    ...overrides,
  };
}

function branchesFixture(): RepositoryBranchesResponse {
  return {
    defaultBranch: 'main',
    branches: [
      { name: 'main', sha: 'sha-main', protected: true },
      { name: 'feature', sha: 'sha-feature', protected: false },
    ],
  };
}

function treeFixture(marker: string): RepositoryTreeResponse {
  return {
    repositoryId: REPOSITORY,
    branch: marker,
    sha: `sha-${marker}`,
    truncated: false,
    nodes: [
      {
        name: `${marker}.ts`,
        path: `${marker}.ts`,
        type: 'file',
        sha: `file-sha-${marker}`,
        size: 10,
      },
    ],
  };
}

/** A promise plus its resolve function, so a test can control ordering explicitly. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

beforeEach(() => {
  getRepositoryMock.mockReset();
  getRepositoryBranchesMock.mockReset();
  getRepositoryTreeMock.mockReset();
  getRepositoryCodeFileMock.mockReset();
  searchRepositoryFilesMock.mockReset();
  getRepositoryFileDiffMock.mockReset();

  getRepositoryMock.mockResolvedValue(repositoryFixture());
  getRepositoryBranchesMock.mockResolvedValue(branchesFixture());
  getRepositoryTreeMock.mockResolvedValue(treeFixture('main'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CodeExplorer', () => {
  it('loads the repository, branches, and default-branch tree on mount', async () => {
    render(<CodeExplorer workspaceId={WORKSPACE} repositoryId={REPOSITORY} />);

    await waitFor(() => expect(screen.getByText('acme/demo')).toBeInTheDocument());

    expect(getRepositoryMock).toHaveBeenCalledWith(WORKSPACE, REPOSITORY);
    expect(getRepositoryBranchesMock).toHaveBeenCalledWith(WORKSPACE, REPOSITORY);
    expect(getRepositoryTreeMock).toHaveBeenCalledWith(WORKSPACE, REPOSITORY, 'main');
    expect(screen.getByText('main.ts')).toBeInTheDocument();
  });

  it('ignores a stale tree response that resolves after a newer one for a different branch', async () => {
    const mainTree = deferred<RepositoryTreeResponse>();

    // The mount-time initialize() call for the default branch ("main")
    // deliberately never resolves during this test -- it stands in for a
    // slow request that is still in flight when the user switches branches.
    getRepositoryTreeMock.mockImplementationOnce(() => mainTree.promise);

    render(<CodeExplorer workspaceId={WORKSPACE} repositoryId={REPOSITORY} />);

    await waitFor(() => expect(getRepositoryTreeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

    // Switching branches issues a second, newer tree request that resolves
    // immediately (the default mock resolves synchronously with a "feature"
    // tree once selectedBranch is passed through).
    getRepositoryTreeMock.mockResolvedValueOnce(treeFixture('feature'));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'feature' } });

    await waitFor(() => expect(getRepositoryTreeMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('feature.ts')).toBeInTheDocument());

    // Now let the *older* main-branch request resolve, after the newer
    // feature-branch request already won. If the component does not
    // discard out-of-order responses, this would incorrectly clobber the
    // feature tree back to the main tree.
    mainTree.resolve(treeFixture('main'));

    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByText('feature.ts')).toBeInTheDocument();
    expect(screen.queryByText('main.ts')).not.toBeInTheDocument();
  });

  it('does not update state after unmounting while a request is still in flight', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const pendingRepository = deferred<RepositoryConnection>();

    getRepositoryMock.mockReturnValueOnce(pendingRepository.promise);

    const { unmount } = render(<CodeExplorer workspaceId={WORKSPACE} repositoryId={REPOSITORY} />);

    unmount();

    // Resolve after the component has already unmounted. The mount-guard in
    // initialize() must skip setRepository/setBranches/etc. entirely here.
    pendingRepository.resolve(repositoryFixture());

    await Promise.resolve();
    await Promise.resolve();

    const reactActWarnings = consoleError.mock.calls.filter((call) => typeof call[0] === 'string' && call[0].includes('unmounted component'));

    expect(reactActWarnings).toHaveLength(0);

    consoleError.mockRestore();
  });
});
