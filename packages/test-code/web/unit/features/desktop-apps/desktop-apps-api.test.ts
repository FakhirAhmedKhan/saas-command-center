import type { CreateDesktopApplicationInput, UpdateDesktopApplicationInput } from '@command-center/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveDesktopApp, createDesktopApp, getDesktopApp, listDesktopApps, updateDesktopApp } from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

describe('desktop-apps-api', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('creates a desktop application', () => {
    const payload: CreateDesktopApplicationInput = {
      name: 'Command Center Desktop',

      platform: 'CROSS_PLATFORM',

      framework: 'ELECTRON',

      architecture: 'X64',

      packageName: 'com.commandcenter.desktop',
    };

    createDesktopApp('workspace-1', payload);

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/desktop-apps', {
      method: 'POST',

      body: JSON.stringify(payload),
    });
  });

  it('lists desktop applications', () => {
    const controller = new AbortController();

    listDesktopApps('workspace-1', controller.signal);

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/desktop-apps', {
      signal: controller.signal,
    });
  });

  it('gets desktop application details', () => {
    getDesktopApp('workspace-1', 'desktop-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/desktop-apps/desktop-1');
  });

  it('updates a desktop application', () => {
    const payload: UpdateDesktopApplicationInput = {
      currentVersion: '2.5.0',

      currentBuildNumber: '200',

      architecture: 'ARM64',
    };

    updateDesktopApp('workspace-1', 'desktop-1', payload);

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/desktop-apps/desktop-1', {
      method: 'PATCH',

      body: JSON.stringify(payload),
    });
  });

  it('archives a desktop application', () => {
    archiveDesktopApp('workspace-1', 'desktop-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/desktop-apps/desktop-1', {
      method: 'DELETE',
    });
  });
});
