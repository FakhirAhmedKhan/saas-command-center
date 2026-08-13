import {
  createWebhookEndpoint,
  disableWebhookEndpoint,
  getWebhookDeliveries,
  getWebhookEndpoints,
  rotateWebhookSecret,
  sendWebhookTest,
  updateWebhookEndpoint,
} from '@/features/integrations/integrations-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

const WORKSPACE = 'workspace-1';
const BASE = `/workspaces/${WORKSPACE}/integrations/webhooks`;

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('integrations-api read operations', () => {
  it('gets webhook endpoints for a workspace', async () => {
    apiRequestMock.mockResolvedValue({});

    await getWebhookEndpoints(WORKSPACE);

    expect(apiRequestMock).toHaveBeenCalledWith(BASE, { method: 'GET', signal: undefined });
  });

  it('gets deliveries for an endpoint with a fixed page size of 50', async () => {
    apiRequestMock.mockResolvedValue({});

    await getWebhookDeliveries(WORKSPACE, 'endpoint-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/endpoint-1/deliveries?limit=50`, { method: 'GET', signal: undefined });
  });
});

describe('integrations-api write operations', () => {
  it('creates a webhook endpoint with a POST carrying the input as the body', async () => {
    apiRequestMock.mockResolvedValue({ endpoint: {}, secret: 's' } as never);
    const input = { url: 'https://example.test/hook', events: ['deployment.created'] } as never;

    await createWebhookEndpoint(WORKSPACE, input);

    expect(apiRequestMock).toHaveBeenCalledWith(BASE, { method: 'POST', body: input });
  });

  it('updates a webhook endpoint via PATCH to its id', async () => {
    apiRequestMock.mockResolvedValue({});
    const input = { url: 'https://example.test/new-hook' };

    await updateWebhookEndpoint(WORKSPACE, 'endpoint-1', input);

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/endpoint-1`, { method: 'PATCH', body: input });
  });

  it('disables a webhook endpoint via POST /disable with no body', async () => {
    apiRequestMock.mockResolvedValue({});

    await disableWebhookEndpoint(WORKSPACE, 'endpoint-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/endpoint-1/disable`, { method: 'POST' });
  });

  it('rotates a webhook secret via POST /rotate-secret with no body', async () => {
    apiRequestMock.mockResolvedValue({ secret: 'new-secret' });

    await rotateWebhookSecret(WORKSPACE, 'endpoint-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/endpoint-1/rotate-secret`, { method: 'POST' });
  });

  it('sends a webhook test via POST /test with no body', async () => {
    apiRequestMock.mockResolvedValue({ deliveryId: 'd-1', status: 'PENDING' });

    await sendWebhookTest(WORKSPACE, 'endpoint-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`${BASE}/endpoint-1/test`, { method: 'POST' });
  });
});
