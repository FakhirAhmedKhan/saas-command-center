import { apiRequest } from '@/features/lib/api/api-client';

import type {
  CreateDesktopApplicationInput,
  DesktopApplicationDetails,
  RepositoryConnection,
  UpdateDesktopApplicationInput,
} from '@command-center/shared-types';

export function createDesktopApp(workspaceId: string, payload: CreateDesktopApplicationInput) {
  return apiRequest<DesktopApplicationDetails>(`/workspaces/${workspaceId}/desktop-apps`, {
    method: 'POST',

    body: JSON.stringify(payload),
  });
}

export function listDesktopApps(workspaceId: string, signal?: AbortSignal) {
  return apiRequest<DesktopApplicationDetails[]>(`/workspaces/${workspaceId}/desktop-apps`, {
    signal,
  });
}

export function getDesktopApp(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopApplicationDetails>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`);
}

export function updateDesktopApp(workspaceId: string, desktopAppId: string, payload: UpdateDesktopApplicationInput) {
  return apiRequest<DesktopApplicationDetails>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`, {
    method: 'PATCH',

    body: JSON.stringify(payload),
  });
}

export function archiveDesktopApp(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopApplicationDetails>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`, {
    method: 'DELETE',
  });
}
export function getDesktopRepository(workspaceId: string, desktopAppId: string) {
  return apiRequest<RepositoryConnection | null>(`/workspaces/${workspaceId}` + `/desktop-apps/${desktopAppId}` + '/repository');
}

export function linkDesktopRepository(workspaceId: string, desktopAppId: string, repositoryId: string) {
  return apiRequest<RepositoryConnection>(`/workspaces/${workspaceId}` + `/desktop-apps/${desktopAppId}` + '/repository', {
    method: 'POST',

    body: JSON.stringify({
      repositoryId,
    }),
  });
}

export function unlinkDesktopRepository(workspaceId: string, desktopAppId: string) {
  return apiRequest<{
    success: true;
  }>(`/workspaces/${workspaceId}` + `/desktop-apps/${desktopAppId}` + '/repository', {
    method: 'DELETE',
  });
}

export function detectDesktopProject(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopProjectDetectionResponse>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/detect`, {
    method: 'POST',
  });
}

/**
 * Dedicated Phase 5 helper so this implementation does not depend on the
 * exact Phase 2 update-helper function name. It intentionally calls the
 * already-existing PATCH desktop-app endpoint rather than creating another
 * backend mutation.
 */
export function applyDetectedDesktopConfiguration(workspaceId: string, desktopAppId: string, input: UpdateDesktopApplicationInput) {
  return apiRequest<DesktopApplicationDetails>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getDesktopAppOverview(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopAppOverview>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/overview`);
}

export function listDesktopBuilds(workspaceId: string, desktopAppId: string, filters: DesktopBuildFilters = {}) {
  const search = new URLSearchParams();

  if (filters.status) search.set('status', filters.status);
  if (filters.platform) search.set('platform', filters.platform);
  if (filters.architecture) {
    search.set('architecture', filters.architecture);
  }
  if (filters.branch) search.set('branch', filters.branch);
  if (filters.version) search.set('version', filters.version);

  const query = search.toString();

  return apiRequest<DesktopBuild[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds${query ? `?${query}` : ''}`);
}

export function listDesktopBuildArtifacts(workspaceId: string, desktopAppId: string, buildId: string) {
  return apiRequest<DesktopBuildArtifact[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`);
}

export function ingestDesktopBuildArtifact(workspaceId: string, desktopAppId: string, buildId: string, input: IngestDesktopBuildArtifactInput) {
  return apiRequest<DesktopBuildArtifact>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
export function getDesktopBuild(workspaceId: string, desktopAppId: string, buildId: string) {
  return apiRequest<DesktopBuild>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}`);
}

export function ingestGithubDesktopBuild(workspaceId: string, desktopAppId: string, input: IngestGithubDesktopBuildInput) {
  return apiRequest<DesktopBuildIngestionResult>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/ingest/github`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listDesktopBuildTests(workspaceId: string, desktopAppId: string, buildId: string) {
  return apiRequest<DesktopTestRun[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`);
}

export function listDesktopAppTests(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopTestRun[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests`);
}

export function getDesktopTestSummary(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopTestSummary>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests/summary`);
}

export function ingestDesktopTestRun(workspaceId: string, desktopAppId: string, buildId: string, input: IngestDesktopTestRunInput) {
  return apiRequest<DesktopTestRun>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listDesktopReleases(workspaceId: string, desktopAppId: string, filters: DesktopReleaseFilters = {}) {
  const search = new URLSearchParams();

  if (filters.channel) {
    search.set('channel', filters.channel);
  }

  if (filters.status) {
    search.set('status', filters.status);
  }

  if (filters.platform) {
    search.set('platform', filters.platform);
  }

  if (filters.architecture) {
    search.set('architecture', filters.architecture);
  }

  const query = search.toString();

  return apiRequest<DesktopRelease[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases${query ? `?${query}` : ''}`);
}

export function getDesktopRelease(workspaceId: string, desktopAppId: string, releaseId: string) {
  return apiRequest<DesktopRelease>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases/${releaseId}`);
}

export function createDesktopRelease(workspaceId: string, desktopAppId: string, input: CreateDesktopReleaseInput) {
  return apiRequest<DesktopRelease>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateDesktopReleaseStatus(workspaceId: string, desktopAppId: string, releaseId: string, status: DesktopReleaseStatus) {
  return apiRequest<DesktopRelease>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases/${releaseId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
    }),
  });
}
