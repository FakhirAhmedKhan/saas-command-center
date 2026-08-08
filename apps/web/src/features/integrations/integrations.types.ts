export type WebhookEventType =
  | 'APPLICATION_CREATED'
  | 'APPLICATION_UPDATED'
  | 'DEPLOYMENT_STATUS_CHANGED'
  | 'DEPLOYMENT_FAILED'
  | 'HEALTH_INCIDENT_OPENED'
  | 'HEALTH_INCIDENT_RESOLVED'
  | 'ANALYTICS_PROCESSING_FAILED'
  | 'WORKSPACE_ACTIVITY_CREATED';

export type WebhookDeliveryStatus =
  'PENDING' | 'PROCESSING' | 'RETRY_SCHEDULED' | 'SUCCEEDED' | 'DEAD_LETTERED' | 'CANCELLED';

export interface WebhookEventCatalogItem {
  type: WebhookEventType;

  label: string;

  description: string;
}

export interface WebhookEndpoint {
  id: string;

  workspaceId: string;

  name: string;

  url: string;

  eventTypes: WebhookEventType[];

  payloadVersion: string;

  timeoutMs: number;

  maxAttempts: number;

  enabled: boolean;

  secretConfigured: boolean;

  lastDeliveryAt: string | null;

  lastSuccessAt: string | null;

  lastFailureAt: string | null;

  createdAt: string;

  updatedAt: string;

  deliveryCount: number;

  latestDelivery: {
    id: string;

    status: WebhookDeliveryStatus;

    responseStatus: number | null;

    responseDurationMs: number | null;

    createdAt: string;

    deliveredAt: string | null;
  } | null;
}

export interface WebhookListResponse {
  canManage: boolean;

  eventCatalog: WebhookEventCatalogItem[];

  items: WebhookEndpoint[];
}

export interface WebhookDeliveryAttempt {
  id: string;

  attemptNumber: number;

  outcome: 'SUCCEEDED' | 'FAILED';

  responseStatus: number | null;

  durationMs: number;

  errorCode: string | null;

  errorMessage: string | null;

  startedAt: string;

  finishedAt: string;
}

export interface WebhookDelivery {
  id: string;

  status: WebhookDeliveryStatus;

  attemptCount: number;

  maxAttempts: number;

  nextAttemptAt: string;

  responseStatus: number | null;

  responseDurationMs: number | null;

  failureCode: string | null;

  failureReason: string | null;

  deliveredAt: string | null;

  createdAt: string;

  event: {
    id: string;

    type: string;

    payloadVersion: string;

    resourceType: string | null;

    resourceId: string | null;

    occurredAt: string;
  };

  attempts: WebhookDeliveryAttempt[];
}

export interface SaveWebhookInput {
  name: string;

  url: string;

  eventTypes: WebhookEventType[];

  timeoutMs: number;

  maxAttempts: number;

  enabled: boolean;
}
