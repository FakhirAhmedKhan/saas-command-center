import { Logger, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assertStartupRequirements, DATABASE_TIMEOUT_MS } from 'src/bootstrap/startup-checks';
import { PrismaService } from 'src/database/prisma.service';

interface AppOptions {
  nodeEnvironment?: string;
  cookieSecure?: boolean;
  queryRaw?: jest.Mock;
}

function createApp({ nodeEnvironment = 'test', cookieSecure = true, queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]) }: AppOptions = {}): {
  app: INestApplication;
  queryRaw: jest.Mock;
} {
  const config = {
    get: (key: string) => (key === 'NODE_ENV' ? nodeEnvironment : cookieSecure),
  };
  const prisma = {
    $queryRaw: queryRaw,
  };
  const app = {
    get: (token: unknown) => {
      if (token === ConfigService) {
        return config;
      }

      if (token === PrismaService) {
        return prisma;
      }

      throw new Error('Unexpected token requested from the test app.');
    },
  } as unknown as INestApplication;

  return { app, queryRaw };
}

describe('assertStartupRequirements', () => {
  let infoLogger: jest.SpyInstance;

  beforeEach(() => {
    infoLogger = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();

    jest.useRealTimers();
  });

  it('resolves when the database responds and config is valid', async () => {
    const { app, queryRaw } = createApp();

    await expect(assertStartupRequirements(app)).resolves.toBeUndefined();

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('logs once the database check passes', async () => {
    const { app } = createApp();

    await assertStartupRequirements(app);

    expect(infoLogger).toHaveBeenCalledWith('Database startup check passed.');
  });

  it('rejects when production runs without secure cookies', async () => {
    const { app } = createApp({
      nodeEnvironment: 'production',
      cookieSecure: false,
    });

    await expect(assertStartupRequirements(app)).rejects.toThrow('COOKIE_SECURE must be true in production.');
  });

  it('allows production when secure cookies are enabled', async () => {
    const { app } = createApp({
      nodeEnvironment: 'production',
      cookieSecure: true,
    });

    await expect(assertStartupRequirements(app)).resolves.toBeUndefined();
  });

  it('does not query the database when the cookie check fails', async () => {
    const { app, queryRaw } = createApp({
      nodeEnvironment: 'production',
      cookieSecure: false,
    });

    await expect(assertStartupRequirements(app)).rejects.toThrow();

    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('propagates a database connection failure', async () => {
    const { app } = createApp({
      queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    });

    await expect(assertStartupRequirements(app)).rejects.toThrow('connection refused');
  });

  it('times out when the database never responds', async () => {
    jest.useFakeTimers();

    const { app } = createApp({
      queryRaw: jest.fn().mockReturnValue(new Promise(() => undefined)),
    });
    const assertion = expect(assertStartupRequirements(app)).rejects.toThrow('Database startup check timed out.');

    await jest.advanceTimersByTimeAsync(DATABASE_TIMEOUT_MS);

    await assertion;
  });
});
