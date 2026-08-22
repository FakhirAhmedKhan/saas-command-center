import type {
  MobileProjectDetectionResponse,
  CreateMobileApplicationInput,
  MobileApplicationDetails,
  RepositoryConnection,
  UpdateMobileApplicationInput,
} from '@command-center/shared-types';

import { apiRequest } from '@/features/lib/api/api-client';

export function createMobileApp(workspaceId: string, payload: CreateMobileApplicationInput) {
  return apiRequest<MobileApplicationDetails>(`/workspaces/${workspaceId}/mobile-apps`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listMobileApps(workspaceId: string, signal?: AbortSignal) {
  return apiRequest<MobileApplicationDetails[]>(`/workspaces/${workspaceId}/mobile-apps`, {
    signal,
  });
}

export function getMobileApp(workspaceId: string, mobileAppId: string) {
  return apiRequest<MobileApplicationDetails>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}`);
}

export function updateMobileApp(workspaceId: string, mobileAppId: string, payload: UpdateMobileApplicationInput) {
  return apiRequest<MobileApplicationDetails>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function archiveMobileApp(workspaceId: string, mobileAppId: string) {
  return apiRequest<MobileApplicationDetails>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}`, {
    method: 'DELETE',
  });
}

export function getMobileRepository(workspaceId: string, mobileAppId: string) {
  return apiRequest<RepositoryConnection | null>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/repository`);
}

export function linkMobileRepository(workspaceId: string, mobileAppId: string, repositoryId: string) {
  return apiRequest<RepositoryConnection>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/repository`, {
    method: 'POST',

    body: JSON.stringify({
      repositoryId,
    }),
  });
}

export function unlinkMobileRepository(workspaceId: string, mobileAppId: string) {
  return apiRequest<{
    success: true;
  }>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/repository`, {
    method: 'DELETE',
  });
}

export function detectMobileProject(workspaceId: string, mobileAppId: string) {
  return apiRequest<MobileProjectDetectionResponse>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/detect`, {
    method: 'POST',
  });
}
