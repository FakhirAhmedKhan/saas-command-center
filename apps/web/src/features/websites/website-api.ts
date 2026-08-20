import type { CreateWebsitePayload, UpdateWebsitePayload, Website, WebsiteListQuery, WebsiteListResponse, WebsiteWithKeyResponse } from './website-types';
import { apiRequest } from '@/features/lib/api/api-client';

function buildQuery(query: WebsiteListQuery = {}): string {
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

function basePath(workspaceId: string): string {
  return `/workspaces/${workspaceId}/websites`;
}

export function getWebsites(workspaceId: string, query?: WebsiteListQuery) {
  return apiRequest<WebsiteListResponse>(`${basePath(workspaceId)}${buildQuery(query)}`);
}

export function getWebsite(workspaceId: string, websiteId: string) {
  return apiRequest<Website>(`${basePath(workspaceId)}/${websiteId}`);
}

export function createWebsite(workspaceId: string, payload: CreateWebsitePayload) {
  return apiRequest<WebsiteWithKeyResponse>(basePath(workspaceId), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWebsite(workspaceId: string, websiteId: string, payload: UpdateWebsitePayload) {
  return apiRequest<Website>(`${basePath(workspaceId)}/${websiteId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function enableWebsite(workspaceId: string, websiteId: string) {
  return apiRequest<Website>(`${basePath(workspaceId)}/${websiteId}/enable`, {
    method: 'POST',
  });
}

export function disableWebsite(workspaceId: string, websiteId: string) {
  return apiRequest<Website>(`${basePath(workspaceId)}/${websiteId}/disable`, {
    method: 'POST',
  });
}

export function archiveWebsite(workspaceId: string, websiteId: string) {
  return apiRequest<Website>(`${basePath(workspaceId)}/${websiteId}/archive`, {
    method: 'POST',
  });
}

export function restoreWebsite(workspaceId: string, websiteId: string) {
  return apiRequest<Website>(`${basePath(workspaceId)}/${websiteId}/restore`, {
    method: 'POST',
  });
}

export function rotateWebsiteKey(workspaceId: string, websiteId: string) {
  return apiRequest<WebsiteWithKeyResponse>(`${basePath(workspaceId)}/${websiteId}/rotate-key`, {
    method: 'POST',
  });
}

export function connectWebsite(workspaceId: string, websiteId: string, applicationId: string) {
  return apiRequest<Website>(`${basePath(workspaceId)}/${websiteId}/connect`, {
    method: 'POST',
    body: JSON.stringify({
      applicationId,
    }),
  });
}

export function disconnectWebsite(workspaceId: string, websiteId: string) {
  return apiRequest<Website>(`${basePath(workspaceId)}/${websiteId}/disconnect`, {
    method: 'POST',
  });
}
