const { config } = require('dotenv');
const path = require('node:path');

config({
  path: path.resolve(__dirname, '.env.test'),
  override: false,
  quiet: true,
});

process.env.NODE_ENV = 'test';

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for E2E tests');
}

const database = new URL(databaseUrl);
const databaseName = database.pathname.replace(/^\/+/, '').toLowerCase();

if (!databaseName.includes('test')) {
  throw new Error(`Refusing to use non-test database "${databaseName}".`);
}

process.env.DATABASE_URL = databaseUrl;

const redisUrl = process.env.TEST_REDIS_URL;

if (!redisUrl) {
  throw new Error('TEST_REDIS_URL is required for E2E tests');
}

const redis = new URL(redisUrl);
const redisDatabase = Number(redis.pathname.replace(/^\/+/, ''));

if (!Number.isInteger(redisDatabase) || redisDatabase <= 0) {
  throw new Error('TEST_REDIS_URL must use a dedicated non-zero Redis database.');
}

process.env.REDIS_URL = redisUrl;
process.env.GUIDED_WORKSPACE_BUILDER_ENABLED = 'true';
process.env.ANALYTICS_PROCESSOR_ENABLED = 'false';
process.env.ANALYTICS_ALLOW_ORIGINLESS = 'false';
