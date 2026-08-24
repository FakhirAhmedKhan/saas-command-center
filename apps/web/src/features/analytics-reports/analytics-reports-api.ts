import type { AnalyticsDimension, AnalyticsReportRequest, AnalyticsReportResponse } from './analytics-reports.types';
import { apiDownload, apiRequest } from '../lib/api/api-client';

function getReportDimension(request: AnalyticsReportRequest): AnalyticsDimension | null {
  switch (request.tab) {
    case 'sources':
      return 'sources';

    case 'geography':
      return 'countries';

    case 'technology':
      return request.dimension;

    default:
      return null;
  }
}

function createSearchParams(request: AnalyticsReportRequest): URLSearchParams {
  const params = new URLSearchParams({
    preset: request.preset,
    page: String(request.page),
    limit: String(request.limit),
    sortBy: request.sortBy,
    sortDirection: request.sortDirection,
  });

  if (request.search.trim()) {
    params.set('search', request.search.trim());
  }

  return params;
}

function createBasePath(request: AnalyticsReportRequest): string {
  return ['/workspaces', request.workspaceId, 'websites', request.websiteId, 'analytics', 'reports'].join('/');
}

function createReportPath(request: AnalyticsReportRequest, exportMode: boolean): string {
  const basePath = createBasePath(request);
  const prefix = exportMode ? `${basePath}/exports` : basePath;

  if (request.tab === 'pages') {
    return `${prefix}/pages`;
  }

  if (request.tab === 'events') {
    return `${prefix}/events`;
  }

  const dimension = getReportDimension(request);

  if (!dimension) {
    throw new Error('Unsupported analytics report dimension.');
  }

  return `${prefix}/dimensions/${dimension}`;
}

export async function getAnalyticsReport(request: AnalyticsReportRequest): Promise<AnalyticsReportResponse> {
  const params = createSearchParams(request);
  const path = createReportPath(request, false);

  return apiRequest<AnalyticsReportResponse>(`${path}?${params.toString()}`, {
    method: 'GET',
    signal: request.signal,
  });
}

export async function downloadAnalyticsReport(request: AnalyticsReportRequest): Promise<void> {
  const params = createSearchParams({
    ...request,

    page: 1,
    limit: 100,
  });
  const path = createReportPath(request, true);

  await apiDownload(`${path}?${params.toString()}`, `analytics-${request.tab}.csv`);
}
