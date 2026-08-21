import type { GithubCallbackResult, GithubConnectStart, GithubSetupResult, RepositoryConnection, RepositoryListResponse } from './repository.types';
import { apiRequest } from '@/features/lib/api/api-client';

/**
 * Get all GitHub installations and repositories
 * connected to a workspace.
 */
export function listRepositories(workspaceId: string): Promise<RepositoryListResponse> {
  return apiRequest<RepositoryListResponse>(`/workspaces/${workspaceId}/repositories`);
}

/**
 * Start GitHub App installation flow.
 *
 * Backend returns the GitHub installation URL.
 */
export function beginGithubConnect(workspaceId: string): Promise<GithubConnectStart> {
  return apiRequest<GithubConnectStart>(`/workspaces/${workspaceId}/repositories/github/connect`, {
    method: 'POST',
  });
}

/**
 * Called after GitHub redirects the user to:
 *
 * /github/setup
 *
 * It validates the installation state and returns
 * the GitHub OAuth authorization URL.
 */
export function completeGithubSetup(installState: string, installationId: string): Promise<GithubSetupResult> {
  return apiRequest<GithubSetupResult>('/repositories/github/setup', {
    method: 'POST',
    body: {
      installState,
      installationId,
    },
  });
}

/**
 * Called after GitHub OAuth redirects the user to:
 *
 * /github/callback
 *
 * Backend verifies the GitHub user and synchronizes repositories.
 */
export function completeGithubCallback(code: string, state: string): Promise<GithubCallbackResult> {
  return apiRequest<GithubCallbackResult>('/repositories/github/callback', {
    method: 'POST',
    body: {
      code,
      state,
    },
  });
}

/**
 * Synchronize all GitHub installations/repositories
 * connected to the workspace.
 */
export function syncRepositories(workspaceId: string): Promise<{
  installationCount: number;
  repositoryCount: number;
}> {
  return apiRequest<{
    installationCount: number;
    repositoryCount: number;
  }>(`/workspaces/${workspaceId}/repositories/sync`, {
    method: 'POST',
  });
}

/**
 * Synchronize a single repository.
 */
export function syncRepository(workspaceId: string, repositoryId: string): Promise<RepositoryConnection> {
  return apiRequest<RepositoryConnection>(`/workspaces/${workspaceId}/repositories/${repositoryId}/sync`, {
    method: 'POST',
  });
}

/**
 * Get a single repository connection.
 */
export function getRepository(workspaceId: string, repositoryId: string): Promise<RepositoryConnection> {
  return apiRequest<RepositoryConnection>(`/workspaces/${workspaceId}/repositories/${repositoryId}`);
}

/**
 * Link a repository to one SaaS application.
 */
export function linkRepositoryApplication(workspaceId: string, repositoryId: string, applicationId: string): Promise<RepositoryConnection> {
  return apiRequest<RepositoryConnection>(`/workspaces/${workspaceId}/repositories/${repositoryId}/application`, {
    method: 'PATCH',
    body: {
      applicationId,
    },
  });
}

/**
 * Remove the SaaS application association
 * from a repository.
 */
export function unlinkRepositoryApplication(workspaceId: string, repositoryId: string): Promise<RepositoryConnection> {
  return apiRequest<RepositoryConnection>(`/workspaces/${workspaceId}/repositories/${repositoryId}/application`, {
    method: 'DELETE',
  });
}

/**
 * Remove a GitHub installation from this workspace.
 *
 * This removes the local Command Center connection.
 */
export function disconnectGithubInstallation(
  workspaceId: string,
  installationRecordId: string,
): Promise<{
  success: true;
}> {
  return apiRequest<{
    success: true;
  }>(`/workspaces/${workspaceId}/repositories/github/installations/${installationRecordId}`, {
    method: 'DELETE',
  });
}
