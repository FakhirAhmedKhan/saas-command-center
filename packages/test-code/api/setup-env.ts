import { config } from 'dotenv';
import { resolve } from 'node:path';

config({
  path: resolve(__dirname, '../../../apps/api/.env.test'),
  override: false,
  quiet: true,
});

process.env.NODE_ENV = 'test';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for E2E tests');
}

let parsedDatabaseUrl: URL;

try {
  parsedDatabaseUrl = new URL(testDatabaseUrl);
} catch {
  throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL');
}

const databaseName = parsedDatabaseUrl.pathname
  .replace(/^\/+/, '')
  .toLowerCase();

if (!databaseName.includes('test')) {
  throw new Error(
    [
      'E2E tests refused to start.',
      'TEST_DATABASE_URL does not look like a test database.',
      `Database: ${databaseName}`,
      `Port: ${parsedDatabaseUrl.port}`,
    ].join(' '),
  );
}

process.env.DATABASE_URL = testDatabaseUrl;

const testRedisUrl = process.env.TEST_REDIS_URL;

if (!testRedisUrl) {
  throw new Error('TEST_REDIS_URL is required for E2E tests');
}

let parsedRedisUrl: URL;

try {
  parsedRedisUrl = new URL(testRedisUrl);
} catch {
  throw new Error('TEST_REDIS_URL must be a valid Redis URL');
}

const redisDatabaseRaw = parsedRedisUrl.pathname.replace(/^\/+/, '');
const redisDatabase = redisDatabaseRaw ? Number(redisDatabaseRaw) : 0;

if (!Number.isInteger(redisDatabase) || redisDatabase <= 0) {
  throw new Error(
    [
      'E2E tests refused to start.',
      'TEST_REDIS_URL must use a dedicated non-zero Redis database.',
      `Redis database: ${redisDatabase}`,
    ].join(' '),
  );
}

process.env.REDIS_URL = testRedisUrl;

process.env.GUIDED_WORKSPACE_BUILDER_ENABLED = 'true';
process.env.ANALYTICS_PROCESSOR_ENABLED = 'false';
process.env.ANALYTICS_ALLOW_ORIGINLESS = 'false';