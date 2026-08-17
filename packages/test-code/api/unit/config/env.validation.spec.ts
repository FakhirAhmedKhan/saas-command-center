import { validateEnvironment } from 'src/config/env.validation';

function baseConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    FRONTEND_URL: 'http://localhost:3000',
    INVITATION_TOKEN_PEPPER: 'c'.repeat(32),
    WEBHOOK_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    REDIS_URL: 'redis://127.0.0.1:6379',
    ...overrides,
  };
}

describe('validateEnvironment — ANALYTICS_IP_HASH_SALT (SEC-03)', () => {
  it('fails startup clearly when missing in production', () => {
    expect(() => validateEnvironment(baseConfig({ NODE_ENV: 'production', COOKIE_SECURE: 'true' }))).toThrow(
      /ANALYTICS_IP_HASH_SALT is required in production/,
    );
  });

  it('fails startup when the configured production value is a placeholder', () => {
    expect(() =>
      validateEnvironment(
        baseConfig({
          NODE_ENV: 'production',
          COOKIE_SECURE: 'true',
          ANALYTICS_IP_HASH_SALT: `replace-with-a-random-secret-${'x'.repeat(10)}`,
        }),
      ),
    ).toThrow(/unsafe production placeholder/);
  });

  it('fails startup when the configured production value is too short', () => {
    expect(() =>
      validateEnvironment(
        baseConfig({
          NODE_ENV: 'production',
          COOKIE_SECURE: 'true',
          ANALYTICS_IP_HASH_SALT: 'too-short',
        }),
      ),
    ).toThrow(/at least 32 characters/);
  });

  it('accepts a strong explicit value in production', () => {
    const salt = 'z'.repeat(40);

    const result = validateEnvironment(
      baseConfig({
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        ANALYTICS_IP_HASH_SALT: salt,
      }),
    );

    expect(result.ANALYTICS_IP_HASH_SALT).toBe(salt);
  });

  it('uses an explicit, clearly-labeled dev-only fallback when unset outside production', () => {
    const result = validateEnvironment(baseConfig({ NODE_ENV: 'development' }));

    expect(result.ANALYTICS_IP_HASH_SALT).toEqual(expect.any(String));

    expect(result.ANALYTICS_IP_HASH_SALT.length).toBeGreaterThan(0);

    expect(result.ANALYTICS_IP_HASH_SALT).toContain('dev-only');
  });

  it('honors an explicitly configured value outside production instead of the fallback', () => {
    const salt = 'y'.repeat(40);

    const result = validateEnvironment(baseConfig({ NODE_ENV: 'development', ANALYTICS_IP_HASH_SALT: salt }));

    expect(result.ANALYTICS_IP_HASH_SALT).toBe(salt);
  });

  it('is deterministic — resolving the same config twice yields the same value', () => {
    const first = validateEnvironment(baseConfig({ NODE_ENV: 'test', TEST_DATABASE_URL: 'postgresql://user:pass@localhost:5432/db_test' }));

    const second = validateEnvironment(baseConfig({ NODE_ENV: 'test', TEST_DATABASE_URL: 'postgresql://user:pass@localhost:5432/db_test' }));

    expect(first.ANALYTICS_IP_HASH_SALT).toBe(second.ANALYTICS_IP_HASH_SALT);
  });
});

describe('validateEnvironment — production placeholder detection (widened for SEC-03)', () => {
  it('rejects the exact "replace-with-..." placeholder pattern used throughout .env.example', () => {
    expect(() =>
      validateEnvironment(
        baseConfig({
          NODE_ENV: 'production',
          COOKIE_SECURE: 'true',
          JWT_ACCESS_SECRET: `replace-with-a-random-access-secret-${'x'.repeat(10)}`,
        }),
      ),
    ).toThrow(/unsafe production placeholder/);
  });
});

describe('validateEnvironment — GitHub App configuration', () => {
  it('is optional: startup succeeds with no GITHUB_APP_* variables set', () => {
    const result = validateEnvironment(baseConfig());

    expect(result.GITHUB_APP_CALLBACK_URL).toBeUndefined();
    expect(result.GITHUB_APP_CLIENT_ID).toBeUndefined();
    expect(result.GITHUB_APP_CLIENT_SECRET).toBeUndefined();
    expect(result.GITHUB_APP_PRIVATE_KEY_BASE64).toBeUndefined();
    expect(result.GITHUB_APP_SLUG).toBeUndefined();
    expect(result.GITHUB_APP_WEBHOOK_SECRET).toBeUndefined();
  });

  it('passes every GITHUB_APP_* variable through to the resolved config unchanged', () => {
    const result = validateEnvironment(
      baseConfig({
        GITHUB_APP_CALLBACK_URL: 'http://localhost:3000/github/callback',
        GITHUB_APP_CLIENT_ID: 'Iv1.example-client-id',
        GITHUB_APP_CLIENT_SECRET: 'example-client-secret',
        GITHUB_APP_PRIVATE_KEY_BASE64: 'ZmFrZS1rZXk=',
        GITHUB_APP_SLUG: 'command-center-dev',
        GITHUB_APP_WEBHOOK_SECRET: 'example-webhook-secret',
      }),
    );

    expect(result.GITHUB_APP_CALLBACK_URL).toBe('http://localhost:3000/github/callback');
    expect(result.GITHUB_APP_CLIENT_ID).toBe('Iv1.example-client-id');
    expect(result.GITHUB_APP_CLIENT_SECRET).toBe('example-client-secret');
    expect(result.GITHUB_APP_PRIVATE_KEY_BASE64).toBe('ZmFrZS1rZXk=');
    expect(result.GITHUB_APP_SLUG).toBe('command-center-dev');
    expect(result.GITHUB_APP_WEBHOOK_SECRET).toBe('example-webhook-secret');
  });

  it('treats a blank GITHUB_APP_* value the same as unset', () => {
    const result = validateEnvironment(baseConfig({ GITHUB_APP_SLUG: '   ' }));

    expect(result.GITHUB_APP_SLUG).toBeUndefined();
  });

  it('never appears in any thrown validation error message, even when other secrets are being validated', () => {
    try {
      validateEnvironment(
        baseConfig({
          NODE_ENV: 'production',
          COOKIE_SECURE: 'true',
          JWT_ACCESS_SECRET: 'too-short',
          GITHUB_APP_CLIENT_SECRET: 'super-secret-github-value-should-not-leak',
          GITHUB_APP_PRIVATE_KEY_BASE64: 'super-secret-private-key-should-not-leak',
        }),
      );

      throw new Error('Expected validateEnvironment to throw for a too-short JWT secret.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      expect(message).not.toContain('super-secret-github-value-should-not-leak');
      expect(message).not.toContain('super-secret-private-key-should-not-leak');
    }
  });
});
