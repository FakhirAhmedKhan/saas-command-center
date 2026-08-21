import type { CurrentEnvironmentVersion, Deployment, DeploymentOptions, DeploymentStatus, PaginatedResponse, Release } from './release-management.types';
import { apiRequest } from '../lib/api/api-client';

function createApplicationPath(workspaceId: string, applicationId: string): string {
  return `/workspaces/${workspaceId}/applications/${applicationId}`;
}

export function getReleaseOptions(
  workspaceId: string,
  applicationId: string,

  signal?: AbortSignal,
): Promise<DeploymentOptions> {
  return apiRequest<DeploymentOptions>(
    `${createApplicationPath(workspaceId, applicationId)}/deployments/options`,

    {
      method: 'GET',

      signal,
    },
  );
}

export function getReleases(
  workspaceId: string,
  applicationId: string,

  signal?: AbortSignal,
): Promise<PaginatedResponse<Release>> {
  return apiRequest<PaginatedResponse<Release>>(
    `${createApplicationPath(workspaceId, applicationId)}/releases?limit=100`,

    {
      method: 'GET',

      signal,
    },
  );
}

export function createRelease(
  workspaceId: string,
  applicationId: string,
  input: {
    version: string;
    name?: string;
    notes?: string;
    commitRef?: string;
    repositoryUrl?: string;
    scheduledAt?: string;
  },
): Promise<Release> {
  return apiRequest<Release>(
    `${createApplicationPath(workspaceId, applicationId)}/releases`,

    {
      method: 'POST',
      body: input,
    },
  );
}

export function getDeployments(
  workspaceId: string,
  applicationId: string,
  filters: {
    environmentId?: string;
    status?: DeploymentStatus;
  },

  signal?: AbortSignal,
): Promise<PaginatedResponse<Deployment>> {
  const params = new URLSearchParams({
    limit: '100',
  });

  if (filters.environmentId) {
    params.set('environmentId', filters.environmentId);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  return apiRequest<PaginatedResponse<Deployment>>(
    `${createApplicationPath(workspaceId, applicationId)}/deployments?${params.toString()}`,

    {
      method: 'GET',

      signal,
    },
  );
}

export function getCurrentVersions(
  workspaceId: string,
  applicationId: string,

  signal?: AbortSignal,
): Promise<CurrentEnvironmentVersion[]> {
  return apiRequest<CurrentEnvironmentVersion[]>(
    `${createApplicationPath(workspaceId, applicationId)}/deployments/current`,

    {
      method: 'GET',

      signal,
    },
  );
}

export function createDeployment(
  workspaceId: string,
  applicationId: string,
  input: {
    releaseId: string;
    environmentId: string;
    commitRef?: string;
    repositoryUrl?: string;
    ciJobUrl?: string;
    liveUrl?: string;
    deploymentNotes?: string;
    scheduledAt?: string;
    healthIncidentId?: string;
  },
): Promise<Deployment> {
  return apiRequest<Deployment>(
    `${createApplicationPath(workspaceId, applicationId)}/deployments`,

    {
      method: 'POST',
      body: input,
    },
  );
}

export function transitionDeployment(
  workspaceId: string,
  applicationId: string,
  deploymentId: string,
  input: {
    status: DeploymentStatus;
    scheduledAt?: string;
    failureReason?: string;
    rollbackToDeploymentId?: string;
    healthIncidentId?: string;
    message?: string;
  },
): Promise<Deployment> {
  return apiRequest<Deployment>(
    `${createApplicationPath(workspaceId, applicationId)}/deployments/${deploymentId}/transition`,

    {
      method: 'POST',
      body: input,
    },
  );
}
