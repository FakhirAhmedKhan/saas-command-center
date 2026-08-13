import {
  createDeployment,
  createRelease,
  getCurrentVersions,
  getDeployments,
  getReleaseOptions,
  getReleases,
  transitionDeployment,
} from './release-management-api';
import { apiRequest } from '../lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

const WORKSPACE = 'workspace-1';
const APP = 'app-1';
const BASE = `/workspaces/${WORKSPACE}/applications/${APP}`;

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('release-management-api read operations', () => {
  it('gets deployment options', async () => {
    apiRequestMock.mockResolvedValue({});

    await getReleaseOptions(WORKSPACE, APP);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/deployments/options`, { method: 'GET', signal: undefined });
  });

  it('gets releases with a fixed page size of 100', async () => {
    apiRequestMock.mockResolvedValue({});

    await getReleases(WORKSPACE, APP);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/releases?limit=100`, { method: 'GET', signal: undefined });
  });

  it('gets current environment versions', async () => {
    apiRequestMock.mockResolvedValue([]);

    await getCurrentVersions(WORKSPACE, APP);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/deployments/current`, { method: 'GET', signal: undefined });
  });

  it('gets deployments without optional filters', async () => {
    apiRequestMock.mockResolvedValue({});

    await getDeployments(WORKSPACE, APP, {});

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/deployments?limit=100`, { method: 'GET', signal: undefined });
  });

  it('adds environmentId and status filters to the deployments query', async () => {
    apiRequestMock.mockResolvedValue({});

    await getDeployments(WORKSPACE, APP, { environmentId: 'env-1', status: 'FAILED' });

    const [path] = apiRequestMock.mock.calls[0] ?? [];

    expect(path).toBe(`${BASE}/deployments?limit=100&environmentId=env-1&status=FAILED`);
  });
});

describe('release-management-api write operations', () => {
  it('creates a release with a POST carrying the input as the body', async () => {
    apiRequestMock.mockResolvedValue({});
    const input = { version: '1.2.0', name: 'Spring release' };

    await createRelease(WORKSPACE, APP, input);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/releases`, { method: 'POST', body: input });
  });

  it('creates a deployment with a POST carrying the input as the body', async () => {
    apiRequestMock.mockResolvedValue({});
    const input = { releaseId: 'release-1', environmentId: 'env-1' };

    await createDeployment(WORKSPACE, APP, input);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/deployments`, { method: 'POST', body: input });
  });

  it('transitions a deployment via POST to its /transition path', async () => {
    apiRequestMock.mockResolvedValue({});
    const input = { status: 'ROLLED_BACK' as const, failureReason: 'Bad migration' };

    await transitionDeployment(WORKSPACE, APP, 'deployment-1', input);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/deployments/deployment-1/transition`, {
      method: 'POST',
      body: input,
    });
  });
});
