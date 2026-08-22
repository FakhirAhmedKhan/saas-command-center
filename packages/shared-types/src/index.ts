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
  status: 'ok' | 'error';
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  database: {
    status: 'up' | 'down';
    responseTimeMs: number;
  };
}
export * from './analytics/index.js';
export * from './repositories/index.js';
export * from './common/index.js';
export * from './auth/index.js';
export * from './workspaces/index.js';
export * from './applications/index.js';
export * from './websites/index.js';
export * from './activity/index.js';
export * from './development/index.js';
export * from './monitoring/index.js';
export * from './releases/index.js';
export * from './integrations/index.js';
export * from './team-operations/index.js';
export * from './tracking/index.js';
export * from './mobile-apps';
