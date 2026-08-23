import { Injectable } from '@nestjs/common';
import type { MobilePlatform } from 'src/generated/prisma/enums';

import { PrismaService } from '../../../database/prisma.service';

export interface PerformanceRowFilters {
  from?: string;
  to?: string;
  version?: string;
  buildNumber?: string;
  platform?: MobilePlatform;
}

export interface NormalizedPerformanceRow {
  id: string;
  platform: MobilePlatform;
  version: string | null;
  buildNumber: string | null;
  from: Date | null;
  to: Date | null;
  collectedAt: Date;
  metrics: Record<string, number | null>;
}

@Injectable()
export class MobilePerformanceQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(..._args: unknown[]): Promise<NormalizedPerformanceRow[]> {
    // The provider/ingestion layer remains the source of truth.
    // Phase 12-14 E2E must verify the concrete persistence adapter.
    return Promise.resolve([]);
  }

  async providerAvailable(...args: unknown[]): Promise<boolean> {
    const ids = args.filter((value): value is string => typeof value === 'string');

    const workspaceId = ids.length > 1 ? ids[0] : undefined;

    const mobileAppId = ids.length > 1 ? ids[1] : ids[0];

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
