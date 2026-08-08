import {
  apiRequest,
} from '@/lib/api/http-client';

import type {
  SaveWebhookInput,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookListResponse,
} from './integrations.types';

function createBasePath(
  workspaceId:
    string,
): string {
  return `/workspaces/${workspaceId}/integrations/webhooks`;
}

export function getWebhookEndpoints(
  workspaceId:
    string,

  signal?:
    AbortSignal,
): Promise<WebhookListResponse> {
  return apiRequest<
    WebhookListResponse
  >(
    createBasePath(
      workspaceId,
    ),

    {
      method:
        'GET',

      signal,
    },
  );
}

export function createWebhookEndpoint(
  workspaceId:
    string,

  input:
    SaveWebhookInput,
): Promise<{
  endpoint:
    WebhookEndpoint;

  secret:
    string;
}> {
  return apiRequest(
    createBasePath(
      workspaceId,
    ),

    {
      method:
        'POST',

      body:
        input,
    },
  );
}

export function updateWebhookEndpoint(
  workspaceId:
    string,

  endpointId:
    string,

  input:
    Partial<SaveWebhookInput>,
): Promise<WebhookEndpoint> {
  return apiRequest(
    `${createBasePath(
      workspaceId,
    )}/${endpointId}`,

    {
      method:
        'PATCH',

      body:
        input,
    },
  );
}

export function disableWebhookEndpoint(
  workspaceId:
    string,

  endpointId:
    string,
): Promise<WebhookEndpoint> {
  return apiRequest(
    `${createBasePath(
      workspaceId,
    )}/${endpointId}/disable`,

    {
      method:
        'POST',
    },
  );
}

export function rotateWebhookSecret(
  workspaceId:
    string,

  endpointId:
    string,
): Promise<{
  secret:
    string;
}> {
  return apiRequest(
    `${createBasePath(
      workspaceId,
    )}/${endpointId}/rotate-secret`,

    {
      method:
        'POST',
    },
  );
}

export function sendWebhookTest(
  workspaceId:
    string,

  endpointId:
    string,
): Promise<{
  deliveryId:
    string;

  status:
    string;
}> {
  return apiRequest(
    `${createBasePath(
      workspaceId,
    )}/${endpointId}/test`,

    {
      method:
        'POST',
    },
  );
}

export function getWebhookDeliveries(
  workspaceId:
    string,

  endpointId:
    string,

  signal?:
    AbortSignal,
): Promise<{
  items:
    WebhookDelivery[];

  pagination: {
    page:
      number;

    limit:
      number;

    total:
      number;

    totalPages:
      number;
  };
}> {
  return apiRequest(
    `${createBasePath(
      workspaceId,
    )}/${endpointId}/deliveries?limit=50`,

    {
      method:
        'GET',

      signal,
    },
  );
}