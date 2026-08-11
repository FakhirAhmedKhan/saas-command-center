import { ANALYTICS_AGGREGATE_DIMENSIONS, ANALYTICS_DATE_PRESETS, AnalyticsAggregatePeriod } from '@command-center/shared-types';

import type { AnalyticsAggregateQueryInput, AnalyticsOverviewQueryInput, AnalyticsReprocessInput, ReprocessAnalyticsInput } from '@command-center/shared-types';

import { z } from 'zod';

import { isoDateStringSchema } from './common.js';

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const analyticsPresetSchema = z.enum(ANALYTICS_DATE_PRESETS);

const aggregatePeriodSchema = z.enum([AnalyticsAggregatePeriod.HOURLY, AnalyticsAggregatePeriod.DAILY]);

const aggregateDimensionSchema = z.enum(ANALYTICS_AGGREGATE_DIMENSIONS);

const analyticsOverviewObject = z.object({
  preset: analyticsPresetSchema.optional(),

  from: dateKeySchema.optional(),

  to: dateKeySchema.optional(),
});

export const analyticsOverviewQuerySchema = analyticsOverviewObject.superRefine((value, context) => {
  const hasFrom = value.from !== undefined;
  const hasTo = value.to !== undefined;

  if (hasFrom !== hasTo) {
    context.addIssue({
      code: 'custom',
      path: hasFrom ? ['to'] : ['from'],
      message: 'from and to must be provided together',
    });
  }
}) satisfies z.ZodType<AnalyticsOverviewQueryInput>;

export const processAnalyticsSchema = z.object({
  maxEvents: z.number().int().min(1).max(50_000).optional(),
});

export const analyticsEngineReprocessSchema = z
  .object({
    dateFrom: isoDateStringSchema,

    dateTo: isoDateStringSchema,

    maxEvents: z.number().int().min(1).max(100_000).optional(),
  })
  .superRefine((value, context) => {
    if (new Date(value.dateTo).getTime() <= new Date(value.dateFrom).getTime()) {
      context.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: 'dateTo must be after dateFrom',
      });
    }
  }) satisfies z.ZodType<AnalyticsReprocessInput>;

export const analyticsAggregateQuerySchema = z.object({
  period: aggregatePeriodSchema.optional(),

  dimension: aggregateDimensionSchema.optional(),

  dateFrom: isoDateStringSchema.optional(),

  dateTo: isoDateStringSchema.optional(),

  limit: z.number().int().min(1).max(2_000).optional(),
}) satisfies z.ZodType<AnalyticsAggregateQueryInput>;

export const reprocessAnalyticsSchema = z
  .object({
    from: isoDateStringSchema,

    to: isoDateStringSchema,
  })
  .superRefine((value, context) => {
    if (new Date(value.to).getTime() <= new Date(value.from).getTime()) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'to must be after from',
      });
    }
  }) satisfies z.ZodType<ReprocessAnalyticsInput>;

const analyticsReportBaseShape = {
  preset: analyticsPresetSchema.optional(),

  from: dateKeySchema.optional(),

  to: dateKeySchema.optional(),

  page: z.number().int().min(1).optional(),

  limit: z.number().int().min(1).max(100).optional(),

  search: z.string().max(200).optional(),

  sortDirection: z.enum(['asc', 'desc']).optional(),
};

export const analyticsReportQuerySchema = z.object(analyticsReportBaseShape);

export const pageReportQuerySchema = z.object({
  ...analyticsReportBaseShape,

  sortBy: z.enum(['views', 'visitors', 'sessions', 'entrances', 'exits', 'bounceRate', 'averageDuration', 'path']).optional(),
});

export const eventReportQuerySchema = z.object({
  ...analyticsReportBaseShape,

  sortBy: z.enum(['events', 'visitors', 'sessions', 'name']).optional(),
});

export const dimensionReportQuerySchema = z.object({
  ...analyticsReportBaseShape,

  sortBy: z.enum(['visitors', 'sessions', 'pageViews', 'label']).optional(),
});

export const analyticsReportDimensionSchema = z.enum(['sources', 'countries', 'devices', 'browsers', 'operating-systems']);
