import { apiRequest } from '@/features/lib/api/api-client';
import type {
  CreateMobileAlertRuleInput,
  CreateMobileApplicationInput,
  CreateMobileReleaseInput,
  GithubMobileBuildInput,
  MobileAlertIncident,
  MobileAlertRule,
  MobileAnalysisRequest,
  MobileAnalysisResult,
  MobileApplicationDetails,
  MobileAppOverview,
  MobileBuild,
  MobileBuildDetails,
  MobileBuildFilters,
  MobileBuildIngestionResult,
  MobilePerformanceComparison,
  MobilePerformanceFilters,
  MobilePerformanceProblem,
  MobilePerformanceSummary,
  MobilePerformanceVersionSummary,
  MobileProjectDetectionResponse,
  MobileRelease,
  MobileReleaseFilters,
  MobileReleaseStatus,
  MobileTelemetryIntegration,
  MobileTestRun,
  MobileTestRunInput,
  RepositoryConnection,
  UpdateMobileApplicationInput,
} from '@command-center/shared-types';

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

export function getMobileAppOverview(workspaceId: string, mobileAppId: string) {
  return apiRequest<MobileAppOverview>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/overview`);
}

export function listMobileBuilds(workspaceId: string, mobileAppId: string, filters: MobileBuildFilters = {}) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.branch) {
    params.set('branch', filters.branch);
  }

  if (filters.version) {
    params.set('version', filters.version);
  }

  if (filters.platform) {
    params.set('platform', filters.platform);
  }

  const query = params.toString();

  return apiRequest<MobileBuild[]>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/builds${query ? `?${query}` : ''}`);
}

export function getMobileBuild(workspaceId: string, mobileAppId: string, buildId: string) {
  return apiRequest<MobileBuildDetails>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/builds/${buildId}`);
}

export function ingestGithubMobileBuild(workspaceId: string, mobileAppId: string, payload: GithubMobileBuildInput) {
  return apiRequest<MobileBuildIngestionResult>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/builds/ingest/github`, {
    method: 'POST',

    body: JSON.stringify(payload),
  });
}

export function listMobileBuildTests(workspaceId: string, mobileAppId: string, buildId: string) {
  return apiRequest<MobileTestRun[]>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/builds/${buildId}/tests`);
}

export function ingestMobileTestRun(workspaceId: string, mobileAppId: string, buildId: string, payload: MobileTestRunInput) {
  return apiRequest<MobileTestRun>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/builds/${buildId}/tests/ingest`, {
    method: 'POST',

    body: JSON.stringify(payload),
  });
}

export function getMobileTestsDashboard(workspaceId: string, mobileAppId: string) {
  return apiRequest<MobileBuildDetails[]>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/tests`);
}

export function listMobileReleases(workspaceId: string, mobileAppId: string, filters: MobileReleaseFilters = {}) {
  const params = new URLSearchParams();

  if (filters.environment) {
    params.set('environment', filters.environment);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  const query = params.toString();

  return apiRequest<MobileRelease[]>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/releases${query ? `?${query}` : ''}`);
}

export function createMobileRelease(workspaceId: string, mobileAppId: string, payload: CreateMobileReleaseInput) {
  return apiRequest<MobileRelease>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/releases`, {
    method: 'POST',

    body: JSON.stringify(payload),
  });
}

export function updateMobileReleaseStatus(workspaceId: string, mobileAppId: string, releaseId: string, status: MobileReleaseStatus) {
  return apiRequest<MobileRelease>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/releases/${releaseId}/status`, {
    method: 'PATCH',

    body: JSON.stringify({
      status,
    }),
  });
}

function performanceParams(filters: MobilePerformanceFilters): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `?${query}` : '';
}

export function getMobilePerformanceSummary(workspaceId: string, mobileAppId: string, filters: MobilePerformanceFilters = {}) {
  return apiRequest<MobilePerformanceSummary>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/summary${performanceParams(filters)}`);
}

export function getMobilePerformanceVersions(workspaceId: string, mobileAppId: string, filters: MobilePerformanceFilters = {}) {
  return apiRequest<MobilePerformanceVersionSummary[]>(
    `/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/versions${performanceParams(filters)}`,
  );
}

export function getMobilePerformanceIssues(workspaceId: string, mobileAppId: string, filters: MobilePerformanceFilters = {}) {
  return apiRequest<MobilePerformanceProblem[]>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/issues${performanceParams(filters)}`);
}

export function compareMobilePerformance(workspaceId: string, mobileAppId: string, fromVersion: string, toVersion: string) {
  const params = new URLSearchParams({
    fromVersion,
    toVersion,
  });

  return apiRequest<MobilePerformanceComparison>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/compare?${params}`);
}

export function listMobileAlertRules(workspaceId: string, mobileAppId: string) {
  return apiRequest<MobileAlertRule[]>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/alerts/rules`);
}
export function analyzeMobileApp(workspaceId: string, mobileAppId: string, payload: MobileAnalysisRequest) {
  return apiRequest<MobileAnalysisResult>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/analysis`, {
    method: 'POST',

    body: JSON.stringify(payload),
  });
}
export function createMobileAlertRule(workspaceId: string, mobileAppId: string, payload: CreateMobileAlertRuleInput) {
  return apiRequest<MobileAlertRule>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/alerts/rules`, {
    method: 'POST',

    body: JSON.stringify(payload),
  });
}

export function updateMobileAlertRule(workspaceId: string, mobileAppId: string, ruleId: string, payload: Partial<CreateMobileAlertRuleInput>) {
  return apiRequest<MobileAlertRule>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/alerts/rules/${ruleId}`, {
    method: 'PATCH',

    body: JSON.stringify(payload),
  });
}

export function listMobileAlertIncidents(workspaceId: string, mobileAppId: string) {
  return apiRequest<MobileAlertIncident[]>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/alerts/incidents`);
}

export function evaluateMobileAlerts(workspaceId: string, mobileAppId: string) {
  return apiRequest<{
    evaluated: number;
    openIncidents: number;
  }>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/alerts/evaluate`, {
    method: 'POST',
  });
}

// -----------------------------------------------------------------------------
// Mobile telemetry
// -----------------------------------------------------------------------------

export function getMobileTelemetryIntegration(workspaceId: string, mobileAppId: string) {
  return apiRequest<MobileTelemetryIntegration | null>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/telemetry`);
}

export function connectMobileTelemetry(workspaceId: string, mobileAppId: string, payload: unknown) {
  return apiRequest<MobileTelemetryIntegration>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/telemetry/connect`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function syncMobileTelemetry(workspaceId: string, mobileAppId: string) {
  return apiRequest<unknown>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/telemetry/sync`, {
    method: 'POST',
  });
}

export function disconnectMobileTelemetry(workspaceId: string, mobileAppId: string) {
  return apiRequest<unknown>(`/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/telemetry`, {
    method: 'DELETE',
  });
}
