import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/features/lib/api/api-client';
import {
  archiveMobileApp,
  connectMobileTelemetry,
  createMobileApp,
  createMobileRelease,
  detectMobileProject,
  disconnectMobileTelemetry,
  getMobileApp,
  getMobileAppOverview,
  getMobileBuild,
  getMobileRepository,
  getMobileTelemetryIntegration,
  getMobileTestsDashboard,
  ingestGithubMobileBuild,
  ingestMobileTestRun,
  linkMobileRepository,
  listMobileApps,
  listMobileBuilds,
  listMobileBuildTests,
  listMobileReleases,
  syncMobileTelemetry,
  unlinkMobileRepository,
  updateMobileApp,
  updateMobileReleaseStatus,
} from '@/features/mobile-apps/mobile-apps-api';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);
const WORKSPACE_ID = 'workspace-1';
const MOBILE_APP_ID = 'mobile-app-1';
const REPOSITORY_ID = 'repository-1';

describe('mobile-apps-api', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('lists mobile apps', async () => {
    await listMobileApps(WORKSPACE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps`, {
      signal: undefined,
    });
  });

  it('gets one mobile app', async () => {
    await getMobileApp(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}`);
  });

  it('creates a mobile app', async () => {
    const payload = {
      name: 'Karwa Passenger',

      platform: 'ANDROID' as const,

      framework: 'ANDROID_NATIVE' as const,

      packageId: 'com.karwa.app',
    };

    await createMobileApp(WORKSPACE_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps`, {
      method: 'POST',

      body: JSON.stringify(payload),
    });
  });

  it('updates a mobile app', async () => {
    const payload = {
      currentVersion: '7.0.0',

      currentBuildNumber: '900',
    };

    await updateMobileApp(WORKSPACE_ID, MOBILE_APP_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}`, {
      method: 'PATCH',

      body: JSON.stringify(payload),
    });
  });

  it('archives a mobile app', async () => {
    await archiveMobileApp(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}`, {
      method: 'DELETE',
    });
  });

  it('gets linked mobile repository', async () => {
    await getMobileRepository(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/repository`);
  });

  it('links mobile repository', async () => {
    await linkMobileRepository(WORKSPACE_ID, MOBILE_APP_ID, REPOSITORY_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/repository`, {
      method: 'POST',

      body: JSON.stringify({
        repositoryId: REPOSITORY_ID,
      }),
    });
  });
  it('gets mobile application overview', async () => {
    await getMobileAppOverview(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/overview`);
  });

  it('lists mobile builds', async () => {
    await listMobileBuilds(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/builds`);
  });

  it('gets mobile build detail', async () => {
    await getMobileBuild(WORKSPACE_ID, MOBILE_APP_ID, 'build-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/builds/build-1`);
  });

  it('ingests GitHub build', async () => {
    const payload = {
      repositoryId: 'repo-1',

      workflowRunId: '123',

      commitSha: 'a93f142',

      branch: 'development',

      platform: 'ANDROID' as const,

      status: 'SUCCESS' as const,
    };

    await ingestGithubMobileBuild(WORKSPACE_ID, MOBILE_APP_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/builds/ingest/github`, {
      method: 'POST',

      body: JSON.stringify(payload),
    });
  });

  it('loads build tests', async () => {
    await listMobileBuildTests(WORKSPACE_ID, MOBILE_APP_ID, 'build-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/builds/build-1/tests`);
  });

  it('ingests mobile test run', async () => {
    const payload = {
      type: 'UNIT' as const,

      status: 'PASSED' as const,

      passed: 10,
      failed: 0,
      skipped: 0,
    };

    await ingestMobileTestRun(WORKSPACE_ID, MOBILE_APP_ID, 'build-1', payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/builds/build-1/tests/ingest`, {
      method: 'POST',

      body: JSON.stringify(payload),
    });
  });
  it('lists mobile releases', async () => {
    await listMobileReleases(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/releases`);
  });

  it('creates mobile release', async () => {
    const payload = {
      buildId: 'build-1',

      environment: 'PRODUCTION' as const,

      releaseNotes: 'Production',
    };

    await createMobileRelease(WORKSPACE_ID, MOBILE_APP_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/releases`, {
      method: 'POST',

      body: JSON.stringify(payload),
    });
  });

  it('updates release status', async () => {
    await updateMobileReleaseStatus(WORKSPACE_ID, MOBILE_APP_ID, 'release-1', 'READY');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/releases/release-1/status`, {
      method: 'PATCH',

      body: JSON.stringify({
        status: 'READY',
      }),
    });
  });

  it('loads telemetry integration', async () => {
    await getMobileTelemetryIntegration(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/telemetry`);
  });

  it('connects telemetry provider', async () => {
    const payload = {
      provider: 'SENTRY' as const,

      externalProjectId: 'mobile-project',

      config: {
        authToken: 'secret',
      },
    };

    await connectMobileTelemetry(WORKSPACE_ID, MOBILE_APP_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/telemetry/connect`, {
      method: 'POST',

      body: JSON.stringify(payload),
    });
  });

  it('syncs telemetry', async () => {
    await syncMobileTelemetry(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/telemetry/sync`, {
      method: 'POST',
    });
  });

  it('disconnects telemetry', async () => {
    await disconnectMobileTelemetry(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/telemetry`, {
      method: 'DELETE',
    });
  });
  it('loads mobile tests dashboard', async () => {
    await getMobileTestsDashboard(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/tests`);
  });
  it('unlinks mobile repository', async () => {
    await unlinkMobileRepository(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/repository`, {
      method: 'DELETE',
    });
  });

  it('requests mobile project detection', async () => {
    await detectMobileProject(WORKSPACE_ID, MOBILE_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/mobile-apps/${MOBILE_APP_ID}/detect`, {
      method: 'POST',
    });
  });
});
