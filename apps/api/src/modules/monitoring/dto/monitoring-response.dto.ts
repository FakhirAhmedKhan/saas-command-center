import type { HealthCheckStatus, HealthIncidentStatus, HealthTargetType } from '../../../generated/prisma/client';

export interface MonitoringSummaryDto {
  canManage: boolean;

  total: number;

  healthy: number;

  degraded: number;

  down: number;

  unknown: number;

  disabled: number;

  activeIncidents: number;
}

export interface HealthCheckDto {
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

export interface HealthCheckHistoryDto {
  id: string;

  status: HealthCheckStatus;

  statusCode: number | null;

  responseTimeMs: number | null;

  failureReason: string | null;

  checkedAt: string;
}

export interface HealthIncidentDto {
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

export interface MonitoringTargetDto {
  id: string;

  type: HealthTargetType;

  name: string;

  subtitle: string | null;
}
