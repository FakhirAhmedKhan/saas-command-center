export const AnalyticsAggregatePeriod = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
} as const;

export type AnalyticsAggregatePeriod = (typeof AnalyticsAggregatePeriod)[keyof typeof AnalyticsAggregatePeriod];

export const ANALYTICS_DEVICE_TYPES = ['DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'OTHER'] as const;

export type AnalyticsDeviceType = (typeof ANALYTICS_DEVICE_TYPES)[number];

export const ANALYTICS_SOURCE_TYPES = ['DIRECT', 'INTERNAL', 'SEARCH', 'SOCIAL', 'REFERRAL', 'UNKNOWN'] as const;

export type AnalyticsSourceType = (typeof ANALYTICS_SOURCE_TYPES)[number];

export const ANALYTICS_AGGREGATE_DIMENSIONS = ['OVERVIEW', 'PAGE', 'SOURCE', 'COUNTRY', 'DEVICE', 'BROWSER', 'OPERATING_SYSTEM', 'CUSTOM_EVENT'] as const;

export type AnalyticsAggregateDimension = (typeof ANALYTICS_AGGREGATE_DIMENSIONS)[number];

export interface AnalyticsAggregateQueryInput {
  period?: AnalyticsAggregatePeriod;
  dimension?: AnalyticsAggregateDimension;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface AnalyticsReprocessInput {
  dateFrom: string;
  dateTo: string;
  maxEvents?: number;
}
