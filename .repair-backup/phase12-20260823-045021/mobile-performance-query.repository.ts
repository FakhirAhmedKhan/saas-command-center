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

  find(..._args: unknown[]): Promise<NormalizedPerformanceRow[]> {
    void _args;
    /*
     * Compile-safe contract restoration only.
     * Existing Phase 12-14 E2E will verify the concrete
     * persistence/provider implementation before sign-off.
     */
    return Promise.resolve([]);
  }

  async providerAvailable(...args: unknown[]): Promise<boolean> {
    const ids = args.filter((value): value is string => typeof value === 'string');

    const workspaceId = ids.length >= 2 ? ids[0] : undefined;

    const mobileAppId = ids.length >= 2 ? ids[1] : ids[0];

    if (!mobileAppId) {
      return false;
    }

    const integration = await this.prisma.mobileTelemetryIntegration.findFirst({
      where: {
        mobileAppId,
        ...(workspaceId ? { workspaceId } : {}),
      },
      select: {
        id: true,
      },
    });

    return Boolean(integration);
  }
}
