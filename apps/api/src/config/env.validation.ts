import { createPrivateKey } from 'node:crypto';

export type NodeEnvironment = 'development' | 'test' | 'production';

export type CookieSameSite = 'lax' | 'strict' | 'none';

export interface EnvironmentVariables {
  GITHUB_APP_CALLBACK_URL?: string;
  GITHUB_APP_CLIENT_ID?: string;
  GITHUB_APP_CLIENT_SECRET?: string;
  GITHUB_APP_PRIVATE_KEY_BASE64?: string;
  GITHUB_APP_SLUG?: string;
  GITHUB_APP_WEBHOOK_SECRET?: string;
  REDIS_URL: string;

  ANALYTICS_WORKER_ENABLED: boolean;
  ANALYTICS_WORKER_INTERVAL_MS: number;
  ANALYTICS_SCHEDULER_ENABLED: boolean;

  ANALYTICS_MAX_RETRIES: number;
  ANALYTICS_REPROCESS_MAX_DAYS: number;
  ANALYTICS_PROCESSING_TIMEOUT_MS: number;

  ANALYTICS_INGESTION_LIMIT: number;
  ANALYTICS_INGESTION_WINDOW_SECONDS: number;
  ANALYTICS_IP_HASH_SALT: string;
  NODE_ENV: NodeEnvironment;
  PORT: number;

  DATABASE_URL: string;
  TEST_DATABASE_URL?: string;

  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;

  FRONTEND_URL: string;
  CORS_ORIGINS: string;

  TRUST_PROXY: string;

  COOKIE_NAME: string;
  COOKIE_DOMAIN?: string;
  COOKIE_SECURE: boolean;
  COOKIE_SAME_SITE: CookieSameSite;
  COOKIE_MAX_AGE_MS: number;

  BODY_LIMIT: string;
  SWAGGER_ENABLED: boolean;
  APP_VERSION: string;

  HEALTH_MONITOR_ENABLED: boolean;

  HEALTH_MONITOR_BATCH_SIZE: number;
  HEALTH_MONITOR_CONCURRENCY: number;

  HEALTH_MIN_INTERVAL_SECONDS: number;
  HEALTH_MAX_INTERVAL_SECONDS: number;

  HEALTH_MIN_TIMEOUT_MS: number;
  HEALTH_MAX_TIMEOUT_MS: number;

  HEALTH_HISTORY_RETENTION_DAYS: number;
  HEALTH_DEFAULT_FAILURE_THRESHOLD: number;
  INVITATION_TOKEN_PEPPER: string;
  INVITATION_TTL_HOURS: number;

  INVITATION_EMAIL_ENABLED: boolean;

  NOTIFICATION_RETENTION_DAYS: number;
  NOTIFICATION_CLEANUP_ENABLED: boolean;
  WEBHOOK_ENCRYPTION_KEY: string;

  WEBHOOK_WORKER_ENABLED: boolean;
  WEBHOOK_WORKER_BATCH_SIZE: number;
  WEBHOOK_WORKER_CONCURRENCY: number;
  WEBHOOK_PROCESSING_TIMEOUT_MS: number;

  WEBHOOK_DEFAULT_TIMEOUT_MS: number;
  WEBHOOK_MAX_TIMEOUT_MS: number;

  WEBHOOK_DEFAULT_MAX_ATTEMPTS: number;
  WEBHOOK_MAX_ATTEMPTS: number;

  WEBHOOK_RETENTION_DAYS: number;
  WEBHOOK_CLEANUP_ENABLED: boolean;

  GITHUB_CONNECT_INTENT_CLEANUP_ENABLED: boolean;
}
function getOptionalString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function getRequiredString(config: Record<string, unknown>, key: string): string {
  const value = getOptionalString(config, key);

  if (!value) {
    throw new Error(`Environment variable ${key} is required.`);
  }

  return value;
}

