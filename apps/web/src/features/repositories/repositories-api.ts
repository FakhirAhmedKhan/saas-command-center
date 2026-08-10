import { getAccessToken } from '@/features/lib/api/api-client';
import type { GithubCallbackResult, GithubConnectStart, GithubSetupResult, RepositoryConnection, RepositoryListResponse } from './repository.types';

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function repositoryRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error('Your session is not available. Please sign in and try again.');
  }

  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  let body: unknown;

  if (response.status !== 204) {
    const text = await response.text();

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
  }

  if (!response.ok) {
    const apiError = body && typeof body === 'object' ? (body as ApiErrorBody) : undefined;

    const message = Array.isArray(apiError?.message)
      ? apiError.message.join(', ')
      : (apiError?.message ?? apiError?.error ?? `Request failed with status ${response.status}.`);

    throw new Error(message);
  }

  return body as T;
}

/**
 * Get all GitHub installations and repositories
 * connected to a workspace.
 */
export function listRepositories(workspaceId: string): Promise<RepositoryListResponse> {
  return repositoryRequest<RepositoryListResponse>(`/workspaces/${workspaceId}/repositories`);
}

/**
 * Start GitHub App installation flow.
 *
 * Backend returns the GitHub installation URL.
 */
export function beginGithubConnect(workspaceId: string): Promise<GithubConnectStart> {
  return repositoryRequest<GithubConnectStart>(`/workspaces/${workspaceId}/repositories/github/connect`, {
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
  return repositoryRequest<GithubSetupResult>('/repositories/github/setup', {
    method: 'POST',

    body: JSON.stringify({
      installState,
      installationId,
    }),
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
  return repositoryRequest<GithubCallbackResult>('/repositories/github/callback', {
    method: 'POST',

    body: JSON.stringify({
      code,
      state,
    }),
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
  return repositoryRequest<{
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
  return repositoryRequest<RepositoryConnection>(`/workspaces/${workspaceId}/repositories/${repositoryId}/sync`, {
    method: 'POST',
  });
}

/**
 * Get a single repository connection.
 */
export function getRepository(workspaceId: string, repositoryId: string): Promise<RepositoryConnection> {
  return repositoryRequest<RepositoryConnection>(`/workspaces/${workspaceId}/repositories/${repositoryId}`);
}

/**
 * Link a repository to one SaaS application.
 */
export function linkRepositoryApplication(workspaceId: string, repositoryId: string, applicationId: string): Promise<RepositoryConnection> {
  return repositoryRequest<RepositoryConnection>(`/workspaces/${workspaceId}/repositories/${repositoryId}/application`, {
    method: 'PATCH',

    body: JSON.stringify({
      applicationId,
    }),
  });
}

/**
 * Remove the SaaS application association
 * from a repository.
 */
export function unlinkRepositoryApplication(workspaceId: string, repositoryId: string): Promise<RepositoryConnection> {
  return repositoryRequest<RepositoryConnection>(`/workspaces/${workspaceId}/repositories/${repositoryId}/application`, {
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
  return repositoryRequest<{
    success: true;
  }>(`/workspaces/${workspaceId}/repositories/github/installations/${installationRecordId}`, {
    method: 'DELETE',
  });
}
