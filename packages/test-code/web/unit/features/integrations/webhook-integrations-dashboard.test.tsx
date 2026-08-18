// @vitest-environment jsdom
import { WebhookIntegrationsDashboard } from '@/features/integrations/webhook-integrations-dashboard';
import type { WebhookEndpoint, WebhookListResponse } from '@/features/integrations/integrations.types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getWebhookEndpointsMock, disableWebhookEndpointMock, updateWebhookEndpointMock, createWebhookEndpointMock, rotateWebhookSecretMock, sendWebhookTestMock } =
  vi.hoisted(() => ({
    getWebhookEndpointsMock: vi.fn(),
    disableWebhookEndpointMock: vi.fn(),
    updateWebhookEndpointMock: vi.fn(),
    createWebhookEndpointMock: vi.fn(),
    rotateWebhookSecretMock: vi.fn(),
    sendWebhookTestMock: vi.fn(),
  }));

vi.mock('@/features/integrations/integrations-api', () => ({
  getWebhookEndpoints: getWebhookEndpointsMock,
  disableWebhookEndpoint: disableWebhookEndpointMock,
  updateWebhookEndpoint: updateWebhookEndpointMock,
  createWebhookEndpoint: createWebhookEndpointMock,
  rotateWebhookSecret: rotateWebhookSecretMock,
  sendWebhookTest: sendWebhookTestMock,
  getWebhookDeliveries: vi.fn().mockResolvedValue({ items: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }),
}));

function makeEndpoint(overrides: Partial<WebhookEndpoint> = {}): WebhookEndpoint {
  return {
    id: 'endpoint-1',
    workspaceId: 'workspace-1',
    name: 'Production automation',
    url: 'https://automation.example.com/webhooks',
    eventTypes: ['APPLICATION_CREATED'],
    payloadVersion: 'v1',
    timeoutMs: 10_000,
    maxAttempts: 5,
    enabled: true,
    secretConfigured: true,
    lastDeliveryAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    deliveryCount: 0,
    latestDelivery: null,
    ...overrides,
  } as WebhookEndpoint;
}

function makeList(overrides: Partial<WebhookListResponse> = {}): WebhookListResponse {
  return {
    canManage: true,
    eventCatalog: [{ type: 'APPLICATION_CREATED', label: 'Application created', description: 'Fires when an application is created.' }],
    items: [makeEndpoint()],
    ...overrides,
  } as WebhookListResponse;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WebhookIntegrationsDashboard', () => {
  it('shows a loading skeleton before data arrives', () => {
    getWebhookEndpointsMock.mockReturnValue(new Promise(() => {}));

    const { container } = render(<WebhookIntegrationsDashboard workspaceId='workspace-1' />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders the webhook endpoint on success', async () => {
    getWebhookEndpointsMock.mockResolvedValue(makeList());

    render(<WebhookIntegrationsDashboard workspaceId='workspace-1' />);

    await waitFor(() => {
      expect(screen.getByText('Production automation')).toBeInTheDocument();
    });
  });

  it('shows an empty state when no webhooks are configured', async () => {
    getWebhookEndpointsMock.mockResolvedValue(makeList({ items: [] }));

    render(<WebhookIntegrationsDashboard workspaceId='workspace-1' />);

    await waitFor(() => {
      expect(screen.getByText('No integrations configured')).toBeInTheDocument();
    });
  });

  it('shows an error state with a retry action, and retry recovers', async () => {
    const user = userEvent.setup();

    getWebhookEndpointsMock.mockRejectedValueOnce(new Error('boom'));

    render(<WebhookIntegrationsDashboard workspaceId='workspace-1' />);

    await waitFor(() => {
      expect(screen.getByText('Integrations unavailable')).toBeInTheDocument();
    });

    getWebhookEndpointsMock.mockResolvedValue(makeList());

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Production automation')).toBeInTheDocument();
    });
  });

  it('disables an enabled webhook after the confirmation dialog is accepted', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    getWebhookEndpointsMock.mockResolvedValue(makeList());
    disableWebhookEndpointMock.mockResolvedValue(makeEndpoint({ enabled: false }));

    render(<WebhookIntegrationsDashboard workspaceId='workspace-1' />);

    await waitFor(() => {
      expect(screen.getByText('Production automation')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Disable' }));

    await waitFor(() => {
      expect(disableWebhookEndpointMock).toHaveBeenCalledWith('workspace-1', 'endpoint-1');
    });

    confirmSpy.mockRestore();
  });

  it('does not surface an error banner for a request aborted by unmount', async () => {
    let rejectEndpoints: (reason: unknown) => void = () => {};

    getWebhookEndpointsMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectEndpoints = reject;
        }),
    );

    const { unmount } = render(<WebhookIntegrationsDashboard workspaceId='workspace-1' />);

    unmount();

    rejectEndpoints(new DOMException('Aborted', 'AbortError'));

    await Promise.resolve();

    expect(screen.queryByText('Integrations unavailable')).not.toBeInTheDocument();
  });

  it('does not let a stale in-flight request overwrite the latest data when workspaceId changes', async () => {
    let resolveFirst: (value: WebhookListResponse) => void = () => {};

    getWebhookEndpointsMock.mockImplementationOnce(
      () =>
        new Promise<WebhookListResponse>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { rerender } = render(<WebhookIntegrationsDashboard workspaceId='workspace-1' />);

    getWebhookEndpointsMock.mockResolvedValueOnce(makeList({ items: [makeEndpoint({ id: 'endpoint-2', name: 'Second workspace webhook' })] }));

    rerender(<WebhookIntegrationsDashboard workspaceId='workspace-2' />);

    await waitFor(() => {
      expect(screen.getByText('Second workspace webhook')).toBeInTheDocument();
    });

    resolveFirst(makeList({ items: [makeEndpoint({ id: 'endpoint-1', name: 'Stale workspace webhook' })] }));

    await Promise.resolve();

    expect(screen.queryByText('Stale workspace webhook')).not.toBeInTheDocument();
    expect(screen.getByText('Second workspace webhook')).toBeInTheDocument();
  });
});
