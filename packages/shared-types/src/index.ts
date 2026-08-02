export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const TASK_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'BLOCKED',
  'IN_REVIEW',
  'COMPLETED',
  'SKIPPED',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const APPLICATION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type ApplicationPriority = (typeof APPLICATION_PRIORITIES)[number];

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  requestId: string;
  timestamp: string;
  details?: unknown;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}