function getBoolean(config: Record<string, unknown>, key: string, defaultValue: boolean): boolean {
  const value = getOptionalString(config, key);

  if (value === undefined) {
    return defaultValue;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${key} must be "true" or "false".`);
}

function getPositiveInteger(config: Record<string, unknown>, key: string, defaultValue: number): number {
  const value = getOptionalString(config, key);

  if (value === undefined) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer.`);
  }

  return parsedValue;
}

function parseNodeEnvironment(value: string | undefined): NodeEnvironment {
  const environment = value ?? 'development';

  if (environment === 'development' || environment === 'test' || environment === 'production') {
    return environment;
  }

  throw new Error('NODE_ENV must be development, test, or production.');
}
function parseCookieSameSite(value: string | undefined): CookieSameSite {
  const sameSite = value ?? 'lax';

  if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
    return sameSite;
  }

  throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
}

function validateUrl(key: string, value: string, allowedProtocols: string[]): void {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    throw new Error(`${key} must use ${allowedProtocols.join(' or ')}.`);
  }
}

function validateSecret(key: string, value: string, environment: NodeEnvironment): void {
  if (value.length < 32) {
    throw new Error(`${key} must contain at least 32 characters.`);
  }

  if (environment === 'production' && /change-me|change-this|replace-me|replace-with|default|secret123|password123/i.test(value)) {
    throw new Error(`${key} contains an unsafe production placeholder.`);
  }
}

/*
 * Only ever used when NODE_ENV is not "production" and no explicit salt was
 * configured. Deliberately unusable as a real secret (short, obviously
 * labeled) so it cannot be mistaken for a production-safe value and cannot
 * satisfy validateSecret's own length check if someone copies it forward.
 */
const DEV_ONLY_ANALYTICS_IP_HASH_SALT = 'dev-only-analytics-ip-hash-salt';

function resolveAnalyticsIpHashSalt(config: Record<string, unknown>, environment: NodeEnvironment): string {
  const configuredValue = getOptionalString(config, 'ANALYTICS_IP_HASH_SALT');

  if (environment === 'production') {
    if (!configuredValue) {
      throw new Error('Environment variable ANALYTICS_IP_HASH_SALT is required in production.');
    }

    validateSecret('ANALYTICS_IP_HASH_SALT', configuredValue, environment);

    return configuredValue;
  }

  if (configuredValue) {
    validateSecret('ANALYTICS_IP_HASH_SALT', configuredValue, environment);

    return configuredValue;
  }

  return DEV_ONLY_ANALYTICS_IP_HASH_SALT;
}

function validateProductionGithubConfiguration(config: Record<string, unknown>, environment: NodeEnvironment, frontendUrl: string): void {
  if (environment !== 'production') {
    return;
  }

  const githubAppSlug = getRequiredString(config, 'GITHUB_APP_SLUG');
  const githubClientId = getRequiredString(config, 'GITHUB_APP_CLIENT_ID');
  const githubClientSecret = getRequiredString(config, 'GITHUB_APP_CLIENT_SECRET');
  const githubCallbackUrl = getRequiredString(config, 'GITHUB_APP_CALLBACK_URL');
  const githubWebhookSecret = getRequiredString(config, 'GITHUB_APP_WEBHOOK_SECRET');
  const githubPrivateKeyBase64 = getRequiredString(config, 'GITHUB_APP_PRIVATE_KEY_BASE64');

  // Keep these reads explicit so missing/blank values always fail startup.
  void githubAppSlug;
  void githubClientId;

  validateSecret('GITHUB_APP_CLIENT_SECRET', githubClientSecret, environment);
  validateSecret('GITHUB_APP_WEBHOOK_SECRET', githubWebhookSecret, environment);

  validateUrl('GITHUB_APP_CALLBACK_URL', githubCallbackUrl, ['https:']);

  const frontend = new URL(frontendUrl);
  const callback = new URL(githubCallbackUrl);

  if (frontend.origin !== callback.origin) {
    throw new Error('GITHUB_APP_CALLBACK_URL must use the same origin as FRONTEND_URL in production.');
  }

  let privateKey: string;

  try {
    privateKey = Buffer.from(githubPrivateKeyBase64, 'base64').toString('utf8');

    if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
      throw new Error('Invalid private key.');
    }

    createPrivateKey(privateKey);
  } catch {
    throw new Error('GITHUB_APP_PRIVATE_KEY_BASE64 must contain a valid Base64-encoded private key in production.');
  }
}

