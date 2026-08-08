import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface DatabaseHealthResult {
  status: 'up' | 'down';
  responseTimeMs: number;
}

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<DatabaseHealthResult> {
    const startedAt = process.hrtime.bigint();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'up',
        responseTimeMs: this.calculateDuration(startedAt),
      };
    } catch (error: unknown) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : undefined,
      );

      return {
        status: 'down',
        responseTimeMs: this.calculateDuration(startedAt),
      };
    }
  }

  private calculateDuration(startedAt: bigint): number {
    const durationNanoseconds = process.hrtime.bigint() - startedAt;
    return Math.round(Number(durationNanoseconds) / 1_000_000);
  }
}
