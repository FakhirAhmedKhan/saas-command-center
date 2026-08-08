import { WebhookEventType } from '../../generated/prisma/client';

export const WEBHOOK_PAYLOAD_VERSION = '2026-08-01';

export const WEBHOOK_SIGNATURE_VERSION = 'v1';

export const WEBHOOK_RETRY_BASE_DELAY_MS = 5_000;

export const WEBHOOK_RETRY_MAX_DELAY_MS = 5 * 60 * 1_000;

export const WEBHOOK_EVENT_CATALOG: ReadonlyArray<{
  type: WebhookEventType;

  label: string;

  description: string;
}> = [
  {
    type: WebhookEventType.APPLICATION_CREATED,

    label: 'Application created',

    description: 'A new SaaS application is registered.',
  },

  {
    type: WebhookEventType.APPLICATION_UPDATED,

    label: 'Application updated',

    description: 'An application record is updated.',
  },

  {
    type: WebhookEventType.DEPLOYMENT_STATUS_CHANGED,

    label: 'Deployment status changed',

    description: 'A deployment changes status.',
  },

  {
    type: WebhookEventType.DEPLOYMENT_FAILED,

    label: 'Deployment failed',

    description: 'A deployment enters the Failed state.',
  },

  {
    type: WebhookEventType.HEALTH_INCIDENT_OPENED,

    label: 'Health incident opened',

    description: 'Monitoring opens a new incident.',
  },

  {
    type: WebhookEventType.HEALTH_INCIDENT_RESOLVED,

    label: 'Health incident resolved',

    description: 'A health incident recovers.',
  },

  {
    type: WebhookEventType.ANALYTICS_PROCESSING_FAILED,

    label: 'Analytics processing failed',

    description: 'An analytics processing run is dead-lettered.',
  },

  {
    type: WebhookEventType.WORKSPACE_ACTIVITY_CREATED,

    label: 'Workspace activity created',

    description: 'A selected workspace activity record is created.',
  },
];
