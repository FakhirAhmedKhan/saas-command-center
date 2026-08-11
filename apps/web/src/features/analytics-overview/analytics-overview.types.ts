import type { AnalyticsOverviewQueryInput, AnalyticsPreset } from '@command-center/shared-types';

export type { AnalyticsBreakdownItem, AnalyticsMetric, AnalyticsOverviewResponse, AnalyticsPreset, AnalyticsTrendPoint } from '@command-center/shared-types';

export interface GetAnalyticsOverviewInput extends AnalyticsOverviewQueryInput {
  workspaceId: string;
  websiteId: string;
  signal?: AbortSignal;
}
