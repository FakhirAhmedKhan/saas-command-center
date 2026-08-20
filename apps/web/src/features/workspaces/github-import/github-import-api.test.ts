import {
  analyzeRepository,
  beginPersonalGithubConnect,
  completePersonalGithubCallback,
  completePersonalGithubSetup,
  importWorkspaceFromGithub,
  listImportableRepositories,
} from './github-import-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue(undefined);
});

describe('beginPersonalGithubConnect', () => {
  it('POSTs to the personal connect endpoint', async () => {
    await beginPersonalGithubConnect();

    expect(mockedApiRequest).toHaveBeenCalledWith('/repositories/github/personal/connect', {
      method: 'POST',
    });
  });
});

describe('completePersonalGithubSetup', () => {
  it('POSTs installState and installationId', async () => {
    await completePersonalGithubSetup('state-1', 'install-1');

    expect(mockedApiRequest).toHaveBeenCalledWith('/repositories/github/personal/setup', {
      method: 'POST',
      body: JSON.stringify({ installState: 'state-1', installationId: 'install-1' }),
    });
  });
});

describe('completePersonalGithubCallback', () => {
  it('POSTs code and state', async () => {
    await completePersonalGithubCallback('code-1', 'state-1');

    expect(mockedApiRequest).toHaveBeenCalledWith('/repositories/github/personal/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'code-1', state: 'state-1' }),
    });
  });
});

describe('listImportableRepositories', () => {
  it('GETs the personal repository list', async () => {
    await listImportableRepositories();

    expect(mockedApiRequest).toHaveBeenCalledWith('/repositories/github/personal');
  });
});

describe('analyzeRepository', () => {
  it('POSTs the repositoryId', async () => {
    await analyzeRepository({ repositoryId: 42 });

    expect(mockedApiRequest).toHaveBeenCalledWith('/repositories/github/personal/analyze', {
      method: 'POST',
      body: JSON.stringify({ repositoryId: 42 }),
    });
  });
});

describe('importWorkspaceFromGithub', () => {
  it('POSTs the full import payload', async () => {
    const payload = {
      installationId: '123',
      repositoryId: 42,
      workspace: { name: 'Demo' },
      applications: [{ name: 'App', rootDirectory: '.' }],
    };

    await importWorkspaceFromGithub(payload);

    expect(mockedApiRequest).toHaveBeenCalledWith('/workspaces/import/github', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});
