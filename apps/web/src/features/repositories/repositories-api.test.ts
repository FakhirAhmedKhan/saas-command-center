import {
  beginGithubConnect,
  completeGithubCallback,
  completeGithubSetup,
  disconnectGithubInstallation,
  getRepository,
  linkRepositoryApplication,
  listRepositories,
  syncRepositories,
  syncRepository,
  unlinkRepositoryApplication,
} from './repositories-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * This module must route every repository/GitHub call through the shared
 * apiRequest client so it inherits 401-refresh-retry, credentials, and
 * ApiError parsing (already covered by api-client.test.ts) instead of
 * duplicating that logic with a second HTTP client.
 */
vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const WORKSPACE = 'workspace-1';

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue(undefined);
});

describe('repositories-api read operations', () => {
  it('lists repositories for a workspace via apiRequest', async () => {
    await listRepositories(WORKSPACE);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/repositories`);
  });

  it('gets a single repository via apiRequest', async () => {
    await getRepository(WORKSPACE, 'repo-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/repositories/repo-1`);
  });
});

describe('repositories-api github connect flow', () => {
  it('begins the GitHub connect flow with a POST', async () => {
    await beginGithubConnect(WORKSPACE);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/repositories/github/connect`, {
      method: 'POST',
    });
  });

  it('completes GitHub setup with installState and installationId in the body', async () => {
    await completeGithubSetup('state-1', 'install-1');

    expect(mockedApiRequest).toHaveBeenCalledWith('/repositories/github/setup', {
      method: 'POST',
      body: { installState: 'state-1', installationId: 'install-1' },
    });
  });

  it('completes the GitHub callback with code and state in the body', async () => {
    await completeGithubCallback('code-1', 'state-1');

    expect(mockedApiRequest).toHaveBeenCalledWith('/repositories/github/callback', {
      method: 'POST',
      body: { code: 'code-1', state: 'state-1' },
    });
  });

  it('syncs all repositories for a workspace via POST', async () => {
    await syncRepositories(WORKSPACE);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/repositories/sync`, {
      method: 'POST',
    });
  });

  it('syncs a single repository via POST', async () => {
    await syncRepository(WORKSPACE, 'repo-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/repositories/repo-1/sync`, {
      method: 'POST',
    });
  });

  it('disconnects a GitHub installation via DELETE', async () => {
    await disconnectGithubInstallation(WORKSPACE, 'installation-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/repositories/github/installations/installation-1`, {
      method: 'DELETE',
    });
  });
});

describe('repositories-api application linking', () => {
  it('links a repository to an application via PATCH with the applicationId body', async () => {
    await linkRepositoryApplication(WORKSPACE, 'repo-1', 'app-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/repositories/repo-1/application`, {
      method: 'PATCH',
      body: { applicationId: 'app-1' },
    });
  });

  it('unlinks a repository from its application via DELETE with no body', async () => {
    await unlinkRepositoryApplication(WORKSPACE, 'repo-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/repositories/repo-1/application`, {
      method: 'DELETE',
    });
  });
});
