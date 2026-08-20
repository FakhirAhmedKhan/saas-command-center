import { createWorkspace } from '@/features/workspaces/workspace-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue(undefined);
});

describe('createWorkspace', () => {
  it('POSTs the payload as a JSON string to /workspaces', async () => {
    const payload = { name: 'Acme Inc', slug: 'acme-inc' } as Parameters<typeof createWorkspace>[0];

    await createWorkspace(payload);

    expect(mockedApiRequest).toHaveBeenCalledWith('/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('calls apiRequest exactly once per invocation', async () => {
    await createWorkspace({ name: 'Acme Inc', slug: 'acme-inc' } as Parameters<typeof createWorkspace>[0]);

    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
  });
});
