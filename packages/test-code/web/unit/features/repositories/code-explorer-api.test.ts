import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/features/lib/api/api-client';
import { getRepositoryBranches, getRepositoryCodeFile, getRepositoryFileDiff, getRepositoryTree, searchRepositoryFiles } from '@/features/repositories/code-explorer-api';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);
const WORKSPACE = 'workspace-1';
const REPO = 'repo-1';
const CODE_BASE = `/workspaces/${WORKSPACE}/repositories/${REPO}/code`;

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue({});
});

describe('code-explorer-api', () => {
  it('gets branches for a repository via apiRequest', async () => {
    await getRepositoryBranches(WORKSPACE, REPO);

    expect(mockedApiRequest).toHaveBeenCalledWith(`${CODE_BASE}/branches`);
  });

  it('gets the file tree for a branch', async () => {
    await getRepositoryTree(WORKSPACE, REPO, 'main');

    expect(mockedApiRequest).toHaveBeenCalledWith(`${CODE_BASE}/tree?branch=main`);
  });

  it('gets a code file by branch and path', async () => {
    await getRepositoryCodeFile(WORKSPACE, REPO, 'main', 'src/index.ts');

    expect(mockedApiRequest).toHaveBeenCalledWith(`${CODE_BASE}/file?branch=main&path=src%2Findex.ts`);
  });

  it('searches repository files by branch and query', async () => {
    await searchRepositoryFiles(WORKSPACE, REPO, 'main', 'TODO');

    expect(mockedApiRequest).toHaveBeenCalledWith(`${CODE_BASE}/search?branch=main&query=TODO`);
  });

  it('gets a file diff between base and head refs', async () => {
    await getRepositoryFileDiff(WORKSPACE, REPO, 'main', 'feature-branch', 'src/index.ts');

    expect(mockedApiRequest).toHaveBeenCalledWith(`${CODE_BASE}/diff?base=main&head=feature-branch&path=src%2Findex.ts`);
  });
});
