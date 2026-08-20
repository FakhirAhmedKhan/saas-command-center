import { RedisService } from 'src/infrastructure/redis/redis.service';

export async function resetTestRedis(redis: RedisService): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Refusing to reset Redis outside the test environment.');
  }

  const testRedisUrl = process.env.TEST_REDIS_URL;

  if (!testRedisUrl) {
    throw new Error('TEST_REDIS_URL is required before resetting test Redis.');
  }

  const parsedRedisUrl = new URL(testRedisUrl);
  const databaseRaw = parsedRedisUrl.pathname.replace(/^\//, '');
  const expectedDatabase = databaseRaw ? Number(databaseRaw) : 0;

  const client = redis.getClient();
  const actualDatabase = client.options.db ?? 0;

  if (!Number.isInteger(expectedDatabase) || expectedDatabase <= 0 || actualDatabase !== expectedDatabase) {
    throw new Error(`Refusing to reset Redis. Expected safe test DB ${expectedDatabase}, connected to DB ${actualDatabase}.`);
  }

  await client.flushdb();
}
