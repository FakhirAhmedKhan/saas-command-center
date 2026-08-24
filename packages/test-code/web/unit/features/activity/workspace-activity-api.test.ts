import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkspaceActivities } from '@/features/activity/workspace-activity-api';
import { apiRequest } from '@/features/lib/api/api-client';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('getWorkspaceActivities (workspace-activity-api)', () => {
  it('always includes page=1 and limit=100 regardless of filters supplied', async () => {
    apiRequestMock.mockResolvedValue({ items: [], pagination: { total: 0 } });

    await getWorkspaceActivities('workspace-1', {});

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/activities?page=1&limit=100', { method: 'GET', signal: undefined });
  });

  it('adds only truthy filter values to the query string', async () => {
    apiRequestMock.mockResolvedValue({ items: [], pagination: { total: 0 } });

    await getWorkspaceActivities('workspace-1', {
      search: 'rollback',
      activityType: '',
      actorUserId: undefined,
      from: '2026-01-01',
    });

    const [path] = apiRequestMock.mock.calls[0] ?? [];

    expect(path).toBe('/workspaces/workspace-1/activities?page=1&limit=100&search=rollback&from=2026-01-01');
  });

  it('forwards the abort signal', async () => {
    apiRequestMock.mockResolvedValue({ items: [], pagination: { total: 0 } });
    const controller = new AbortController();

    await getWorkspaceActivities('workspace-1', {}, controller.signal);

    expect(apiRequestMock).toHaveBeenCalledWith(expect.any(String), { method: 'GET', signal: controller.signal });
  });
});
