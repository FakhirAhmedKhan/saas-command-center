import type { AnalyticsOverviewResponse, GetAnalyticsOverviewInput } from './analytics-overview.types';
import { apiRequest } from '../lib/api/api-client';

export async function getAnalyticsOverview({ workspaceId, websiteId, preset = '7d', from, to, signal }: GetAnalyticsOverviewInput): Promise<AnalyticsOverviewResponse> {
  const searchParams = new URLSearchParams();

  if (from && to) {
    searchParams.set('from', from);

    searchParams.set('to', to);
  } else {
    searchParams.set('preset', preset);
  }

  const path = ['/workspaces', workspaceId, 'websites', websiteId, 'analytics', 'overview'].join('/');

  return apiRequest<AnalyticsOverviewResponse>(`${path}?${searchParams.toString()}`, {
    method: 'GET',
    signal,
  });
}
