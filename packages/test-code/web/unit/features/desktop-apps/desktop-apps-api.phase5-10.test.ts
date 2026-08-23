import {
  detectDesktopProject,
  getDesktopAppOverview,
  getDesktopBuild,
  getDesktopTestSummary,
  ingestDesktopBuildArtifact,
  ingestDesktopTestRun,
  ingestGithubDesktopBuild,
  listDesktopAppTests,
  listDesktopBuildArtifacts,
  listDesktopBuildTests,
  listDesktopBuilds,
} from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const requestMock = vi.mocked(apiRequest);

const workspaceId = 'workspace-1';
const desktopAppId = 'desktop-1';
const buildId = 'build-1';

describe('desktop phases 5-10 API client', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue(undefined);
  });

  it('uses desktop detection endpoint', async () => {
    await detectDesktopProject(workspaceId, desktopAppId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/detect`, {
      method: 'POST',
    });
  });

  it('uses desktop overview endpoint', async () => {
    await getDesktopAppOverview(workspaceId, desktopAppId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/overview`);
  });

  it('serializes build filters', async () => {
    await listDesktopBuilds(workspaceId, desktopAppId, {
      status: 'FAILED',
      platform: 'WINDOWS',
      architecture: 'X64',
      branch: 'main',
      version: '2.0.0',
    });

    expect(requestMock).toHaveBeenCalledWith(expect.stringContaining(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds?`));

    const url = requestMock.mock.calls[0]?.[0] as string;

    expect(url).toContain('status=FAILED');
    expect(url).toContain('platform=WINDOWS');
    expect(url).toContain('architecture=X64');
    expect(url).toContain('branch=main');
    expect(url).toContain('version=2.0.0');
  });

  it('gets build detail', async () => {
    await getDesktopBuild(workspaceId, desktopAppId, buildId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}`);
  });

  it('ingests GitHub build', async () => {
    const payload = {
      repositoryId: 'repository-1',
      workflowRunId: '901',
      commitSha: 'abcdef1234567',
      branch: 'main',
    } as never;

    await ingestGithubDesktopBuild(workspaceId, desktopAppId, payload);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/ingest/github`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('uses artifact endpoints', async () => {
    await listDesktopBuildArtifacts(workspaceId, desktopAppId, buildId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`);

    const input = {
      providerArtifactId: 'artifact-1',
      platform: 'WINDOWS',
      architecture: 'X64',
      type: 'MSI',
      fileName: 'app.msi',
    } as never;

    await ingestDesktopBuildArtifact(workspaceId, desktopAppId, buildId, input);

    expect(requestMock).toHaveBeenLastCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('uses test endpoints', async () => {
    await listDesktopBuildTests(workspaceId, desktopAppId, buildId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`);

    await listDesktopAppTests(workspaceId, desktopAppId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests`);

    await getDesktopTestSummary(workspaceId, desktopAppId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests/summary`);

    const input = {
      type: 'UNIT',
      status: 'PASSED',
      passed: 10,
      failed: 0,
      skipped: 0,
    } as never;

    await ingestDesktopTestRun(workspaceId, desktopAppId, buildId, input);

    expect(requestMock).toHaveBeenLastCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });
});
