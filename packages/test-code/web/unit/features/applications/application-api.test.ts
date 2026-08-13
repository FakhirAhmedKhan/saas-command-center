import {
  addApplicationLink,
  addApplicationTechnology,
  archiveApplication,
  createApplication,
  getApplication,
  getApplications,
  permanentlyDeleteApplication,
  removeApplicationLink,
  removeApplicationTechnology,
  restoreApplication,
  updateApplication,
  updateApplicationLink,
  updateApplicationTechnology,
} from '@/features/applications/application-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const WORKSPACE_ID = 'workspace-1';
const APPLICATION_ID = 'application-1';

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue(undefined);
});

describe('getApplications', () => {
  it('requests the workspace applications collection with no query string by default', async () => {
    await getApplications(WORKSPACE_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications`);
  });

  it('serializes provided query parameters onto the path', async () => {
    await getApplications(WORKSPACE_ID, {
      search: 'PriceScout',
      status: 'IN_DEVELOPMENT',
    });

    const [path] = mockedApiRequest.mock.calls[0]!;

    expect(path).toBe(`/workspaces/${WORKSPACE_ID}/applications?search=PriceScout&status=IN_DEVELOPMENT`);
  });

  it('omits undefined, null and empty-string query values', async () => {
    await getApplications(WORKSPACE_ID, {
      search: '',
      status: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exercising runtime filtering of nullish query values
      priority: null as any,
      category: 'AI',
    });

    const [path] = mockedApiRequest.mock.calls[0]!;

    expect(path).toBe(`/workspaces/${WORKSPACE_ID}/applications?category=AI`);
  });
});

describe('getApplication', () => {
  it('requests a single application by id', async () => {
    await getApplication(WORKSPACE_ID, APPLICATION_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}`);
  });
});

describe('createApplication', () => {
  it('POSTs the payload as a JSON string to the applications collection', async () => {
    const payload = {
      name: 'PriceScout AI',
      category: 'AI',
      status: 'IDEA',
      priority: 'MEDIUM',
    } as Parameters<typeof createApplication>[1];

    await createApplication(WORKSPACE_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('updateApplication', () => {
  it('PATCHes the payload as a JSON string to the application resource', async () => {
    const payload = { name: 'Renamed App' } as Parameters<typeof updateApplication>[2];

    await updateApplication(WORKSPACE_ID, APPLICATION_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });
});

describe('archiveApplication', () => {
  it('POSTs to the archive sub-resource with no body', async () => {
    await archiveApplication(WORKSPACE_ID, APPLICATION_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}/archive`, {
      method: 'POST',
    });
  });
});

describe('restoreApplication', () => {
  it('POSTs to the restore sub-resource with no body', async () => {
    await restoreApplication(WORKSPACE_ID, APPLICATION_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}/restore`, {
      method: 'POST',
    });
  });
});

describe('permanentlyDeleteApplication', () => {
  it('DELETEs the application resource', async () => {
    await permanentlyDeleteApplication(WORKSPACE_ID, APPLICATION_ID);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}`, {
      method: 'DELETE',
    });
  });
});

describe('technology sub-resource requests', () => {
  it('adds a technology with a JSON body under the technologies collection', async () => {
    const payload = { name: 'Next.js', type: 'FRONTEND', version: '16' } as Parameters<typeof addApplicationTechnology>[2];

    await addApplicationTechnology(WORKSPACE_ID, APPLICATION_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}/technologies`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updates a technology by id with a JSON body', async () => {
    const payload = { name: 'Next.js', type: 'FRONTEND', version: '16.1' } as Parameters<typeof updateApplicationTechnology>[3];

    await updateApplicationTechnology(WORKSPACE_ID, APPLICATION_ID, 'tech-1', payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}/technologies/tech-1`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });

  it('removes a technology by id with DELETE and no body', async () => {
    await removeApplicationTechnology(WORKSPACE_ID, APPLICATION_ID, 'tech-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}/technologies/tech-1`, {
      method: 'DELETE',
    });
  });
});

describe('link sub-resource requests', () => {
  it('adds a link with a JSON body under the links collection', async () => {
    const payload = { label: 'Production', type: 'PRODUCTION', url: 'https://example.com' } as Parameters<typeof addApplicationLink>[2];

    await addApplicationLink(WORKSPACE_ID, APPLICATION_ID, payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}/links`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updates a link by id with a JSON body', async () => {
    const payload = { label: 'Prod', type: 'PRODUCTION', url: 'https://new.example.com' } as Parameters<typeof updateApplicationLink>[3];

    await updateApplicationLink(WORKSPACE_ID, APPLICATION_ID, 'link-1', payload);

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}/links/link-1`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });

  it('removes a link by id with DELETE and no body', async () => {
    await removeApplicationLink(WORKSPACE_ID, APPLICATION_ID, 'link-1');

    expect(mockedApiRequest).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}/links/link-1`, {
      method: 'DELETE',
    });
  });
});
