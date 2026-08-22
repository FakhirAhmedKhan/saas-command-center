import {
  archiveMobileApp,
  createMobileApp,
  detectMobileProject,
  getMobileApp,
  getMobileRepository,
  linkMobileRepository,
  listMobileApps,
  unlinkMobileRepository,
  updateMobileApp,
} from '@/features/mobile-apps/mobile-apps-api';

import { apiRequest } from '@/features/lib/api/api-client';

import { beforeEach, describe, expect, it, vi } from 'vitest';

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
