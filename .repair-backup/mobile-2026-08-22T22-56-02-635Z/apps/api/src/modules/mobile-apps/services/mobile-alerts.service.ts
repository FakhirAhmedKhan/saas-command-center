import { MobileAppsService } from './mobile-apps.service';
import { MobilePerformanceDashboardService } from './mobile-performance-dashboard.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationService } from '../../team-operations/services/notification.service';
import { CreateMobileAlertRuleDto, UpdateMobileAlertRuleDto } from '../dto/mobile-alert.dto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MobileAlertIncidentStatus, MobileAlertRuleType, MobileBuildStatus, NotificationPriority, NotificationType, WorkspaceRole } from 'src/generated/prisma/enums';

@Injectable()
export class MobileAlertsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly mobileApps: MobileAppsService,

    private readonly performance: MobilePerformanceDashboardService,

    private readonly notifications: NotificationService,
  ) {}

  async createRule(workspaceId: string, mobileAppId: string, dto: CreateMobileAlertRuleDto) {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    if (this.requiresThreshold(dto.type) && dto.threshold === undefined) {
      throw new BadRequestException('Threshold is required for this rule.');
    }

    return this.prisma.mobileAlertRule.create({
      data: {
        workspaceId,
        mobileAppId,

        name: dto.name.trim(),

        type: dto.type,

        threshold: dto.threshold ?? null,

        cooldownMinutes: dto.cooldownMinutes ?? 60,

        enabled: dto.enabled ?? true,
      },
    });
  }

  async listRules(workspaceId: string, mobileAppId: string) {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    return this.prisma.mobileAlertRule.findMany({
      where: {
        workspaceId,
        mobileAppId,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateRule(workspaceId: string, mobileAppId: string, ruleId: string, dto: UpdateMobileAlertRuleDto) {
    const rule = await this.requireRule(workspaceId, mobileAppId, ruleId);

    return this.prisma.mobileAlertRule.update({
      where: {
        id: rule.id,
      },

      data: {
        ...(dto.name !== undefined
          ? {
              name: dto.name.trim(),
            }
          : {}),

        ...(dto.threshold !== undefined
          ? {
              threshold: dto.threshold,
            }
          : {}),

        ...(dto.cooldownMinutes !== undefined
          ? {
              cooldownMinutes: dto.cooldownMinutes,
            }
          : {}),

        ...(dto.enabled !== undefined
          ? {
              enabled: dto.enabled,
            }
          : {}),
      },
    });
  }

  async deleteRule(workspaceId: string, mobileAppId: string, ruleId: string) {
    const rule = await this.requireRule(workspaceId, mobileAppId, ruleId);

    await this.prisma.mobileAlertRule.delete({
      where: {
        id: rule.id,
      },
    });

    return {
      success: true,
    };
  }

  async listIncidents(workspaceId: string, mobileAppId: string) {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    return this.prisma.mobileAlertIncident.findMany({
      where: {
        workspaceId,
        mobileAppId,
      },

      orderBy: {
        triggeredAt: 'desc',
      },

      take: 100,
    });
  }

  async evaluateApp(workspaceId: string, mobileAppId: string) {
    const app = await this.mobileApps.findOne(workspaceId, mobileAppId);

    const rules = await this.prisma.mobileAlertRule.findMany({
      where: {
        workspaceId,
        mobileAppId,
        enabled: true,
      },
    });

    const results = [];

    for (const rule of rules) {
      const evaluation = await this.evaluateRule(workspaceId, mobileAppId, rule);

      if (evaluation.breached) {
        const incident = await this.trigger(app.applicationId, rule, evaluation);

        results.push(incident);
      } else {
        await this.resolve(rule.id);
      }
    }

    return {
      evaluated: rules.length,

      openIncidents: results.length,
    };
  }

  private async evaluateRule(
    workspaceId: string,
    mobileAppId: string,

    rule: {
      id: string;

      type: MobileAlertRuleType;

      threshold: number | null;
    },
  ) {
    if (rule.type === MobileAlertRuleType.BUILD_FAILED) {
      const build = await this.prisma.mobileBuild.findFirst({
        where: {
          workspaceId,
          mobileAppId,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        breached: build?.status === MobileBuildStatus.FAILED,

        actualValue: build?.status === MobileBuildStatus.FAILED ? 1 : 0,

        threshold: 0,

        version: build?.version ?? null,

        buildId: build?.id ?? null,

        title: 'Mobile build failed',

        message: build ? `Build ${build.buildNumber ?? build.workflowRunId} failed.` : 'No builds found.',
      };
    }

    if (rule.type === MobileAlertRuleType.RELEASE_REGRESSION) {
      const releases = await this.prisma.mobileRelease.findMany({
        where: {
          workspaceId,
          mobileAppId,
          status: 'RELEASED',
        },

        orderBy: {
          releasedAt: 'desc',
        },

        take: 2,
      });

      if (releases.length < 2) {
        return {
          breached: false,
          actualValue: 0,
          threshold: rule.threshold ?? 0,
          version: null,
          buildId: null,
          title: 'Release regression',
          message: 'Insufficient release history.',
        };
      }

      const latest = releases[0]!;

      const previous = releases[1]!;

      const comparison = await this.performance.compare(workspaceId, mobileAppId, previous.version, latest.version);

      const maxRegression = Math.max(0, ...comparison.metrics.filter((metric) => metric.direction === 'DEGRADED' && metric.percentDelta !== null).map((metric) => Math.abs(metric.percentDelta)));

      return {
        breached: maxRegression > (rule.threshold ?? 0),

        actualValue: maxRegression,

        threshold: rule.threshold ?? 0,

        version: latest.version,

        buildId: latest.buildId,

        title: 'Performance regression',

        message: `Release ${latest.version} degraded up to ${maxRegression.toFixed(2)}%.`,
      };
    }

    const summary = await this.performance.summary(workspaceId, mobileAppId, {});

    const threshold = rule.threshold ?? 0;

    const mapping = {
      CRASH_RATE: 'CRASH_RATE',

      ANR_HANG: null,

      STARTUP: 'COLD_STARTUP_MS',

      API_FAILURE_RATE: 'API_FAILURE_RATE',
    } as const;

    let actual = 0;

    if (rule.type === MobileAlertRuleType.ANR_HANG) {
      actual = (summary.metrics.ANR_COUNT.value ?? 0) + (summary.metrics.HANG_COUNT.value ?? 0);
    } else {
      const metric = mapping[rule.type as keyof typeof mapping];

      if (metric) {
        actual = summary.metrics[metric].value ?? 0;
      }
    }

    return {
      breached: actual > threshold,

      actualValue: actual,

      threshold,

      version: summary.version,

      buildId: null,

      title: this.title(rule.type),

      message: `${this.title(rule.type)}: ${actual} exceeds ${threshold}.`,
    };
  }

  private async trigger(
    applicationId: string,

    rule: {
      id: string;
      workspaceId: string;
      mobileAppId: string;
      cooldownMinutes: number;
    },

    evaluation: {
      actualValue: number;
      threshold: number;
      version: string | null;
      buildId: string | null;
      title: string;
      message: string;
    },
  ) {
    const active = await this.prisma.mobileAlertIncident.findUnique({
      where: {
        activeKey: rule.id,
      },
    });

    if (active) {
      return active;
    }

    const latest = await this.prisma.mobileAlertIncident.findFirst({
      where: {
        ruleId: rule.id,
      },

      orderBy: {
        triggeredAt: 'desc',
      },
    });

    if (latest?.resolvedAt) {
      const cooldownMs = rule.cooldownMinutes * 60_000;

      if (Date.now() - latest.resolvedAt.getTime() < cooldownMs) {
        return latest;
      }
    }

    const incident = await this.prisma.mobileAlertIncident.create({
      data: {
        workspaceId: rule.workspaceId,

        mobileAppId: rule.mobileAppId,

        ruleId: rule.id,

        status: MobileAlertIncidentStatus.OPEN,

        title: evaluation.title,

        message: evaluation.message,

        actualValue: evaluation.actualValue,

        threshold: evaluation.threshold,

        version: evaluation.version,

        buildId: evaluation.buildId,

        activeKey: rule.id,
      },
    });

    await this.notify(applicationId, incident);

    return incident;
  }

  private async resolve(ruleId: string) {
    const incident = await this.prisma.mobileAlertIncident.findUnique({
      where: {
        activeKey: ruleId,
      },
    });

    if (!incident) {
      return;
    }

    await this.prisma.mobileAlertIncident.update({
      where: {
        id: incident.id,
      },

      data: {
        status: MobileAlertIncidentStatus.RESOLVED,

        activeKey: null,

        resolvedAt: new Date(),
      },
    });
  }

  private async notify(
    applicationId: string,

    incident: {
      id: string;
      workspaceId: string;
      mobileAppId: string;
      title: string;
      message: string;
    },
  ) {
    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: incident.workspaceId,

        role: {
          in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER],
        },
      },

      select: {
        userId: true,
      },
    });

    for (const member of members) {
      await this.notifications.create({
        workspaceId: incident.workspaceId,

        userId: member.userId,

        applicationId,

        type: NotificationType.SYSTEM,

        priority: NotificationPriority.CRITICAL,

        title: incident.title,

        message: incident.message,

        resourceType: 'mobile_alert_incident',

        resourceId: incident.id,

        actionUrl: `/workspaces/${incident.workspaceId}/mobile-apps/${incident.mobileAppId}/alerts`,

        dedupeKey: `mobile-alert:${incident.id}:${member.userId}`,

        payload: {
          mobileAppId: incident.mobileAppId,

          incidentId: incident.id,
        },
      });
    }
  }

  private async requireRule(workspaceId: string, mobileAppId: string, ruleId: string) {
    const rule = await this.prisma.mobileAlertRule.findFirst({
      where: {
        id: ruleId,
        workspaceId,
        mobileAppId,
      },
    });

    if (!rule) {
      throw new NotFoundException('Mobile alert rule not found.');
    }

    return rule;
  }

  private requiresThreshold(type: MobileAlertRuleType) {
    return type !== MobileAlertRuleType.BUILD_FAILED;
  }

  private title(type: MobileAlertRuleType) {
    switch (type) {
      case MobileAlertRuleType.CRASH_RATE:
        return 'Crash rate alert';

      case MobileAlertRuleType.ANR_HANG:
        return 'ANR/Hang alert';

      case MobileAlertRuleType.STARTUP:
        return 'Startup performance alert';

      case MobileAlertRuleType.API_FAILURE_RATE:
        return 'API failure alert';

      case MobileAlertRuleType.RELEASE_REGRESSION:
        return 'Release regression';

      default:
        return 'Mobile alert';
    }
  }
}
