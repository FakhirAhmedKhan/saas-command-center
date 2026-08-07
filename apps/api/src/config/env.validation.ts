export type NodeEnvironment =
  | 'development'
  | 'test'
  | 'production';

export type CookieSameSite =
  | 'lax'
  | 'strict'
  | 'none';

export interface EnvironmentVariables {
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
}

function getOptionalString(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0
    ? normalizedValue
    : undefined;
}

function getRequiredString(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = getOptionalString(
    config,
    key,
  );

  if (!value) {
    throw new Error(
      `Environment variable ${key} is required.`,
    );
  }

  return value;
}

function getBoolean(
  config: Record<string, unknown>,
  key: string,
  defaultValue: boolean,
): boolean {
  const value = getOptionalString(
    config,
    key,
  );

  if (value === undefined) {
    return defaultValue;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(
    `Environment variable ${key} must be "true" or "false".`,
  );
}

function getPositiveInteger(
  config: Record<string, unknown>,
  key: string,
  defaultValue: number,
): number {
  const value = getOptionalString(
    config,
    key,
  );

  if (value === undefined) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    throw new Error(
      `Environment variable ${key} must be a positive integer.`,
    );
  }

  return parsedValue;
}

function parseNodeEnvironment(
  value: string | undefined,
): NodeEnvironment {
  const environment =
    value ?? 'development';

  if (
    environment === 'development' ||
    environment === 'test' ||
    environment === 'production'
  ) {
    return environment;
  }

  throw new Error(
    'NODE_ENV must be development, test, or production.',
  );
}

function parseCookieSameSite(
  value: string | undefined,
): CookieSameSite {
  const sameSite =
    value ?? 'lax';

  if (
    sameSite === 'lax' ||
    sameSite === 'strict' ||
    sameSite === 'none'
  ) {
    return sameSite;
  }

  throw new Error(
    'COOKIE_SAME_SITE must be lax, strict, or none.',
  );
}

function validateUrl(
  key: string,
  value: string,
  allowedProtocols: string[],
): void {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(
      `${key} must be a valid URL.`,
    );
  }

  if (
    !allowedProtocols.includes(
      parsedUrl.protocol,
    )
  ) {
    throw new Error(
      `${key} must use ${allowedProtocols.join(
        ' or ',
      )}.`,
    );
  }
}

function validateSecret(
  key: string,
  value: string,
  environment: NodeEnvironment,
): void {
  if (value.length < 32) {
    throw new Error(
      `${key} must contain at least 32 characters.`,
    );
  }

  if (
    environment === 'production' &&
    /change-me|replace-me|default|secret123|password123/i.test(
      value,
    )
  ) {
    throw new Error(
      `${key} contains an unsafe production placeholder.`,
    );
  }
}

function validateCorsOrigins(
  value: string,
): void {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error(
      'CORS_ORIGINS must contain at least one origin.',
    );
  }

  for (const origin of origins) {
    validateUrl(
      'CORS_ORIGINS',
      origin,
      ['http:', 'https:'],
    );
  }
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const nodeEnvironment =
    parseNodeEnvironment(
      getOptionalString(
        config,
        'NODE_ENV',
      ),
    );

  const databaseUrl =
    getRequiredString(
      config,
      'DATABASE_URL',
    );

  const testDatabaseUrl =
    getOptionalString(
      config,
      'TEST_DATABASE_URL',
    );

  const jwtAccessSecret =
    getRequiredString(
      config,
      'JWT_ACCESS_SECRET',
    );

  const jwtRefreshSecret =
    getRequiredString(
      config,
      'JWT_REFRESH_SECRET',
    );

  const frontendUrl =
    getRequiredString(
      config,
      'FRONTEND_URL',
    );

  const corsOrigins =
    getOptionalString(
      config,
      'CORS_ORIGINS',
    ) ?? frontendUrl;

  const cookieSameSite =
    parseCookieSameSite(
      getOptionalString(
        config,
        'COOKIE_SAME_SITE',
      ),
    );

  const cookieSecure =
    getBoolean(
      config,
      'COOKIE_SECURE',
      nodeEnvironment === 'production',
    );

  validateUrl(
    'DATABASE_URL',
    databaseUrl,
    [
      'postgres:',
      'postgresql:',
    ],
  );

  if (testDatabaseUrl) {
    validateUrl(
      'TEST_DATABASE_URL',
      testDatabaseUrl,
      [
        'postgres:',
        'postgresql:',
      ],
    );
  }

  validateUrl(
    'FRONTEND_URL',
    frontendUrl,
    [
      'http:',
      'https:',
    ],
  );

  validateCorsOrigins(
    corsOrigins,
  );

  validateSecret(
    'JWT_ACCESS_SECRET',
    jwtAccessSecret,
    nodeEnvironment,
  );

  validateSecret(
    'JWT_REFRESH_SECRET',
    jwtRefreshSecret,
    nodeEnvironment,
  );

  if (
    nodeEnvironment === 'test' &&
    !testDatabaseUrl
  ) {
    throw new Error(
      'TEST_DATABASE_URL is required when NODE_ENV=test.',
    );
  }

  if (
    cookieSameSite === 'none' &&
    !cookieSecure
  ) {
    throw new Error(
      'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.',
    );
  }

  if (
    nodeEnvironment === 'production' &&
    !cookieSecure
  ) {
    throw new Error(
      'COOKIE_SECURE must be true in production.',
    );
  }

  return {
    NODE_ENV: nodeEnvironment,

    PORT: getPositiveInteger(
      config,
      'PORT',
      4000,
    ),

    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL:
      testDatabaseUrl,

    JWT_ACCESS_SECRET:
      jwtAccessSecret,

    JWT_REFRESH_SECRET:
      jwtRefreshSecret,

    FRONTEND_URL:
      frontendUrl,

    CORS_ORIGINS:
      corsOrigins,

    TRUST_PROXY:
      getOptionalString(
        config,
        'TRUST_PROXY',
      ) ?? 'false',

    COOKIE_NAME:
      getOptionalString(
        config,
        'COOKIE_NAME',
      ) ??
      'command_center_refresh_token',

    COOKIE_DOMAIN:
      getOptionalString(
        config,
        'COOKIE_DOMAIN',
      ),

    COOKIE_SECURE:
      cookieSecure,

    COOKIE_SAME_SITE:
      cookieSameSite,

    COOKIE_MAX_AGE_MS:
      getPositiveInteger(
        config,
        'COOKIE_MAX_AGE_MS',
        30 * 24 * 60 * 60 * 1000,
      ),

    BODY_LIMIT:
      getOptionalString(
        config,
        'BODY_LIMIT',
      ) ?? '1mb',

    SWAGGER_ENABLED:
      getBoolean(
        config,
        'SWAGGER_ENABLED',
        nodeEnvironment !== 'production',
      ),

    APP_VERSION:
      getOptionalString(
        config,
        'APP_VERSION',
      ) ?? '0.1.0',
  };
}