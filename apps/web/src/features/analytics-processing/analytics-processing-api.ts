import type { AnalyticsProcessingStatus, ProcessingRun, ReprocessAnalyticsInput } from './analytics-processing.types';
import { apiRequest } from '../lib/api/api-client';

function createBasePath(workspaceId: string, websiteId: string): string {
  return ['/workspaces', workspaceId, 'websites', websiteId, 'analytics', 'processing'].join('/');
}

export function getAnalyticsProcessingStatus(
  workspaceId: string,
  websiteId: string,

  signal?: AbortSignal,
): Promise<AnalyticsProcessingStatus> {
  return apiRequest<AnalyticsProcessingStatus>(`${createBasePath(workspaceId, websiteId)}/status`, {
    method: 'GET',

    signal,
  });
}

export function queueAnalyticsReprocessing(workspaceId: string, websiteId: string, input: ReprocessAnalyticsInput): Promise<ProcessingRun> {
  return apiRequest<ProcessingRun>(`${createBasePath(workspaceId, websiteId)}/reprocess`, {
    method: 'POST',
    body: input,
  });
}

export function retryAnalyticsProcessingRun(workspaceId: string, websiteId: string, runId: string): Promise<ProcessingRun> {
  return apiRequest<ProcessingRun>(`${createBasePath(workspaceId, websiteId)}/runs/${runId}/retry`, {
    method: 'POST',
  });
}
