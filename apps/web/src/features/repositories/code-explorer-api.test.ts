import { getRepositoryBranches, getRepositoryCodeFile, getRepositoryFileDiff, getRepositoryTree, searchRepositoryFiles } from './code-explorer-api';
import { repositoryRequest } from './repositories-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repositories-api', () => ({
  repositoryRequest: vi.fn(),
}));

const repositoryRequestMock = vi.mocked(repositoryRequest);

const WORKSPACE = 'workspace-1';
const REPO = 'repo-1';
const CODE_BASE = `/workspaces/${WORKSPACE}/repositories/${REPO}/code`;

beforeEach(() => {
  repositoryRequestMock.mockReset();
});

describe('code-explorer-api', () => {
  it('gets branches for a repository', async () => {
    repositoryRequestMock.mockResolvedValue({});

    await getRepositoryBranches(WORKSPACE, REPO);

    expect(repositoryRequestMock).toHaveBeenCalledWith(`${CODE_BASE}/branches`);
  });

  it('gets the file tree for a branch', async () => {
    repositoryRequestMock.mockResolvedValue({});

    await getRepositoryTree(WORKSPACE, REPO, 'main');

    expect(repositoryRequestMock).toHaveBeenCalledWith(`${CODE_BASE}/tree?branch=main`);
  });

  it('gets a code file by branch and path', async () => {
    repositoryRequestMock.mockResolvedValue({});

    await getRepositoryCodeFile(WORKSPACE, REPO, 'main', 'src/index.ts');

    expect(repositoryRequestMock).toHaveBeenCalledWith(`${CODE_BASE}/file?branch=main&path=src%2Findex.ts`);
  });

  it('searches repository files by branch and query', async () => {
    repositoryRequestMock.mockResolvedValue({});

    await searchRepositoryFiles(WORKSPACE, REPO, 'main', 'TODO');

    expect(repositoryRequestMock).toHaveBeenCalledWith(`${CODE_BASE}/search?branch=main&query=TODO`);
  });

  it('gets a file diff between base and head refs', async () => {
    repositoryRequestMock.mockResolvedValue({});

    await getRepositoryFileDiff(WORKSPACE, REPO, 'main', 'feature-branch', 'src/index.ts');

    expect(repositoryRequestMock).toHaveBeenCalledWith(`${CODE_BASE}/diff?base=main&head=feature-branch&path=src%2Findex.ts`);
  });
});
