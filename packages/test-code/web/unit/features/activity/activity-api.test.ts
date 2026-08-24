import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApplicationActivities, getWorkspaceActivities } from '@/features/activity/activity-api';
import { apiRequest } from '@/features/lib/api/api-client';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('getWorkspaceActivities', () => {
  it('requests the workspace activities endpoint with no query string when no filters are given', async () => {
    apiRequestMock.mockResolvedValue({ data: [], meta: {} });

    await getWorkspaceActivities('workspace-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/activities');
  });

  it('serialises provided filters into the query string', async () => {
    apiRequestMock.mockResolvedValue({ data: [], meta: {} });

    await getWorkspaceActivities('workspace-1', {
      search: 'deploy',
      activityType: 'APPLICATION_CREATED',
      page: 2,
      limit: 10,
    });

    const [path] = apiRequestMock.mock.calls[0] ?? [];

    expect(path).toBe('/workspaces/workspace-1/activities?search=deploy&activityType=APPLICATION_CREATED&page=2&limit=10');
  });

  it('omits undefined, null, and empty-string filter values', async () => {
    apiRequestMock.mockResolvedValue({ data: [], meta: {} });

    await getWorkspaceActivities('workspace-1', {
      search: '',
      activityType: undefined,

      entityType: null as any,
      page: 1,
    });

    const [path] = apiRequestMock.mock.calls[0] ?? [];

    expect(path).toBe('/workspaces/workspace-1/activities?page=1');
  });
});

describe('getApplicationActivities', () => {
  it('requests the application-scoped activities endpoint', async () => {
    apiRequestMock.mockResolvedValue({ data: [], meta: {} });

    await getApplicationActivities('workspace-1', 'app-1', { actorType: 'SYSTEM' });

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/applications/app-1/activities?actorType=SYSTEM');
  });
});
