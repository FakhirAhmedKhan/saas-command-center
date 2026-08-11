import type { SaveWebhookInput } from '@command-center/shared-types';
import { z } from 'zod';

import { safeHttpUrlSchema } from './common.js';

const webhookEventTypeSchema = z.enum([
  'WEBHOOK_TEST',
  'APPLICATION_CREATED',
  'APPLICATION_UPDATED',
  'DEPLOYMENT_STATUS_CHANGED',
  'DEPLOYMENT_FAILED',
  'HEALTH_INCIDENT_OPENED',
  'HEALTH_INCIDENT_RESOLVED',
  'ANALYTICS_PROCESSING_FAILED',
  'WORKSPACE_ACTIVITY_CREATED',
]);

export const saveWebhookSchema: z.ZodType<SaveWebhookInput> = z.object({
  name: z.string().min(1).max(100),
  url: safeHttpUrlSchema,
  eventTypes: z.array(webhookEventTypeSchema).min(1).max(20),
  timeoutMs: z.number().int().min(1_000).max(30_000),
  maxAttempts: z.number().int().min(1).max(8),
  enabled: z.boolean(),
});
