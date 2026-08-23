import { PrismaService } from '../../../database/prisma.service';
import { Injectable } from '@nestjs/common';
import type { MobilePlatform } from 'src/generated/prisma/enums';

export type MobilePerformanceMetric =
  | 'CRASH_RATE'
  | 'API_FAILURE_RATE'
  | 'CRASH_FREE_USERS_RATE'
  | 'CRASH_COUNT'
  | 'ANR_COUNT'
  | 'HANG_COUNT'
  | 'COLD_STARTUP_MS'
  | 'WARM_STARTUP_MS'
  | 'MEMORY_MB'
  | 'NETWORK_LATENCY_MS'
  | 'VERSION_ADOPTION_RATE'
  | 'SLOW_SCREEN_COUNT';

export interface PerformanceRowFilters {
  from?: Date;
  to?: Date;
  version?: string;
  buildNumber?: string;
  platform?: MobilePlatform;
}

export interface NormalizedPerformanceRow {
  id: string;
  platform: MobilePlatform;

  version: string;
  buildNumber: string | null;

  from: Date | null;
  to: Date | null;
  collectedAt: Date;

  metric: MobilePerformanceMetric;
  value: number;

  metrics: Record<string, number | null>;

  hasData: boolean;
}

@Injectable()
export class MobilePerformanceQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(workspaceId: string, mobileAppId: string, filters: PerformanceRowFilters = {}): Promise<NormalizedPerformanceRow[]> {
    const rows = await this.prisma.mobilePerformanceMetric.findMany({
      where: {
        workspaceId,
        mobileAppId,

        ...(filters.version
          ? {
              version: filters.version,
            }
          : {}),

        ...(filters.buildNumber
          ? {
              buildNumber: filters.buildNumber,
            }
          : {}),

        ...(filters.platform
          ? {
              platform: filters.platform,
            }
          : {}),

        ...(filters.from || filters.to
          ? {
              collectedAt: {
                ...(filters.from
                  ? {
                      gte: filters.from,
                    }
                  : {}),

                ...(filters.to
                  ? {
                      lte: filters.to,
                    }
                  : {}),
              },
            }
          : {}),
      },

      orderBy: {
        collectedAt: 'asc',
      },
    });

    return rows.map((row) => ({
      id: row.id,

      platform: row.platform,

      version: row.version,
      buildNumber: row.buildNumber,

      from: row.periodStart,
      to: row.periodEnd,

      collectedAt: row.collectedAt,

      metric: row.metric as MobilePerformanceMetric,

      value: row.value,

      metrics: {
        [row.metric]: row.value,
      },

      hasData: true,
    }));
  }

  async providerAvailable(workspaceId: string, mobileAppId: string): Promise<boolean> {
    const integration = await this.prisma.mobileTelemetryIntegration.findFirst({
      where: {
        workspaceId,
        mobileAppId,
      },

      select: {
        id: true,
      },
    });

    return Boolean(integration);
  }
}
