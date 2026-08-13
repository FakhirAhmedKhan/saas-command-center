import {
  beginGithubConnect,
  completeGithubCallback,
  completeGithubSetup,
  disconnectGithubInstallation,
  getRepository,
  linkRepositoryApplication,
  listRepositories,
  repositoryRequest,
  syncRepositories,
  syncRepository,
  unlinkRepositoryApplication,
} from '@/features/repositories/repositories-api';
import { getAccessToken } from '@/features/lib/api/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  getAccessToken: vi.fn(),
}));

const getAccessTokenMock = vi.mocked(getAccessToken);
const BASE_URL = 'http://localhost:4000/api/v1';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function fetchMock() {
  return vi.mocked(globalThis.fetch);
}

function callInit(index: number): RequestInit {
  return fetchMock().mock.calls[index]?.[1] as RequestInit;
}

const WORKSPACE = 'workspace-1';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  getAccessTokenMock.mockReturnValue('token-1');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('repositoryRequest', () => {
  it('rejects when there is no access token, without calling fetch', async () => {
    getAccessTokenMock.mockReturnValue(null);

    await expect(repositoryRequest('/workspaces/workspace-1/repositories')).rejects.toThrow('Your session is not available. Please sign in and try again.');

    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('attaches the bearer token and credentials on every request', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));

    await repositoryRequest('/workspaces/workspace-1/repositories');

    const [url, init] = fetchMock().mock.calls[0] ?? [];

    expect(url).toBe(`${BASE_URL}/workspaces/workspace-1/repositories`);
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer token-1');
    expect(init?.credentials).toBe('include');
    expect(init?.cache).toBe('no-store');
  });

  it('throws with the server message when the response is not ok', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ message: 'Repository not found' }, { status: 404 }));

    await expect(repositoryRequest('/workspaces/workspace-1/repositories/missing')).rejects.toThrow('Repository not found');
  });

  it('joins an array validation message from the error body', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ message: ['a', 'b'] }, { status: 400 }));

    await expect(repositoryRequest('/x')).rejects.toThrow('a, b');
  });
});

describe('repositories-api read operations', () => {
  it('lists repositories for a workspace', async () => {
    fetchMock().mockResolvedValue(jsonResponse({}));

    await listRepositories(WORKSPACE);

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/workspaces/${WORKSPACE}/repositories`);
  });

  it('gets a single repository', async () => {
    fetchMock().mockResolvedValue(jsonResponse({}));

    await getRepository(WORKSPACE, 'repo-1');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/workspaces/${WORKSPACE}/repositories/repo-1`);
  });
});

describe('repositories-api github connect flow', () => {
  it('begins the GitHub connect flow with a POST', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ installUrl: 'https://github.test' }));

    await beginGithubConnect(WORKSPACE);

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/workspaces/${WORKSPACE}/repositories/github/connect`);
    expect(callInit(0).method).toBe('POST');
  });

  it('completes GitHub setup with installState and installationId in the body', async () => {
    fetchMock().mockResolvedValue(jsonResponse({}));

    await completeGithubSetup('state-1', 'install-1');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/repositories/github/setup`);
    expect(callInit(0).body).toBe(JSON.stringify({ installState: 'state-1', installationId: 'install-1' }));
  });

  it('completes the GitHub callback with code and state in the body', async () => {
    fetchMock().mockResolvedValue(jsonResponse({}));

    await completeGithubCallback('code-1', 'state-1');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/repositories/github/callback`);
    expect(callInit(0).body).toBe(JSON.stringify({ code: 'code-1', state: 'state-1' }));
  });

  it('syncs all repositories for a workspace via POST', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ installationCount: 1, repositoryCount: 2 }));

    await syncRepositories(WORKSPACE);

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/workspaces/${WORKSPACE}/repositories/sync`);
    expect(callInit(0).method).toBe('POST');
  });

  it('syncs a single repository via POST', async () => {
    fetchMock().mockResolvedValue(jsonResponse({}));

    await syncRepository(WORKSPACE, 'repo-1');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/workspaces/${WORKSPACE}/repositories/repo-1/sync`);
    expect(callInit(0).method).toBe('POST');
  });

  it('disconnects a GitHub installation via DELETE', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ success: true }));

    await disconnectGithubInstallation(WORKSPACE, 'installation-1');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/workspaces/${WORKSPACE}/repositories/github/installations/installation-1`);
    expect(callInit(0).method).toBe('DELETE');
  });
});

describe('repositories-api application linking', () => {
  it('links a repository to an application via PATCH with the applicationId body', async () => {
    fetchMock().mockResolvedValue(jsonResponse({}));

    await linkRepositoryApplication(WORKSPACE, 'repo-1', 'app-1');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/workspaces/${WORKSPACE}/repositories/repo-1/application`);
    expect(callInit(0).method).toBe('PATCH');
    expect(callInit(0).body).toBe(JSON.stringify({ applicationId: 'app-1' }));
  });

  it('unlinks a repository from its application via DELETE with no body', async () => {
    fetchMock().mockResolvedValue(jsonResponse({}));

    await unlinkRepositoryApplication(WORKSPACE, 'repo-1');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/workspaces/${WORKSPACE}/repositories/repo-1/application`);
    expect(callInit(0).method).toBe('DELETE');
    expect(callInit(0).body).toBeUndefined();
  });
});
