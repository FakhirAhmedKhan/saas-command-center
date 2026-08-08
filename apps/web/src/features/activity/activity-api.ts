import { apiRequest } from '@/features/lib/api/api-client';

import type { ActivityListQuery, ActivityListResponse } from './activity-types';

function buildActivityQuery(query: ActivityListQuery = {}): string {
  const parameters = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    parameters.set(key, String(value));
  });

  const queryString = parameters.toString();

  return queryString ? `?${queryString}` : '';
}

export function getWorkspaceActivities(workspaceId: string, query?: ActivityListQuery) {
  return apiRequest<ActivityListResponse>(
    `/workspaces/${workspaceId}/activities${buildActivityQuery(query)}`,
  );
}

export function getApplicationActivities(
  workspaceId: string,
  applicationId: string,
  query?: ActivityListQuery,
) {
  return apiRequest<ActivityListResponse>(
    `/workspaces/${workspaceId}/applications/${applicationId}/activities${buildActivityQuery(
      query,
    )}`,
  );
}
