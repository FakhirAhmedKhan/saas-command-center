import {
  APPLICATION_CATEGORIES,
  APPLICATION_LINK_TYPES,
  APPLICATION_PRIORITIES,
  APPLICATION_SORT_FIELDS,
  APPLICATION_STATUSES,
  SORT_ORDERS,
  TECHNOLOGY_TYPES,
} from '@command-center/shared-types';

import type {
  ApplicationListQueryInput,
  CreateApplicationInput,
  CreateApplicationLinkInput,
  CreateApplicationTechnologyInput,
  UpdateApplicationInput,
  UpdateApplicationLinkInput,
  UpdateApplicationTechnologyInput,
} from '@command-center/shared-types';

import { z } from 'zod';

import { optionalNullableIsoDateSchema, safeHttpUrlSchema } from './common.js';

const applicationCategorySchema = z.enum(APPLICATION_CATEGORIES);
const applicationPrioritySchema = z.enum(APPLICATION_PRIORITIES);
const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
const applicationSortFieldSchema = z.enum(APPLICATION_SORT_FIELDS);
const sortOrderSchema = z.enum(SORT_ORDERS);
const technologyTypeSchema = z.enum(TECHNOLOGY_TYPES);
const applicationLinkTypeSchema = z.enum(APPLICATION_LINK_TYPES);

export const createApplicationSchema = z.object({
  name: z.string().min(2).max(160),

  slug: z
    .string()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),

  shortDescription: z.string().max(280).nullable().optional(),
  longDescription: z.string().max(10_000).nullable().optional(),

  category: applicationCategorySchema.optional(),
  status: applicationStatusSchema.optional(),
  priority: applicationPrioritySchema.optional(),

  startedAt: optionalNullableIsoDateSchema,
  targetLaunchAt: optionalNullableIsoDateSchema,
  launchedAt: optionalNullableIsoDateSchema,
}) satisfies z.ZodType<CreateApplicationInput>;

export const updateApplicationSchema: z.ZodType<UpdateApplicationInput> = createApplicationSchema.partial();

export const applicationListQuerySchema: z.ZodType<ApplicationListQueryInput> = z.object({
  search: z.string().max(160).optional(),
  status: applicationStatusSchema.optional(),
  priority: applicationPrioritySchema.optional(),
  category: applicationCategorySchema.optional(),
  archived: z.boolean().optional(),
  sortBy: applicationSortFieldSchema.optional(),
  sortOrder: sortOrderSchema.optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const createApplicationTechnologySchema = z.object({
  name: z.string().min(1).max(80),
  type: technologyTypeSchema,
  version: z.string().max(50).nullable().optional(),
}) satisfies z.ZodType<CreateApplicationTechnologyInput>;

export const updateApplicationTechnologySchema: z.ZodType<UpdateApplicationTechnologyInput> = createApplicationTechnologySchema.partial();

export const createApplicationLinkSchema = z.object({
  label: z.string().min(1).max(80),
  type: applicationLinkTypeSchema,
  url: safeHttpUrlSchema,
}) satisfies z.ZodType<CreateApplicationLinkInput>;

export const updateApplicationLinkSchema: z.ZodType<UpdateApplicationLinkInput> = createApplicationLinkSchema.partial();
