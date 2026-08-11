import { BLOCKER_STATUSES, DEVELOPMENT_TEMPLATE_TYPES, WORK_ITEM_PRIORITIES } from '@command-center/shared-types';

import type { CreateBlockerInput, CreateMilestoneInput, CreateTaskInput } from '@command-center/shared-types';

import { z } from 'zod';

import { optionalNullableIsoDateSchema, uuidSchema } from './common.js';

const workItemPrioritySchema = z.enum(WORK_ITEM_PRIORITIES);
const blockerStatusSchema = z.enum(BLOCKER_STATUSES);
const developmentTemplateSchema = z.enum(DEVELOPMENT_TEMPLATE_TYPES);

export const createMilestoneSchema = z.object({
  title: z.string().min(2).max(160),

  description: z.string().max(10_000).nullable().optional(),

  weight: z.number().int().min(1).max(100).optional(),

  startsAt: optionalNullableIsoDateSchema,

  dueAt: optionalNullableIsoDateSchema,
}) satisfies z.ZodType<CreateMilestoneInput>;

export const updateMilestoneSchema = createMilestoneSchema.partial();

export const createTaskSchema = z.object({
  title: z.string().min(2).max(200),

  description: z.string().max(10_000).nullable().optional(),

  priority: workItemPrioritySchema.optional(),

  weight: z.number().int().min(1).max(100).optional(),

  assigneeUserId: uuidSchema.nullable().optional(),

  dueAt: optionalNullableIsoDateSchema,
}) satisfies z.ZodType<CreateTaskInput>;

export const updateTaskSchema = createTaskSchema.partial();

export const changeTaskStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED']),
});

export const skipWorkItemSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const reorderItemsSchema = z
  .object({
    orderedIds: z.array(uuidSchema).min(1),
  })
  .superRefine(({ orderedIds }, context) => {
    if (new Set(orderedIds).size !== orderedIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['orderedIds'],
        message: 'orderedIds must contain unique values',
      });
    }
  });

export const moveTaskSchema = z.object({
  targetMilestoneId: uuidSchema,

  position: z.number().int().min(0).optional(),
});

export const createBlockerSchema = z.object({
  title: z.string().min(2).max(200),

  description: z.string().max(10_000).nullable().optional(),

  severity: workItemPrioritySchema.optional(),

  milestoneId: uuidSchema.nullable().optional(),

  taskId: uuidSchema.nullable().optional(),
}) satisfies z.ZodType<CreateBlockerInput>;

export const updateBlockerSchema = z.object({
  title: z.string().min(2).max(200).optional(),

  description: z.string().max(10_000).nullable().optional(),

  severity: workItemPrioritySchema.optional(),
});

export const resolveBlockerSchema = z.object({
  resolution: z.string().min(3).max(10_000),
});

export const blockerQuerySchema = z.object({
  status: blockerStatusSchema.optional(),

  severity: workItemPrioritySchema.optional(),

  search: z.string().max(160).optional(),

  page: z.number().int().min(1).optional(),

  limit: z.number().int().min(1).max(100).optional(),
});

export const applyDevelopmentTemplateSchema = z.object({
  template: developmentTemplateSchema,

  replaceExisting: z.boolean().optional(),
});
