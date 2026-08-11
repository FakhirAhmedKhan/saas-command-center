import type { ConnectWebsiteInput, CreateWebsiteInput, UpdateWebsiteInput, WebsiteListQueryInput } from '@command-center/shared-types';

import { z } from 'zod';

import { safeHttpUrlSchema, uuidSchema } from './common.js';

export const createWebsiteSchema = z.object({
  name: z.string().min(2).max(160),
  domain: z.string().min(1).max(253),
  timeZone: z.string().max(64).optional(),
  allowedOrigins: z.array(safeHttpUrlSchema).max(20).optional(),
  applicationId: uuidSchema.nullable().optional(),
  enabled: z.boolean().optional(),
}) satisfies z.ZodType<CreateWebsiteInput>;

export const updateWebsiteSchema: z.ZodType<UpdateWebsiteInput> = createWebsiteSchema.partial();

export const connectWebsiteSchema: z.ZodType<ConnectWebsiteInput> = z.object({
  applicationId: uuidSchema,
});

export const websiteListQuerySchema: z.ZodType<WebsiteListQueryInput> = z.object({
  search: z.string().max(160).optional(),
  applicationId: uuidSchema.optional(),
  connected: z.boolean().optional(),
  enabled: z.boolean().optional(),
  archived: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
