import type { PublicHealthResponseDto, ReadinessResponseDto } from './dto/health-response.dto';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TypedConfigService } from 'src/config/runtime-config';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  getPublicHealth(): PublicHealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResponseDto> {
    const databaseStartedAt = performance.now();

    try {
      await this.prisma.$queryRaw`
        SELECT 1
      `;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable.');
    }

    const databaseResponseTimeMs = Math.max(0, Math.round(performance.now() - databaseStartedAt));
    const redisStartedAt = performance.now();

    try {
      const result = await this.redis.getClient().ping();

      if (result !== 'PONG') {
        throw new Error('Unexpected Redis response.');
      }
    } catch {
      throw new ServiceUnavailableException('Redis is unavailable.');
    }

    const redisResponseTimeMs = Math.max(0, Math.round(performance.now() - redisStartedAt));

    return {
      status: 'ready',
      service: 'command-center-api',
      version: this.config.get('APP_VERSION', {
        infer: true,
      }),

      environment: this.config.get('NODE_ENV', {
        infer: true,
      }),

      timestamp: new Date().toISOString(),
      database: {
        status: 'up',
        responseTimeMs: databaseResponseTimeMs,
      },

      redis: {
        status: 'up',
        responseTimeMs: redisResponseTimeMs,
      },
    };
  }
}
