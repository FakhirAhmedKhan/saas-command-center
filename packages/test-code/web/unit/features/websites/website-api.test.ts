import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/features/lib/api/api-client';
import { archiveWebsite, connectWebsite, createWebsite, disableWebsite, disconnectWebsite, enableWebsite, getWebsite, getWebsites, restoreWebsite, rotateWebsiteKey, updateWebsite } from '@/features/websites/website-api';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);
const WORKSPACE_ID = 'workspace-1';
const WEBSITE_ID = 'website-1';

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue(undefined);
});

describe('getWebsites', () => {
  it('requests the workspace websites collection with no query string by default', async () => {
    await getWebsites(WORKSPACE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites`);
  });

  it('serializes provided query parameters onto the path', async () => {
    await getWebsites(WORKSPACE_ID, {
      search: 'command-center',
      enabled: true,
    });

    const [path] = mockedApiRequest.mock.calls[0]!;

    expect(path).toBe(`/workspaces/${WORKSPACE_ID}/websites?search=command-center&enabled=true`);
  });

  it('omits undefined, null and empty-string query values', async () => {
    await getWebsites(WORKSPACE_ID, {
      search: '',

      enabled: null as any,
      applicationId: 'app-1',
    });

    const [path] = mockedApiRequest.mock.calls[0]!;

    expect(path).toBe(`/workspaces/${WORKSPACE_ID}/websites?applicationId=app-1`);
  });
});

describe('getWebsite', () => {
  it('requests a single website by id', async () => {
    await getWebsite(WORKSPACE_ID, WEBSITE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}`);
  });
});

describe('createWebsite', () => {
  it('POSTs the payload as a JSON string to the websites collection', async () => {
    const payload = {
      name: 'Command Center Web',
      domain: 'command-center.example.com',
      timeZone: 'UTC',
      enabled: true,
      applicationId: null,
      allowedOrigins: [],
    } as Parameters<typeof createWebsite>[1];

    await createWebsite(WORKSPACE_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('updateWebsite', () => {
  it('PATCHes the payload as a JSON string to the website resource', async () => {
    const payload = { name: 'Renamed Site' } as Parameters<typeof updateWebsite>[2];

    await updateWebsite(WORKSPACE_ID, WEBSITE_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
});

describe('lifecycle actions', () => {
  it('enableWebsite POSTs to the enable sub-resource with no body', async () => {
    await enableWebsite(WORKSPACE_ID, WEBSITE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}/enable`, {
      method: 'POST',
    });
  });

  it('disableWebsite POSTs to the disable sub-resource with no body', async () => {
    await disableWebsite(WORKSPACE_ID, WEBSITE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}/disable`, {
      method: 'POST',
    });
  });

  it('archiveWebsite POSTs to the archive sub-resource with no body', async () => {
    await archiveWebsite(WORKSPACE_ID, WEBSITE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}/archive`, {
      method: 'POST',
    });
  });

  it('restoreWebsite POSTs to the restore sub-resource with no body', async () => {
    await restoreWebsite(WORKSPACE_ID, WEBSITE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}/restore`, {
      method: 'POST',
    });
  });

  it('rotateWebsiteKey POSTs to the rotate-key sub-resource with no body', async () => {
    await rotateWebsiteKey(WORKSPACE_ID, WEBSITE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}/rotate-key`, {
      method: 'POST',
    });
  });
});

describe('connectWebsite', () => {
  it('POSTs the applicationId wrapped in a JSON object to the connect sub-resource', async () => {
    await connectWebsite(WORKSPACE_ID, WEBSITE_ID, 'app-42');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}/connect`, {
      method: 'POST',
      body: JSON.stringify({ applicationId: 'app-42' }),
    });
  });
});

describe('disconnectWebsite', () => {
  it('POSTs to the disconnect sub-resource with no body', async () => {
    await disconnectWebsite(WORKSPACE_ID, WEBSITE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}/disconnect`, {
      method: 'POST',
    });
  });
});
