import { DesktopAppsService } from './desktop-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import type { DesktopRuntimeQueryDto } from '../dto/desktop-runtime.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DesktopPerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
  ) {}

  async get(workspaceId: string, desktopAppId: string, query: DesktopRuntimeQueryDto) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    const metrics = await this.prisma.desktopMetric.findMany({
      where: {
        workspaceId,
        desktopAppId,
        ...(query.version ? { version: query.version } : {}),
        ...(query.platform ? { platform: query.platform } : {}),
        ...(query.architecture ? { architecture: query.architecture } : {}),
        ...(query.channel ? { channel: query.channel } : {}),
        ...(from || to
          ? {
              recordedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: 2000,
    });

    const average = (type: string): number | null => {
      const values = metrics
        .filter((metric) => metric.type === type)
        .map((metric) => metric.value)
        .filter(Number.isFinite);

      if (values.length === 0) {
        return null;
      }

      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };

    return {
      summary: {
        crashFreeUsersPercent: average('CRASH_FREE_USERS_PERCENT'),
        crashFreeSessionsPercent: average('CRASH_FREE_SESSIONS_PERCENT'),
        startupMs: average('STARTUP_MS'),
        memoryMb: average('MEMORY_MB'),
        cpuPercent: average('CPU_PERCENT'),
        hangRatePercent: average('HANG_RATE_PERCENT'),
        networkLatencyMs: average('NETWORK_LATENCY_MS'),
        apiFailureRatePercent: average('API_FAILURE_RATE_PERCENT'),
        versionAdoptionPercent: average('VERSION_ADOPTION_PERCENT'),
        sampleCount: metrics.length,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      },
      metrics,
    };
  }
}
