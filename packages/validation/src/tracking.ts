import { RAW_EVENT_TYPES } from '@command-center/shared-types';

import type { RawEventQueryInput } from '@command-center/shared-types';

import { z } from 'zod';

import { isoDateStringSchema, uuidSchema } from './common.js';

const rawEventTypeSchema = z.enum(RAW_EVENT_TYPES);

const trackingIdentifierSchema = z.string().regex(/^[a-zA-Z0-9_-]{16,80}$/);

export const trackerEventSchema = z.object({
  eventId: trackingIdentifierSchema,

  type: rawEventTypeSchema,

  visitorId: trackingIdentifierSchema,

  sessionId: trackingIdentifierSchema,

  timestamp: isoDateStringSchema,

  url: z.string().max(2_048),

  title: z.string().max(512).optional(),

  referrer: z.string().max(2_048).optional(),

  eventName: z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_.:-]{1,99}$/)
    .optional(),

  properties: z.record(z.string(), z.unknown()).optional(),

  screenWidth: z.number().int().min(1).max(100_000).optional(),

  screenHeight: z.number().int().min(1).max(100_000).optional(),

  viewportWidth: z.number().int().min(1).max(100_000).optional(),

  viewportHeight: z.number().int().min(1).max(100_000).optional(),

  language: z.string().max(35).optional(),

  timeZone: z.string().max(64).optional(),

  durationMs: z.number().int().min(0).max(300_000).optional(),
});

export const collectEventsSchema = z.object({
  websiteId: uuidSchema,

  trackingKey: z.string().max(160),

  sdkVersion: z.string().max(32),

  sentAt: isoDateStringSchema,

  events: z.array(trackerEventSchema).min(1).max(25),
});

export const rawEventQuerySchema = z.object({
  type: rawEventTypeSchema.optional(),

  eventName: z.string().max(100).optional(),

  visitorId: z.string().max(80).optional(),

  sessionId: z.string().max(80).optional(),

  dateFrom: isoDateStringSchema.optional(),

  dateTo: isoDateStringSchema.optional(),

  page: z.number().int().min(1).optional(),

  limit: z.number().int().min(1).max(100).optional(),
}) satisfies z.ZodType<RawEventQueryInput>;
