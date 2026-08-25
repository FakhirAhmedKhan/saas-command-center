import type { TypedConfigService } from '../config/runtime-config';
import { PrismaService } from '../database/prisma.service';
import { Logger, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DATABASE_TIMEOUT_MS = 30_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function assertStartupRequirements(app: INestApplication): Promise<void> {
  const logger = new Logger('StartupChecks');
  const config = app.get<TypedConfigService>(ConfigService);
  const prisma = app.get(PrismaService);
  const nodeEnvironment = config.get('NODE_ENV', {
    infer: true,
  });
  const cookieSecure = config.get('COOKIE_SECURE', {
    infer: true,
  });

  if (nodeEnvironment === 'production' && !cookieSecure) {
    throw new Error('COOKIE_SECURE must be true in production.');
  }

  await withTimeout(
    prisma.$queryRaw`
      SELECT 1
    `,
    DATABASE_TIMEOUT_MS,
    'Database startup check timed out.',
  );

  logger.log('Database startup check passed.');
}
