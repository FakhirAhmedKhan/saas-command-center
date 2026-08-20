import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

/*
 * PostgresAdvisoryLockService needs a real Postgres connection — advisory
 * locks are a server-side primitive backed by session state and cannot be
 * meaningfully mocked. This file lives under the `unit` tree (per
 * jest.config.cjs's testMatch) but, like several other "unit" specs in this
 * repo that touch real infra, it loads the same apps/api/.env.test file the
 * e2e suite's setup-env.ts uses so DATABASE_URL points at the test database
 * before anything connects.
 */
loadEnv({
  path: resolve(__dirname, '../../../../../../apps/api/.env.test'),
  override: true,
  quiet: true,
});

import { PostgresAdvisoryLockService } from 'src/infrastructure/database/postgres-advisory-lock.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T = void>(): Deferred<T> {
  let resolveFn!: (value: T) => void;

  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });

  return { promise, resolve: resolveFn };
}

function createLockService(): PostgresAdvisoryLockService {
  const config = new ConfigService({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  return new PostgresAdvisoryLockService(config as never);
}

describe(PostgresAdvisoryLockService.name, () => {
  let service: PostgresAdvisoryLockService;

  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for PostgresAdvisoryLockService tests');
    }

    service = createLockService();
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  it('acquires the lock for a single caller and runs its callback', async () => {
    const lockKey = `test-lock:${randomUUID()}`;

    const result = await service.withLock(lockKey, async () => 'callback-ran');

    expect(result.acquired).toBe(true);
    expect(result.value).toBe('callback-ran');
  });

  it('does not let a second concurrent caller acquire the same lock key (non-blocking pg_try_advisory_lock)', async () => {
    const lockKey = `test-lock:${randomUUID()}`;

    const firstStarted = createDeferred<void>();
    const firstCanFinish = createDeferred<void>();

    const firstCall = service.withLock(lockKey, async () => {
      firstStarted.resolve();
      await firstCanFinish.promise;
      return 'first';
    });

    // Wait until the first caller is confirmed to be holding the lock inside its callback.
    await firstStarted.promise;

    // A second, independent connection racing for the same key must be told immediately
    // that the lock was not acquired — pg_try_advisory_lock does not block/wait.
    const secondResult = await service.withLock(lockKey, async () => 'second-should-not-run');

    expect(secondResult.acquired).toBe(false);
    expect(secondResult.value).toBeUndefined();

    firstCanFinish.resolve();

    const firstResult = await firstCall;

    expect(firstResult.acquired).toBe(true);
    expect(firstResult.value).toBe('first');
  });

  it('releases the lock after the callback completes successfully, allowing a later acquire to succeed', async () => {
    const lockKey = `test-lock:${randomUUID()}`;

    const firstResult = await service.withLock(lockKey, async () => 'done');

    expect(firstResult.acquired).toBe(true);

    const secondResult = await service.withLock(lockKey, async () => 'done-again');

    expect(secondResult.acquired).toBe(true);
    expect(secondResult.value).toBe('done-again');
  });

  it('releases the lock even when the callback throws, allowing a later acquire to succeed', async () => {
    const lockKey = `test-lock:${randomUUID()}`;

    await expect(
      service.withLock(lockKey, async () => {
        throw new Error('callback boom');
      }),
    ).rejects.toThrow('callback boom');

    // If the lock were not released in the finally branch, this would hang forever
    // waiting on pg_try_advisory_lock — but pg_try_advisory_lock never blocks, so a
    // leaked lock would instead surface here as `acquired: false`.
    const secondResult = await service.withLock(lockKey, async () => 'recovered');

    expect(secondResult.acquired).toBe(true);
    expect(secondResult.value).toBe('recovered');
  });

  it('does not let two different lock keys contend with each other', async () => {
    const lockKeyA = `test-lock:${randomUUID()}`;
    const lockKeyB = `test-lock:${randomUUID()}`;

    const aStarted = createDeferred<void>();
    const aCanFinish = createDeferred<void>();
    const bStarted = createDeferred<void>();
    const bCanFinish = createDeferred<void>();

    const callA = service.withLock(lockKeyA, async () => {
      aStarted.resolve();
      await aCanFinish.promise;
      return 'a';
    });

    const callB = service.withLock(lockKeyB, async () => {
      bStarted.resolve();
      await bCanFinish.promise;
      return 'b';
    });

    // Both callbacks must be able to start concurrently — neither key blocks the other.
    await Promise.all([aStarted.promise, bStarted.promise]);

    aCanFinish.resolve();
    bCanFinish.resolve();

    const [resultA, resultB] = await Promise.all([callA, callB]);

    expect(resultA).toEqual({ acquired: true, value: 'a' });
    expect(resultB).toEqual({ acquired: true, value: 'b' });
  });
});
