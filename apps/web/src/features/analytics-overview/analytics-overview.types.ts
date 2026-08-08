export type AnalyticsPreset = 'today' | '7d' | '30d' | '90d';

export interface AnalyticsMetric {
  value: number;

  previousValue: number;

  changePercent: number | null;
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
  website: {
    id: string;

    name: string;

    domain: string;

    timeZone: string;

    lastEventAt: string | null;
  };

  range: {
    preset: string;

    from: string;

    to: string;

    previousFrom: string;

    previousTo: string;

    granularity: 'hour' | 'day';

    days: number;
  };

  metrics: {
    visitors: AnalyticsMetric;

    sessions: AnalyticsMetric;

    pageViews: AnalyticsMetric;

    bounceRate: AnalyticsMetric;

    averageDurationSeconds: AnalyticsMetric;
  };

  trend: AnalyticsTrendPoint[];

  topPages: AnalyticsBreakdownItem[];

  topSources: AnalyticsBreakdownItem[];

  topCountries: AnalyticsBreakdownItem[];

  topDevices: AnalyticsBreakdownItem[];

  topBrowsers: AnalyticsBreakdownItem[];

  topOperatingSystems: AnalyticsBreakdownItem[];

  empty: boolean;
}

export interface GetAnalyticsOverviewInput {
  workspaceId: string;

  websiteId: string;

  preset?: AnalyticsPreset;

  from?: string;

  to?: string;

  signal?: AbortSignal;
}
