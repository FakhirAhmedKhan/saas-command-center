import { DEPLOYMENT_STATUSES } from '@command-center/shared-types';

import type {
  CreateDeploymentInput,
  CreateReleaseInput,
  DeploymentListQueryInput,
  ReleaseListQueryInput,
  TransitionDeploymentInput,
  UpdateReleaseInput,
} from '@command-center/shared-types';

import { z } from 'zod';

import { isoDateStringSchema, safeHttpUrlSchema, uuidSchema } from './common.js';

const deploymentStatusSchema = z.enum(DEPLOYMENT_STATUSES);

const versionSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/, 'version may contain letters, numbers, dots, underscores, and hyphens');

const optionalHttpUrl = safeHttpUrlSchema.pipe(z.string().max(2_000)).optional();

export const createReleaseSchema = z.object({
  version: versionSchema,

  name: z.string().max(120).optional(),

  notes: z.string().max(20_000).optional(),

  commitRef: z.string().max(100).optional(),

  repositoryUrl: optionalHttpUrl,

  scheduledAt: isoDateStringSchema.optional(),
}) satisfies z.ZodType<CreateReleaseInput>;

export const updateReleaseSchema = createReleaseSchema.partial() satisfies z.ZodType<UpdateReleaseInput>;

export const createDeploymentSchema = z.object({
  releaseId: uuidSchema,

  environmentId: uuidSchema,

  commitRef: z.string().max(100).optional(),

  repositoryUrl: optionalHttpUrl,

  ciJobUrl: optionalHttpUrl,

  liveUrl: optionalHttpUrl,

  deploymentNotes: z.string().max(20_000).optional(),

  scheduledAt: isoDateStringSchema.optional(),

  healthIncidentId: uuidSchema.optional(),
}) satisfies z.ZodType<CreateDeploymentInput>;

export const transitionDeploymentSchema = z
  .object({
    status: deploymentStatusSchema,

    scheduledAt: isoDateStringSchema.optional(),

    failureReason: z.string().max(5_000).optional(),

    rollbackToDeploymentId: uuidSchema.optional(),

    healthIncidentId: uuidSchema.optional(),

    message: z.string().max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'SCHEDULED' && !value.scheduledAt) {
      context.addIssue({
        code: 'custom',
        path: ['scheduledAt'],
        message: 'scheduledAt is required for scheduled deployments',
      });
    }

    if (value.status === 'FAILED' && !value.failureReason) {
      context.addIssue({
        code: 'custom',
        path: ['failureReason'],
        message: 'failureReason is required for failed deployments',
      });
    }

    if (value.status === 'ROLLED_BACK' && !value.rollbackToDeploymentId) {
      context.addIssue({
        code: 'custom',
        path: ['rollbackToDeploymentId'],
        message: 'rollbackToDeploymentId is required for rollbacks',
      });
    }
  }) satisfies z.ZodType<TransitionDeploymentInput>;

export const deploymentListQuerySchema = z.object({
  environmentId: uuidSchema.optional(),

  releaseId: uuidSchema.optional(),

  status: deploymentStatusSchema.optional(),

  page: z.number().int().min(1).optional(),

  limit: z.number().int().min(1).max(100).optional(),
}) satisfies z.ZodType<DeploymentListQueryInput>;

export const releaseListQuerySchema = z.object({
  search: z.string().max(100).optional(),

  page: z.number().int().min(1).optional(),

  limit: z.number().int().min(1).max(100).optional(),
}) satisfies z.ZodType<ReleaseListQueryInput>;
