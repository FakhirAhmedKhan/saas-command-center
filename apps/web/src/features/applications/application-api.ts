import type {
  ApplicationLink,
  ApplicationListQuery,
  ApplicationListResponse,
  ApplicationTechnology,
  CreateApplicationLinkPayload,
  CreateApplicationPayload,
  CreateTechnologyPayload,
  SaasApplication,
  UpdateApplicationLinkPayload,
  UpdateApplicationPayload,
  UpdateTechnologyPayload,
} from './application-types';
import { apiRequest } from '@/features/lib/api/api-client';

function buildQueryString(query: ApplicationListQuery = {}): string {
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

export function getApplications(workspaceId: string, query?: ApplicationListQuery) {
  return apiRequest<ApplicationListResponse>(`/workspaces/${workspaceId}/applications${buildQueryString(query)}`);
}

export function getApplication(workspaceId: string, applicationId: string) {
  return apiRequest<SaasApplication>(`/workspaces/${workspaceId}/applications/${applicationId}`);
}

export function createApplication(workspaceId: string, payload: CreateApplicationPayload) {
  return apiRequest<SaasApplication>(`/workspaces/${workspaceId}/applications`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateApplication(workspaceId: string, applicationId: string, payload: UpdateApplicationPayload) {
  return apiRequest<SaasApplication>(`/workspaces/${workspaceId}/applications/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function archiveApplication(workspaceId: string, applicationId: string) {
  return apiRequest<SaasApplication>(`/workspaces/${workspaceId}/applications/${applicationId}/archive`, {
    method: 'POST',
  });
}

export function restoreApplication(workspaceId: string, applicationId: string) {
  return apiRequest<SaasApplication>(`/workspaces/${workspaceId}/applications/${applicationId}/restore`, {
    method: 'POST',
  });
}

export function permanentlyDeleteApplication(workspaceId: string, applicationId: string) {
  return apiRequest<{
    message: string;
  }>(`/workspaces/${workspaceId}/applications/${applicationId}`, {
    method: 'DELETE',
  });
}

export function addApplicationTechnology(workspaceId: string, applicationId: string, payload: CreateTechnologyPayload) {
  return apiRequest<ApplicationTechnology>(`/workspaces/${workspaceId}/applications/${applicationId}/technologies`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateApplicationTechnology(workspaceId: string, applicationId: string, technologyId: string, payload: UpdateTechnologyPayload) {
  return apiRequest<ApplicationTechnology>(`/workspaces/${workspaceId}/applications/${applicationId}/technologies/${technologyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function removeApplicationTechnology(workspaceId: string, applicationId: string, technologyId: string) {
  return apiRequest<{
    message: string;
  }>(`/workspaces/${workspaceId}/applications/${applicationId}/technologies/${technologyId}`, {
    method: 'DELETE',
  });
}

export function addApplicationLink(workspaceId: string, applicationId: string, payload: CreateApplicationLinkPayload) {
  return apiRequest<ApplicationLink>(`/workspaces/${workspaceId}/applications/${applicationId}/links`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateApplicationLink(workspaceId: string, applicationId: string, linkId: string, payload: UpdateApplicationLinkPayload) {
  return apiRequest<ApplicationLink>(`/workspaces/${workspaceId}/applications/${applicationId}/links/${linkId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function removeApplicationLink(workspaceId: string, applicationId: string, linkId: string) {
  return apiRequest<{
    message: string;
  }>(`/workspaces/${workspaceId}/applications/${applicationId}/links/${linkId}`, {
    method: 'DELETE',
  });
}
