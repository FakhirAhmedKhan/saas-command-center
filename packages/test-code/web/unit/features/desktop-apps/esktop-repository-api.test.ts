import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDesktopRepository, linkDesktopRepository, unlinkDesktopRepository } from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);
const WORKSPACE_ID = 'workspace-1';
const DESKTOP_APP_ID = 'desktop-1';
const REPOSITORY_ID = 'repository-1';
const ENDPOINT = `/workspaces/${WORKSPACE_ID}` + `/desktop-apps/${DESKTOP_APP_ID}` + '/repository';

describe('Desktop repository API', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();

    mockedApiRequest.mockResolvedValue(undefined);
  });

  it('gets the linked repository', async () => {
    await getDesktopRepository(WORKSPACE_ID, DESKTOP_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(ENDPOINT);
  });

  it('links a repository', async () => {
    await linkDesktopRepository(WORKSPACE_ID, DESKTOP_APP_ID, REPOSITORY_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(ENDPOINT, {
      method: 'POST',

      body: JSON.stringify({
        repositoryId: REPOSITORY_ID,
      }),
    });
  });

  it('unlinks a repository', async () => {
    await unlinkDesktopRepository(WORKSPACE_ID, DESKTOP_APP_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(ENDPOINT, {
      method: 'DELETE',
    });
  });
});
