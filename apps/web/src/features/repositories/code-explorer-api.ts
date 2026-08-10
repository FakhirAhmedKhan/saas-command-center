import { repositoryRequest } from './repositories-api';
import type {
  RepositoryBranchesResponse,
  RepositoryCodeFile,
  RepositoryDiffResponse,
  RepositorySearchResponse,
  RepositoryTreeResponse,
} from './code-explorer.types';

function codeBase(workspaceId: string, repositoryId: string): string {
  return `/workspaces/${workspaceId}` + `/repositories/${repositoryId}` + '/code';
}

export function getRepositoryBranches(workspaceId: string, repositoryId: string): Promise<RepositoryBranchesResponse> {
  return repositoryRequest(`${codeBase(workspaceId, repositoryId)}/branches`);
}

export function getRepositoryTree(workspaceId: string, repositoryId: string, branch: string): Promise<RepositoryTreeResponse> {
  const params = new URLSearchParams({
    branch,
  });

  return repositoryRequest(`${codeBase(workspaceId, repositoryId)}/tree?${params.toString()}`);
}

export function getRepositoryCodeFile(workspaceId: string, repositoryId: string, branch: string, path: string): Promise<RepositoryCodeFile> {
  const params = new URLSearchParams({
    branch,
    path,
  });

  return repositoryRequest(`${codeBase(workspaceId, repositoryId)}/file?${params.toString()}`);
}

export function searchRepositoryFiles(workspaceId: string, repositoryId: string, branch: string, query: string): Promise<RepositorySearchResponse> {
  const params = new URLSearchParams({
    branch,
    query,
  });

  return repositoryRequest(`${codeBase(workspaceId, repositoryId)}/search?${params.toString()}`);
}

export function getRepositoryFileDiff(workspaceId: string, repositoryId: string, base: string, head: string, path: string): Promise<RepositoryDiffResponse> {
  const params = new URLSearchParams({
    base,
    head,
    path,
  });

  return repositoryRequest(`${codeBase(workspaceId, repositoryId)}/diff?${params.toString()}`);
}
