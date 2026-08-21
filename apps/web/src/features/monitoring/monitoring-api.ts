import type { HealthCheck, HealthCheckHistory, HealthIncident, MonitoringSummary, MonitoringTarget, SaveHealthCheckInput } from './monitoring.types';
import { apiRequest } from '../lib/api/api-client';

function createBasePath(workspaceId: string): string {
  return `/workspaces/${workspaceId}/monitoring`;
}

export async function getMonitoringSummary(
  workspaceId: string,

  signal?: AbortSignal,
): Promise<MonitoringSummary> {
  return apiRequest<MonitoringSummary>(
    `${createBasePath(workspaceId)}/summary`,

    {
      method: 'GET',

      signal,
    },
  );
}

export async function getMonitoringTargets(
  workspaceId: string,

  signal?: AbortSignal,
): Promise<MonitoringTarget[]> {
  return apiRequest<MonitoringTarget[]>(
    `${createBasePath(workspaceId)}/targets`,

    {
      method: 'GET',

      signal,
    },
  );
}

export async function getHealthChecks(
  workspaceId: string,

  signal?: AbortSignal,
): Promise<HealthCheck[]> {
  return apiRequest<HealthCheck[]>(
    `${createBasePath(workspaceId)}/checks`,

    {
      method: 'GET',

      signal,
    },
  );
}

export async function getHealthCheckHistory(
  workspaceId: string,
  checkId: string,

  signal?: AbortSignal,
): Promise<HealthCheckHistory[]> {
  return apiRequest<HealthCheckHistory[]>(
    `${createBasePath(workspaceId)}/checks/${checkId}/history`,

    {
      method: 'GET',

      signal,
    },
  );
}

export async function getHealthIncidents(
  workspaceId: string,

  signal?: AbortSignal,
): Promise<HealthIncident[]> {
  return apiRequest<HealthIncident[]>(
    `${createBasePath(workspaceId)}/incidents`,

    {
      method: 'GET',

      signal,
    },
  );
}

export async function createHealthCheck(workspaceId: string, input: SaveHealthCheckInput): Promise<HealthCheck> {
  return apiRequest<HealthCheck>(
    `${createBasePath(workspaceId)}/checks`,

    {
      method: 'POST',
      body: input,
    },
  );
}

export async function updateHealthCheck(workspaceId: string, checkId: string, input: Partial<SaveHealthCheckInput>): Promise<HealthCheck> {
  return apiRequest<HealthCheck>(
    `${createBasePath(workspaceId)}/checks/${checkId}`,

    {
      method: 'PATCH',
      body: input,
    },
  );
}

export async function runHealthCheckNow(workspaceId: string, checkId: string): Promise<void> {
  await apiRequest(
    `${createBasePath(workspaceId)}/checks/${checkId}/run`,

    {
      method: 'POST',
    },
  );
}
