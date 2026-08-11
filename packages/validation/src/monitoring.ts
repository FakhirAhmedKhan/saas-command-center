import { HEALTH_CHECK_STATUSES, HEALTH_INCIDENT_STATUSES, HEALTH_TARGET_TYPES } from '@command-center/shared-types';

import type { HealthCheckListQueryInput, IncidentListQueryInput, SaveHealthCheckInput, UpdateHealthCheckInput } from '@command-center/shared-types';

import { z } from 'zod';

import { safeHttpUrlSchema, uuidSchema } from './common.js';

const healthTargetSchema = z.enum(HEALTH_TARGET_TYPES);

const healthStatusSchema = z.enum(HEALTH_CHECK_STATUSES);

const incidentStatusSchema = z.enum(HEALTH_INCIDENT_STATUSES);

const healthCheckObject = z.object({
  targetType: healthTargetSchema,

  applicationId: uuidSchema.optional(),

  websiteId: uuidSchema.optional(),

  name: z.string().max(100),

  url: safeHttpUrlSchema.pipe(z.string().max(2_000)),

  intervalSeconds: z.number().int().min(60).max(86_400),

  timeoutMs: z.number().int().min(1_000).max(30_000),

  expectedStatusMin: z.number().int().min(100).max(599),

  expectedStatusMax: z.number().int().min(100).max(599),

  degradedAfterMs: z.number().int().min(1).max(30_000),

  failureThreshold: z.number().int().min(1).max(20),

  enabled: z.boolean(),
});

export const createHealthCheckSchema = healthCheckObject.superRefine((value, context) => {
  if (value.targetType === 'APPLICATION' && !value.applicationId) {
    context.addIssue({
      code: 'custom',
      path: ['applicationId'],
      message: 'applicationId is required for application health checks',
    });
  }

  if (value.targetType === 'WEBSITE' && !value.websiteId) {
    context.addIssue({
      code: 'custom',
      path: ['websiteId'],
      message: 'websiteId is required for website health checks',
    });
  }
}) satisfies z.ZodType<SaveHealthCheckInput>;

export const updateHealthCheckSchema = healthCheckObject.partial() satisfies z.ZodType<UpdateHealthCheckInput>;

export const healthCheckListQuerySchema = z.object({
  status: healthStatusSchema.optional(),

  targetType: healthTargetSchema.optional(),

  enabled: z.boolean().optional(),

  applicationId: uuidSchema.optional(),

  websiteId: uuidSchema.optional(),
}) satisfies z.ZodType<HealthCheckListQueryInput>;

export const incidentListQuerySchema = z.object({
  status: incidentStatusSchema.optional(),
}) satisfies z.ZodType<IncidentListQueryInput>;
