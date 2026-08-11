import type { PublicHealthResponseDto, ReadinessResponseDto } from './dto/health-response.dto';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TypedConfigService } from 'src/config/runtime-config';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,

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
    const startedAt = performance.now();

    try {
      await this.prisma.$queryRaw`
          SELECT 1
        `;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable.');
    }

    const responseTimeMs = Math.max(0, Math.round(performance.now() - startedAt));

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
        responseTimeMs,
      },
    };
  }
}
