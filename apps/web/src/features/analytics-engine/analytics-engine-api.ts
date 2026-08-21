import type {
  AnalyticsAggregateDimension,
  AnalyticsAggregatePeriod,
  AnalyticsAggregateResponse,
  AnalyticsEngineStatus,
  AnalyticsProcessingRun,
  AnalyticsRetentionResult,
  ReprocessAnalyticsPayload,
} from './analytics-engine-types';
import { apiRequest } from '@/features/lib/api/api-client';

function basePath(workspaceId: string, websiteId: string): string {
  return `/workspaces/${workspaceId}/websites/${websiteId}/analytics-engine`;
}

export function getAnalyticsEngineStatus(workspaceId: string, websiteId: string) {
  return apiRequest<AnalyticsEngineStatus>(`${basePath(workspaceId, websiteId)}/status`);
}

export function getAnalyticsAggregates(
  workspaceId: string,
  websiteId: string,
  query: {
    period: AnalyticsAggregatePeriod;

    dimension: AnalyticsAggregateDimension;

    dateFrom?: string;

    dateTo?: string;

    limit?: number;
  },
) {
  const parameters = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      parameters.set(key, String(value));
    }
  });

  return apiRequest<AnalyticsAggregateResponse>(`${basePath(workspaceId, websiteId)}/aggregates?${parameters.toString()}`);
}

export function processAnalytics(workspaceId: string, websiteId: string, maxEvents = 5000) {
  return apiRequest<{
    run: AnalyticsProcessingRun;

    status: AnalyticsEngineStatus;
  }>(`${basePath(workspaceId, websiteId)}/process`, {
    method: 'POST',
    body: JSON.stringify({
      maxEvents,
    }),
  });
}

export function reprocessAnalytics(workspaceId: string, websiteId: string, payload: ReprocessAnalyticsPayload) {
  return apiRequest<{
    run: AnalyticsProcessingRun;

    status: AnalyticsEngineStatus;
  }>(`${basePath(workspaceId, websiteId)}/reprocess`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function runAnalyticsRetention(workspaceId: string, websiteId: string) {
  return apiRequest<AnalyticsRetentionResult>(`${basePath(workspaceId, websiteId)}/retention`, {
    method: 'POST',
  });
}
