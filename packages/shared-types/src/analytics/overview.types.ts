export const ANALYTICS_DATE_PRESETS = ['today', '7d', '30d', '90d'] as const;

export type AnalyticsPreset = (typeof ANALYTICS_DATE_PRESETS)[number];

export const AnalyticsDatePreset = {
  TODAY: 'today',
  SEVEN_DAYS: '7d',
  THIRTY_DAYS: '30d',
  NINETY_DAYS: '90d',
} as const;

export type AnalyticsDatePreset = (typeof AnalyticsDatePreset)[keyof typeof AnalyticsDatePreset];

export interface AnalyticsOverviewQueryInput {
  preset?: AnalyticsPreset;
  from?: string;
  to?: string;
}

export interface AnalyticsWebsite {
  id: string;
  name: string;
  domain: string;
  timeZone: string;
  lastEventAt: string | null;
}

export interface AnalyticsOverviewRange {
  preset: string;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  granularity: 'hour' | 'day';
  days: number;
}

export interface AnalyticsMetric {
  value: number;
  previousValue: number;
  changePercent: number | null;
}

export interface AnalyticsMetrics {
  visitors: AnalyticsMetric;
  sessions: AnalyticsMetric;
  pageViews: AnalyticsMetric;
  bounceRate: AnalyticsMetric;
  averageDurationSeconds: AnalyticsMetric;
}

export interface AnalyticsBreakdownItem {
  key: string;
  label: string;
  value: number;
  percentage: number;
}

export interface AnalyticsTrendPoint {
  bucketStart: string;
  visitors: number;
  sessions: number;
  pageViews: number;
}

export interface AnalyticsOverviewResponse {
  website: AnalyticsWebsite;
  range: AnalyticsOverviewRange;
  metrics: AnalyticsMetrics;
  trend: AnalyticsTrendPoint[];
  topPages: AnalyticsBreakdownItem[];
  topSources: AnalyticsBreakdownItem[];
  topCountries: AnalyticsBreakdownItem[];
  topDevices: AnalyticsBreakdownItem[];
  topBrowsers: AnalyticsBreakdownItem[];
  topOperatingSystems: AnalyticsBreakdownItem[];
  empty: boolean;
}
