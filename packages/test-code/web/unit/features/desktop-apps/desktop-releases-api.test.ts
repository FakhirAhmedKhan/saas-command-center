import { createDesktopRelease, getDesktopRelease, listDesktopReleases, updateDesktopReleaseStatus } from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const requestMock = vi.mocked(apiRequest);
const workspaceId = 'workspace-1';
const desktopAppId = 'desktop-1';
const releaseId = 'release-1';

describe('desktop release API client', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue(undefined);
  });

  it('lists releases with filters', async () => {
    await listDesktopReleases(workspaceId, desktopAppId, {
      channel: 'STABLE',
      status: 'PUBLISHED',
      platform: 'WINDOWS',
      architecture: 'X64',
    });

    const url = requestMock.mock.calls[0]?.[0] as string;

    expect(url).toContain(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases?`);
    expect(url).toContain('channel=STABLE');
    expect(url).toContain('status=PUBLISHED');
    expect(url).toContain('platform=WINDOWS');
    expect(url).toContain('architecture=X64');
  });

  it('gets one release', async () => {
    await getDesktopRelease(workspaceId, desktopAppId, releaseId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases/${releaseId}`);
  });

  it('creates a release', async () => {
    const input = {
      buildId: 'build-1',
      channel: 'BETA',
      version: '2.5.0-beta.2',
      releaseNotes: 'Beta candidate',
    } as const;

    await createDesktopRelease(workspaceId, desktopAppId, input);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('updates lifecycle status', async () => {
    await updateDesktopReleaseStatus(workspaceId, desktopAppId, releaseId, 'PUBLISHED');

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases/${releaseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'PUBLISHED',
      }),
    });
  });
});
