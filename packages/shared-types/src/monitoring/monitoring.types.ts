export const HEALTH_TARGET_TYPES = ['APPLICATION', 'WEBSITE'] as const;

export type HealthTargetType = (typeof HEALTH_TARGET_TYPES)[number];

export const HEALTH_CHECK_STATUSES = ['UNKNOWN', 'HEALTHY', 'DEGRADED', 'DOWN', 'DISABLED'] as const;

export type HealthCheckStatus = (typeof HEALTH_CHECK_STATUSES)[number];

export const HEALTH_INCIDENT_STATUSES = ['OPEN', 'RESOLVED'] as const;

export type HealthIncidentStatus = (typeof HEALTH_INCIDENT_STATUSES)[number];

export interface MonitoringSummary {
  canManage: boolean;
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
  disabled: number;
  activeIncidents: number;
}

export interface HealthCheck {
  id: string;
  targetType: HealthTargetType;
  targetId: string;
  targetName: string;
  applicationId: string | null;
  websiteId: string | null;
  name: string;
  url: string;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatusMin: number;
  expectedStatusMax: number;
  degradedAfterMs: number;
  failureThreshold: number;
  enabled: boolean;
  latestStatus: HealthCheckStatus;
  lastStatusCode: number | null;
  lastResponseTimeMs: number | null;
  lastFailureReason: string | null;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  lastSuccessfulAt: string | null;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthCheckHistory {
  id: string;
  status: HealthCheckStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  failureReason: string | null;
  checkedAt: string;
}

export interface HealthIncident {
  id: string;
  healthCheckId: string;
  healthCheckName: string;
  targetName: string;
  status: HealthIncidentStatus;
  summary: string;
  failureCount: number;
  firstFailureAt: string;
  lastFailureAt: string;
  startedAt: string;
  resolvedAt: string | null;
}

export interface MonitoringTarget {
  id: string;
  type: HealthTargetType;
  name: string;
  subtitle: string | null;
}

export interface SaveHealthCheckInput {
  targetType: HealthTargetType;
  applicationId?: string;
  websiteId?: string;
  name: string;
  url: string;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatusMin: number;
  expectedStatusMax: number;
  degradedAfterMs: number;
  failureThreshold: number;
  enabled: boolean;
}

export type UpdateHealthCheckInput = Partial<SaveHealthCheckInput>;

export interface HealthCheckListQueryInput {
  status?: HealthCheckStatus;
  targetType?: HealthTargetType;
  enabled?: boolean;
  applicationId?: string;
  websiteId?: string;
}

export interface IncidentListQueryInput {
  status?: HealthIncidentStatus;
}
