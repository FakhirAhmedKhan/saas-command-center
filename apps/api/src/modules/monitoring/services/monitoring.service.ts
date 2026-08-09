import { ConfigService } from '@nestjs/config';

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';

import { HealthCheckStatus, HealthIncidentStatus, HealthTargetType, Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma.service';

import type { TypedConfigService } from '../../../config/runtime-config';

import type { CreateHealthCheckDto, HealthCheckListQueryDto, IncidentListQueryDto, UpdateHealthCheckDto } from '../dto/health-check.dto';

import type { HealthCheckDto, HealthCheckHistoryDto, HealthIncidentDto, MonitoringSummaryDto, MonitoringTargetDto } from '../dto/monitoring-response.dto';

import { MonitoringAccessService } from './monitoring-access.service';

import { SafeHttpClientService } from './safe-http-client.service';

type HealthCheckWithTarget = Prisma.HealthCheckGetPayload<{
  include: {
    application: {
      select: {
        name: true;
      };
    };

    website: {
      select: {
        name: true;
        domain: true;
      };
    };
  };
}>;

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,

    private readonly access: MonitoringAccessService,

    private readonly safeHttp: SafeHttpClientService,
  ) {}

  async create(
    workspaceId: string,

    userId: string,

    input: CreateHealthCheckDto,
  ): Promise<HealthCheckDto> {
    await this.access.assertCanManage(workspaceId, userId);

    this.validateConfiguration(input);

    await this.safeHttp.validateUrl(input.url);

    await this.assertTargetExists(workspaceId, input.targetType, input.applicationId, input.websiteId);

    const created = await this.prisma.healthCheck.create({
      data: {
        workspaceId,

        targetType: input.targetType,

        applicationId: input.targetType === HealthTargetType.APPLICATION ? input.applicationId : null,

        websiteId: input.targetType === HealthTargetType.WEBSITE ? input.websiteId : null,

        name: input.name.trim(),

        url: input.url.trim(),

        intervalSeconds: input.intervalSeconds,

        timeoutMs: input.timeoutMs,

        expectedStatusMin: input.expectedStatusMin,

        expectedStatusMax: input.expectedStatusMax,

        degradedAfterMs: input.degradedAfterMs,

        failureThreshold: input.failureThreshold,

        enabled: input.enabled,

        latestStatus: input.enabled ? HealthCheckStatus.UNKNOWN : HealthCheckStatus.DISABLED,

        nextRunAt: new Date(),

        createdById: userId,

        updatedById: userId,
      },

      include: this.targetInclude(),
    });

    return this.mapCheck(created);
  }

  async update(
    workspaceId: string,

    checkId: string,

    userId: string,

    input: UpdateHealthCheckDto,
  ): Promise<HealthCheckDto> {
    await this.access.assertCanManage(workspaceId, userId);

    const existing = await this.requireCheck(workspaceId, checkId);

    const merged = {
      targetType: input.targetType ?? existing.targetType,

      applicationId: input.applicationId !== undefined ? input.applicationId : (existing.applicationId ?? undefined),

      websiteId: input.websiteId !== undefined ? input.websiteId : (existing.websiteId ?? undefined),

      name: input.name ?? existing.name,

      url: input.url ?? existing.url,

      intervalSeconds: input.intervalSeconds ?? existing.intervalSeconds,

      timeoutMs: input.timeoutMs ?? existing.timeoutMs,

      expectedStatusMin: input.expectedStatusMin ?? existing.expectedStatusMin,

      expectedStatusMax: input.expectedStatusMax ?? existing.expectedStatusMax,

      degradedAfterMs: input.degradedAfterMs ?? existing.degradedAfterMs,

      failureThreshold: input.failureThreshold ?? existing.failureThreshold,

      enabled: input.enabled ?? existing.enabled,
    };

    this.validateConfiguration(merged);

    if (input.url !== undefined) {
      await this.safeHttp.validateUrl(merged.url);
    }

    if (input.targetType !== undefined || input.applicationId !== undefined || input.websiteId !== undefined) {
      await this.assertTargetExists(workspaceId, merged.targetType, merged.applicationId, merged.websiteId);
    }

    const updated = await this.prisma.healthCheck.update({
      where: {
        id: existing.id,
      },

      data: {
        targetType: merged.targetType,

        applicationId: merged.targetType === HealthTargetType.APPLICATION ? merged.applicationId : null,

        websiteId: merged.targetType === HealthTargetType.WEBSITE ? merged.websiteId : null,

        name: merged.name.trim(),

        url: merged.url.trim(),

        intervalSeconds: merged.intervalSeconds,

        timeoutMs: merged.timeoutMs,

        expectedStatusMin: merged.expectedStatusMin,

        expectedStatusMax: merged.expectedStatusMax,

        degradedAfterMs: merged.degradedAfterMs,

        failureThreshold: merged.failureThreshold,

        enabled: merged.enabled,

        latestStatus: merged.enabled ? (existing.enabled ? existing.latestStatus : HealthCheckStatus.UNKNOWN) : HealthCheckStatus.DISABLED,

        consecutiveFailures: merged.enabled ? existing.consecutiveFailures : 0,

        nextRunAt: new Date(),

        updatedById: userId,
      },

      include: this.targetInclude(),
    });

    if (!merged.enabled) {
      await this.resolveOpenIncident(existing.id);
    }

    return this.mapCheck(updated);
  }

  async list(
    workspaceId: string,

    query: HealthCheckListQueryDto,
  ): Promise<HealthCheckDto[]> {
    const checks = await this.prisma.healthCheck.findMany({
      where: {
        workspaceId,

        latestStatus: query.status,

        targetType: query.targetType,

        enabled: query.enabled,

        applicationId: query.applicationId,

        websiteId: query.websiteId,
      },

      include: this.targetInclude(),

      orderBy: [
        {
          latestStatus: 'asc',
        },

        {
          name: 'asc',
        },
      ],

      take: 200,
    });

    return checks.map((check) => this.mapCheck(check));
  }

  async getOne(
    workspaceId: string,

    checkId: string,
  ): Promise<HealthCheckDto> {
    return this.mapCheck(await this.requireCheck(workspaceId, checkId));
  }

  async getHistory(
    workspaceId: string,

    checkId: string,
  ): Promise<HealthCheckHistoryDto[]> {
    await this.requireCheck(workspaceId, checkId);

    const history = await this.prisma.healthCheckHistory.findMany({
      where: {
        healthCheckId: checkId,
      },

      orderBy: {
        checkedAt: 'desc',
      },

      take: 100,
    });

    return history.map((item) => ({
      id: item.id,

      status: item.status,

      statusCode: item.statusCode,

      responseTimeMs: item.responseTimeMs,

      failureReason: item.failureReason,

      checkedAt: item.checkedAt.toISOString(),
    }));
  }

  async getIncidents(
    workspaceId: string,

    query: IncidentListQueryDto,
  ): Promise<HealthIncidentDto[]> {
    const incidents = await this.prisma.healthIncident.findMany({
      where: {
        workspaceId,

        status: query.status,
      },

      include: {
        healthCheck: {
          include: this.targetInclude(),
        },
      },

      orderBy: {
        startedAt: 'desc',
      },

      take: 100,
    });

    return incidents.map((incident) => ({
      id: incident.id,

      healthCheckId: incident.healthCheckId,

      healthCheckName: incident.healthCheck.name,

      targetName: this.getTargetName(incident.healthCheck),

      status: incident.status,

      summary: incident.summary,

      failureCount: incident.failureCount,

      firstFailureAt: incident.firstFailureAt.toISOString(),

      lastFailureAt: incident.lastFailureAt.toISOString(),

      startedAt: incident.startedAt.toISOString(),

      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    }));
  }

  async getSummary(
    workspaceId: string,

    userId: string,
  ): Promise<MonitoringSummaryDto> {
    const [canManage, groupedStatuses, activeIncidents] = await Promise.all([
      this.access.canManage(workspaceId, userId),

      this.prisma.healthCheck.groupBy({
        by: ['latestStatus'],

        where: {
          workspaceId,
        },

        _count: {
          _all: true,
        },
      }),

      this.prisma.healthIncident.count({
        where: {
          workspaceId,

          status: HealthIncidentStatus.OPEN,
        },
      }),
    ]);

    const counts = new Map(groupedStatuses.map((group) => [group.latestStatus, group._count._all]));

    const healthy = counts.get(HealthCheckStatus.HEALTHY) ?? 0;

    const degraded = counts.get(HealthCheckStatus.DEGRADED) ?? 0;

    const down = counts.get(HealthCheckStatus.DOWN) ?? 0;

    const unknown = counts.get(HealthCheckStatus.UNKNOWN) ?? 0;

    const disabled = counts.get(HealthCheckStatus.DISABLED) ?? 0;

    return {
      canManage,

      total: healthy + degraded + down + unknown + disabled,

      healthy,

      degraded,

      down,

      unknown,

      disabled,

      activeIncidents,
    };
  }

  async getApplicationSummary(
    workspaceId: string,

    applicationId: string,
  ) {
    const application = await this.prisma.saasApplication.findFirst({
      where: {
        id: applicationId,

        workspaceId,
      },

      select: {
        id: true,

        name: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    const checks = await this.prisma.healthCheck.findMany({
      where: {
        workspaceId,

        applicationId,
      },

      select: {
        latestStatus: true,

        lastResponseTimeMs: true,

        lastCheckedAt: true,
      },
    });

    const priority = [HealthCheckStatus.DOWN, HealthCheckStatus.DEGRADED, HealthCheckStatus.UNKNOWN, HealthCheckStatus.HEALTHY, HealthCheckStatus.DISABLED];

    const status = priority.find((candidate) => checks.some((check) => check.latestStatus === candidate)) ?? HealthCheckStatus.UNKNOWN;

    return {
      applicationId: application.id,

      applicationName: application.name,

      status,

      checks: checks.length,

      averageResponseTimeMs: this.average(checks.map((check) => check.lastResponseTimeMs).filter((value): value is number => value !== null)),

      lastCheckedAt:
        checks
          .map((check) => check.lastCheckedAt)
          .filter((value): value is Date => value !== null)
          .sort((first, second) => second.getTime() - first.getTime())[0]
          ?.toISOString() ?? null,
    };
  }

  async getTargets(workspaceId: string): Promise<MonitoringTargetDto[]> {
    const [applications, websites] = await Promise.all([
      this.prisma.saasApplication.findMany({
        where: {
          workspaceId,

          archivedAt: null,
        },

        select: {
          id: true,

          name: true,
        },

        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.website.findMany({
        where: {
          workspaceId,

          archivedAt: null,
        },

        select: {
          id: true,

          name: true,

          domain: true,
        },

        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    return [
      ...applications.map((application): MonitoringTargetDto => ({
        id: application.id,

        type: HealthTargetType.APPLICATION,

        name: application.name,

        subtitle: null,
      })),

      ...websites.map((website: { id: any; name: any; domain: any }): MonitoringTargetDto => ({
        id: website.id,

        type: HealthTargetType.WEBSITE,

        name: website.name,

        subtitle: website.domain,
      })),
    ];
  }

  private validateConfiguration(input: {
    targetType: HealthTargetType;

    applicationId?: string;

    websiteId?: string;

    intervalSeconds: number;

    timeoutMs: number;

    expectedStatusMin: number;

    expectedStatusMax: number;

    degradedAfterMs: number;

    failureThreshold: number;
  }): void {
    if (input.targetType === HealthTargetType.APPLICATION && !input.applicationId) {
      throw new BadRequestException('applicationId is required for an application health check.');
    }

    if (input.targetType === HealthTargetType.WEBSITE && !input.websiteId) {
      throw new BadRequestException('websiteId is required for a website health check.');
    }

    if (input.expectedStatusMax < input.expectedStatusMin) {
      throw new BadRequestException('expectedStatusMax must be greater than or equal to expectedStatusMin.');
    }

    const minimumInterval = this.config.get('HEALTH_MIN_INTERVAL_SECONDS', {
      infer: true,
    });

    const maximumInterval = this.config.get('HEALTH_MAX_INTERVAL_SECONDS', {
      infer: true,
    });

    if (input.intervalSeconds < minimumInterval || input.intervalSeconds > maximumInterval) {
      throw new BadRequestException(`Health-check interval must be between ${minimumInterval} and ${maximumInterval} seconds.`);
    }

    const minimumTimeout = this.config.get('HEALTH_MIN_TIMEOUT_MS', {
      infer: true,
    });

    const maximumTimeout = this.config.get('HEALTH_MAX_TIMEOUT_MS', {
      infer: true,
    });

    if (input.timeoutMs < minimumTimeout || input.timeoutMs > maximumTimeout) {
      throw new BadRequestException(`Health-check timeout must be between ${minimumTimeout} and ${maximumTimeout} milliseconds.`);
    }

    if (input.degradedAfterMs > input.timeoutMs) {
      throw new BadRequestException('degradedAfterMs cannot exceed timeoutMs.');
    }
  }

  private async assertTargetExists(
    workspaceId: string,

    targetType: HealthTargetType,

    applicationId?: string,

    websiteId?: string,
  ): Promise<void> {
    if (targetType === HealthTargetType.APPLICATION) {
      const application = await this.prisma.saasApplication.findFirst({
        where: {
          id: applicationId,

          workspaceId,

          archivedAt: null,
        },

        select: {
          id: true,
        },
      });

      if (!application) {
        throw new NotFoundException('Application not found.');
      }

      return;
    }

    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,

        workspaceId,

        archivedAt: null,
      },

      select: {
        id: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found.');
    }
  }

  private async requireCheck(
    workspaceId: string,

    checkId: string,
  ): Promise<HealthCheckWithTarget> {
    const check = await this.prisma.healthCheck.findFirst({
      where: {
        id: checkId,

        workspaceId,
      },

      include: this.targetInclude(),
    });

    if (!check) {
      throw new NotFoundException('Health check not found.');
    }

    return check;
  }

  private async resolveOpenIncident(healthCheckId: string): Promise<void> {
    await this.prisma.healthIncident.updateMany({
      where: {
        healthCheckId,

        status: HealthIncidentStatus.OPEN,
      },

      data: {
        status: HealthIncidentStatus.RESOLVED,

        activeKey: null,

        resolvedAt: new Date(),
      },
    });
  }

  private targetInclude() {
    return {
      application: {
        select: {
          name: true,
        },
      },

      website: {
        select: {
          name: true,

          domain: true,
        },
      },
    } as const;
  }

  private mapCheck(check: HealthCheckWithTarget): HealthCheckDto {
    const targetId = check.targetType === HealthTargetType.APPLICATION ? check.applicationId! : check.websiteId!;

    return {
      id: check.id,

      targetType: check.targetType,

      targetId,

      targetName: this.getTargetName(check),

      applicationId: check.applicationId,

      websiteId: check.websiteId,

      name: check.name,

      url: check.url,

      intervalSeconds: check.intervalSeconds,

      timeoutMs: check.timeoutMs,

      expectedStatusMin: check.expectedStatusMin,

      expectedStatusMax: check.expectedStatusMax,

      degradedAfterMs: check.degradedAfterMs,

      failureThreshold: check.failureThreshold,

      enabled: check.enabled,

      latestStatus: check.latestStatus,

      lastStatusCode: check.lastStatusCode,

      lastResponseTimeMs: check.lastResponseTimeMs,

      lastFailureReason: check.lastFailureReason,

      consecutiveFailures: check.consecutiveFailures,

      lastCheckedAt: check.lastCheckedAt?.toISOString() ?? null,

      lastSuccessfulAt: check.lastSuccessfulAt?.toISOString() ?? null,

      nextRunAt: check.nextRunAt.toISOString(),

      createdAt: check.createdAt.toISOString(),

      updatedAt: check.updatedAt.toISOString(),
    };
  }

  private getTargetName(check: HealthCheckWithTarget): string {
    if (check.targetType === HealthTargetType.APPLICATION) {
      return check.application?.name ?? 'Unknown application';
    }

    return check.website?.name ?? 'Unknown website';
  }

  private average(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    return Math.round(
      values.reduce(
        (total, value) => total + value,

        0,
      ) / values.length,
    );
  }
}