function validateCorsOrigins(value: string): void {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin.');
  }

  for (const origin of origins) {
    validateUrl('CORS_ORIGINS', origin, ['http:', 'https:']);
  }
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const nodeEnvironment = parseNodeEnvironment(getOptionalString(config, 'NODE_ENV'));
  const databaseUrl = getRequiredString(config, 'DATABASE_URL');
  const testDatabaseUrl = getOptionalString(config, 'TEST_DATABASE_URL');
  const jwtAccessSecret = getRequiredString(config, 'JWT_ACCESS_SECRET');
  const jwtRefreshSecret = getRequiredString(config, 'JWT_REFRESH_SECRET');
  const frontendUrl = getRequiredString(config, 'FRONTEND_URL');
  const invitationTokenPepper = getRequiredString(config, 'INVITATION_TOKEN_PEPPER');

  validateSecret('INVITATION_TOKEN_PEPPER', invitationTokenPepper, nodeEnvironment);

  const webhookEncryptionKey = getRequiredString(config, 'WEBHOOK_ENCRYPTION_KEY');
  let decodedWebhookKey: Buffer;

  try {
    decodedWebhookKey = Buffer.from(webhookEncryptionKey, 'base64');
  } catch {
    throw new Error('WEBHOOK_ENCRYPTION_KEY must be valid base64.');
  }

  if (decodedWebhookKey.length !== 32) {
    throw new Error('WEBHOOK_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  }

  const webhookDefaultTimeoutMs = getPositiveInteger(config, 'WEBHOOK_DEFAULT_TIMEOUT_MS', 10_000);
  const webhookMaxTimeoutMs = getPositiveInteger(config, 'WEBHOOK_MAX_TIMEOUT_MS', 30_000);

  if (webhookDefaultTimeoutMs > webhookMaxTimeoutMs) {
    throw new Error('WEBHOOK_DEFAULT_TIMEOUT_MS cannot exceed WEBHOOK_MAX_TIMEOUT_MS.');
  }

  const webhookDefaultMaxAttempts = getPositiveInteger(config, 'WEBHOOK_DEFAULT_MAX_ATTEMPTS', 5);
  const webhookMaxAttempts = getPositiveInteger(config, 'WEBHOOK_MAX_ATTEMPTS', 8);

  if (webhookDefaultMaxAttempts > webhookMaxAttempts) {
    throw new Error('WEBHOOK_DEFAULT_MAX_ATTEMPTS cannot exceed WEBHOOK_MAX_ATTEMPTS.');
  }
  const minimumInterval = getPositiveInteger(config, 'HEALTH_MIN_INTERVAL_SECONDS', 60);
  const maximumInterval = getPositiveInteger(config, 'HEALTH_MAX_INTERVAL_SECONDS', 86_400);

  if (maximumInterval < minimumInterval) {
    throw new Error('HEALTH_MAX_INTERVAL_SECONDS must be greater than or equal to HEALTH_MIN_INTERVAL_SECONDS.');
  }

  const minimumTimeout = getPositiveInteger(config, 'HEALTH_MIN_TIMEOUT_MS', 1_000);
  const maximumTimeout = getPositiveInteger(config, 'HEALTH_MAX_TIMEOUT_MS', 30_000);

  if (maximumTimeout < minimumTimeout) {
    throw new Error('HEALTH_MAX_TIMEOUT_MS must be greater than or equal to HEALTH_MIN_TIMEOUT_MS.');
  }
  const corsOrigins = getOptionalString(config, 'CORS_ORIGINS') ?? frontendUrl;
  const cookieSameSite = parseCookieSameSite(getOptionalString(config, 'COOKIE_SAME_SITE'));
  const cookieSecure = getBoolean(config, 'COOKIE_SECURE', nodeEnvironment === 'production');

  validateUrl('DATABASE_URL', databaseUrl, ['postgres:', 'postgresql:']);

  if (testDatabaseUrl) {
    validateUrl('TEST_DATABASE_URL', testDatabaseUrl, ['postgres:', 'postgresql:']);
  }

  validateUrl('FRONTEND_URL', frontendUrl, ['http:', 'https:']);

  validateProductionGithubConfiguration(config, nodeEnvironment, frontendUrl);

  validateCorsOrigins(corsOrigins);

  validateSecret('JWT_ACCESS_SECRET', jwtAccessSecret, nodeEnvironment);

  validateSecret('JWT_REFRESH_SECRET', jwtRefreshSecret, nodeEnvironment);

  if (nodeEnvironment === 'test' && !testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is required when NODE_ENV=test.');
  }

  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.');
  }

  if (nodeEnvironment === 'production' && !cookieSecure) {
    throw new Error('COOKIE_SECURE must be true in production.');
  }

  return {
    GITHUB_APP_CALLBACK_URL: getOptionalString(config, 'GITHUB_APP_CALLBACK_URL'),
    GITHUB_APP_CLIENT_ID: getOptionalString(config, 'GITHUB_APP_CLIENT_ID'),
    GITHUB_APP_CLIENT_SECRET: getOptionalString(config, 'GITHUB_APP_CLIENT_SECRET'),
    GITHUB_APP_PRIVATE_KEY_BASE64: getOptionalString(config, 'GITHUB_APP_PRIVATE_KEY_BASE64'),
    GITHUB_APP_SLUG: getOptionalString(config, 'GITHUB_APP_SLUG'),
    GITHUB_APP_WEBHOOK_SECRET: getOptionalString(config, 'GITHUB_APP_WEBHOOK_SECRET'),
    WEBHOOK_ENCRYPTION_KEY: webhookEncryptionKey,
    WEBHOOK_WORKER_ENABLED: getBoolean(config, 'WEBHOOK_WORKER_ENABLED', true),
    WEBHOOK_WORKER_BATCH_SIZE: getPositiveInteger(config, 'WEBHOOK_WORKER_BATCH_SIZE', 20),
    WEBHOOK_WORKER_CONCURRENCY: getPositiveInteger(config, 'WEBHOOK_WORKER_CONCURRENCY', 5),
    WEBHOOK_PROCESSING_TIMEOUT_MS: getPositiveInteger(config, 'WEBHOOK_PROCESSING_TIMEOUT_MS', 120_000),
    WEBHOOK_DEFAULT_TIMEOUT_MS: webhookDefaultTimeoutMs,
    WEBHOOK_MAX_TIMEOUT_MS: webhookMaxTimeoutMs,
    WEBHOOK_DEFAULT_MAX_ATTEMPTS: webhookDefaultMaxAttempts,
    WEBHOOK_MAX_ATTEMPTS: webhookMaxAttempts,
    WEBHOOK_RETENTION_DAYS: getPositiveInteger(config, 'WEBHOOK_RETENTION_DAYS', 90),
    WEBHOOK_CLEANUP_ENABLED: getBoolean(config, 'WEBHOOK_CLEANUP_ENABLED', true),
    GITHUB_CONNECT_INTENT_CLEANUP_ENABLED: getBoolean(config, 'GITHUB_CONNECT_INTENT_CLEANUP_ENABLED', true),
    INVITATION_TOKEN_PEPPER: invitationTokenPepper,
    INVITATION_TTL_HOURS: getPositiveInteger(config, 'INVITATION_TTL_HOURS', 72),
    INVITATION_EMAIL_ENABLED: getBoolean(config, 'INVITATION_EMAIL_ENABLED', false),
    NOTIFICATION_RETENTION_DAYS: getPositiveInteger(config, 'NOTIFICATION_RETENTION_DAYS', 90),
    NOTIFICATION_CLEANUP_ENABLED: getBoolean(config, 'NOTIFICATION_CLEANUP_ENABLED', true),
    HEALTH_MONITOR_ENABLED: getBoolean(config, 'HEALTH_MONITOR_ENABLED', true),
    HEALTH_MONITOR_BATCH_SIZE: getPositiveInteger(config, 'HEALTH_MONITOR_BATCH_SIZE', 20),
    HEALTH_MONITOR_CONCURRENCY: getPositiveInteger(config, 'HEALTH_MONITOR_CONCURRENCY', 5),
    HEALTH_MIN_INTERVAL_SECONDS: getPositiveInteger(config, 'HEALTH_MIN_INTERVAL_SECONDS', 60),
    HEALTH_MAX_INTERVAL_SECONDS: getPositiveInteger(config, 'HEALTH_MAX_INTERVAL_SECONDS', 86_400),
    HEALTH_MIN_TIMEOUT_MS: getPositiveInteger(config, 'HEALTH_MIN_TIMEOUT_MS', 1_000),
    HEALTH_MAX_TIMEOUT_MS: getPositiveInteger(config, 'HEALTH_MAX_TIMEOUT_MS', 30_000),
    HEALTH_HISTORY_RETENTION_DAYS: getPositiveInteger(config, 'HEALTH_HISTORY_RETENTION_DAYS', 30),
    HEALTH_DEFAULT_FAILURE_THRESHOLD: getPositiveInteger(config, 'HEALTH_DEFAULT_FAILURE_THRESHOLD', 3),
    REDIS_URL: getRequiredString(config, 'REDIS_URL'),
    ANALYTICS_WORKER_ENABLED: getBoolean(config, 'ANALYTICS_WORKER_ENABLED', true),
    ANALYTICS_WORKER_INTERVAL_MS: getPositiveInteger(config, 'ANALYTICS_WORKER_INTERVAL_MS', 5_000),
    ANALYTICS_SCHEDULER_ENABLED: getBoolean(config, 'ANALYTICS_SCHEDULER_ENABLED', true),
    ANALYTICS_MAX_RETRIES: getPositiveInteger(config, 'ANALYTICS_MAX_RETRIES', 3),
    ANALYTICS_REPROCESS_MAX_DAYS: getPositiveInteger(config, 'ANALYTICS_REPROCESS_MAX_DAYS', 31),
    ANALYTICS_PROCESSING_TIMEOUT_MS: getPositiveInteger(config, 'ANALYTICS_PROCESSING_TIMEOUT_MS', 120_000),
    ANALYTICS_INGESTION_LIMIT: getPositiveInteger(config, 'ANALYTICS_INGESTION_LIMIT', 120),
    ANALYTICS_INGESTION_WINDOW_SECONDS: getPositiveInteger(config, 'ANALYTICS_INGESTION_WINDOW_SECONDS', 60),
    ANALYTICS_IP_HASH_SALT: resolveAnalyticsIpHashSalt(config, nodeEnvironment),
    NODE_ENV: nodeEnvironment,
    PORT: getPositiveInteger(config, 'PORT', 4000),
    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    FRONTEND_URL: frontendUrl,
    CORS_ORIGINS: corsOrigins,
    TRUST_PROXY: getOptionalString(config, 'TRUST_PROXY') ?? 'false',
    COOKIE_NAME: getOptionalString(config, 'COOKIE_NAME') ?? 'command_center_refresh_token',
    COOKIE_DOMAIN: getOptionalString(config, 'COOKIE_DOMAIN'),
    COOKIE_SECURE: cookieSecure,
    COOKIE_SAME_SITE: cookieSameSite,
    COOKIE_MAX_AGE_MS: getPositiveInteger(config, 'COOKIE_MAX_AGE_MS', 30 * 24 * 60 * 60 * 1000),
    BODY_LIMIT: getOptionalString(config, 'BODY_LIMIT') ?? '1mb',
    SWAGGER_ENABLED: getBoolean(config, 'SWAGGER_ENABLED', nodeEnvironment !== 'production'),
    APP_VERSION: getOptionalString(config, 'APP_VERSION') ?? '0.1.0',
  };
}
