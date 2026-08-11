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
export * from './analytics';
export * from './repositories';
export * from './common';
export * from './auth';
export * from './workspaces';
export * from './applications';
export * from './websites';
export * from './activity';
export * from './development';
export * from './monitoring';
export * from './releases';
export * from './integrations';
export * from './team-operations';
export * from './tracking';
