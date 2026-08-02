const REQUIRED_ENV_KEYS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'TEST_DATABASE_URL',
] as const;

function requireLongSecret(config: Record<string, unknown>, key: string): void {
  const value = config[key];
  if (typeof value !== 'string' || value.length < 32) {
    throw new Error(`${key} must contain at least 32 characters`);
  }
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  requireLongSecret(config, 'JWT_ACCESS_SECRET');
  requireLongSecret(config, 'JWT_REFRESH_SECRET');

  const port = Number(config.API_PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be a valid TCP port');
  }

  return {
    ...config,
    API_PORT: port,
    NODE_ENV: config.NODE_ENV ?? 'development',
    WEB_URL: config.WEB_URL ?? 'http://localhost:3000',
  };
}
