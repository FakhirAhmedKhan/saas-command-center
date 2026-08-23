import { PrismaService } from '../../../database/prisma.service';
import { NotificationService } from '../../team-operations/services/notification.service';
import { CreateDesktopAlertRuleDto, UpdateDesktopAlertRuleDto } from '../dto/desktop-alert.dto';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopPerformanceService } from './desktop-performance.service';
import { DesktopSecurityService } from './desktop-security.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
    DesktopAlertIncidentStatus,
    DesktopAlertOperator,
    DesktopAlertRuleType,
    DesktopBuildStatus,
    DesktopPerformanceMetricType,
    DesktopReleaseStatus,
    DesktopSecurityCheckStatus,
    DesktopSecurityCheckType,
    DesktopTelemetryIntegrationStatus,
    NotificationPriority,
    NotificationType,
    Prisma,
    WorkspaceRole,
} from 'src/generated/prisma/client';

type RuleRecord = Awaited<ReturnType<DesktopAlertsService['requireRule']>>;

interface AlertSignal {
    breached: boolean;
    actualValue: number | null;
    threshold: number | null;
    title: string;
    message: string;
    version: string | null;
    buildId: string | null;
    dimension: string;
    evidence: Record<string, unknown>;
}

@Injectable()
export class DesktopAlertsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly desktopApps: DesktopAppsService,
        private readonly performance: DesktopPerformanceService,
        private readonly security: DesktopSecurityService,
        private readonly notifications: NotificationService,
    ) { }

    async createRule(workspaceId: string, desktopAppId: string, dto: CreateDesktopAlertRuleDto) {
        await this.desktopApps.findOne(workspaceId, desktopAppId);

        if (this.requiresThreshold(dto.type) && dto.threshold === undefined) {
            throw new BadRequestException('Threshold is required for this alert type.');
        }

        return this.prisma.desktopAlertRule.create({
            data: {
                workspaceId,
                desktopAppId,
                name: dto.name.trim(),
                type: dto.type,
                operator: dto.operator ?? DesktopAlertOperator.GT,
                threshold: dto.threshold ?? null,
                cooldownMinutes: dto.cooldownMinutes ?? 60,
                enabled: dto.enabled ?? true,
            },
        });
    }

    async listRules(workspaceId: string, desktopAppId: string) {
        await this.desktopApps.findOne(workspaceId, desktopAppId);

        return this.prisma.desktopAlertRule.findMany({
            where: { workspaceId, desktopAppId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateRule(workspaceId: string, desktopAppId: string, ruleId: string, dto: UpdateDesktopAlertRuleDto) {
        const rule = await this.requireRule(workspaceId, desktopAppId, ruleId);

        const nextType = dto.type ?? rule.type;
        const nextThreshold = dto.threshold ?? rule.threshold;

        if (this.requiresThreshold(nextType) && nextThreshold === null) {
            throw new BadRequestException('Threshold is required for this alert type.');
        }

        return this.prisma.desktopAlertRule.update({
            where: { id: rule.id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.type !== undefined ? { type: dto.type } : {}),
                ...(dto.operator !== undefined ? { operator: dto.operator } : {}),
                ...(dto.threshold !== undefined ? { threshold: dto.threshold } : {}),
                ...(dto.cooldownMinutes !== undefined ? { cooldownMinutes: dto.cooldownMinutes } : {}),
                ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
            },
        });
    }

    async deleteRule(workspaceId: string, desktopAppId: string, ruleId: string) {
        const rule = await this.requireRule(workspaceId, desktopAppId, ruleId);

        await this.prisma.desktopAlertRule.delete({ where: { id: rule.id } });

        return { success: true as const };
    }

    async listIncidents(workspaceId: string, desktopAppId: string) {
        await this.desktopApps.findOne(workspaceId, desktopAppId);

        return this.prisma.desktopAlertIncident.findMany({
            where: { workspaceId, desktopAppId },
            orderBy: { triggeredAt: 'desc' },
            take: 200,
        });
    }

    async evaluateApp(workspaceId: string, desktopAppId: string) {
        const app = await this.desktopApps.findOne(workspaceId, desktopAppId);

        if (app.application.archivedAt) {
            return {
                rulesEvaluated: 0,
                triggered: 0,
                resolved: 0,
                unchanged: 0,
            };
        }

        const rules = await this.prisma.desktopAlertRule.findMany({
            where: {
                workspaceId,
                desktopAppId,
                enabled: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        let triggered = 0;
        let resolved = 0;
        let unchanged = 0;

        for (const rule of rules) {
            const signal = await this.evaluateRule(workspaceId, desktopAppId, rule);

            if (signal.breached) {
                const created = await this.trigger(workspaceId, desktopAppId, app.applicationId, rule, signal);

                if (created) triggered += 1;
                else unchanged += 1;
            } else {
                const count = await this.resolve(rule.id);
                if (count > 0) resolved += count;
                else unchanged += 1;
            }
        }

        return {
            rulesEvaluated: rules.length,
            triggered,
            resolved,
            unchanged,
        };
    }

    private async evaluateRule(workspaceId: string, desktopAppId: string, rule: RuleRecord): Promise<AlertSignal> {
        switch (rule.type) {
            case DesktopAlertRuleType.BUILD_FAILED:
                return this.buildFailedSignal(workspaceId, desktopAppId);

            case DesktopAlertRuleType.CRASH_RATE:
            case DesktopAlertRuleType.STARTUP:
            case DesktopAlertRuleType.MEMORY:
            case DesktopAlertRuleType.CPU:
                return this.performanceSignal(workspaceId, desktopAppId, rule);

            case DesktopAlertRuleType.RELEASE_REGRESSION:
                return this.releaseRegressionSignal(workspaceId, desktopAppId, rule);

            case DesktopAlertRuleType.SIGNING_FAILURE:
                return this.signingFailureSignal(workspaceId, desktopAppId);

            case DesktopAlertRuleType.TELEMETRY_UNAVAILABLE:
                return this.telemetryUnavailableSignal(workspaceId, desktopAppId);
        }
    }

    private async buildFailedSignal(workspaceId: string, desktopAppId: string): Promise<AlertSignal> {
        const build = await this.prisma.desktopBuild.findFirst({
            where: { workspaceId, desktopAppId },
            orderBy: { createdAt: 'desc' },
        });

        const breached = build?.status === DesktopBuildStatus.FAILED;

        return {
            breached,
            actualValue: null,
            threshold: null,
            title: 'Desktop build failed',
            message: breached
                ? `Build ${build.buildNumber ?? build.workflowRunId} failed on ${build.platform} ${build.architecture}.`
                : 'Latest desktop build is not failed.',
            version: build?.version ?? null,
            buildId: build?.id ?? null,
            dimension: build ? `build:${build.id}` : 'build:none',
            evidence: build
                ? {
                    buildId: build.id,
                    workflowRunId: build.workflowRunId,
                    status: build.status,
                    commitSha: build.commitSha,
                    branch: build.branch,
                    platform: build.platform,
                    architecture: build.architecture,
                }
                : {},
        };
    }

    private async performanceSignal(workspaceId: string, desktopAppId: string, rule: RuleRecord): Promise<AlertSignal> {
        const result = await this.performance.get(workspaceId, desktopAppId, {});
        const threshold = rule.threshold ?? 0;

        let actual: number | null = null;
        let label = 'Performance threshold';

        if (rule.type === DesktopAlertRuleType.CRASH_RATE) {
            actual = result.summary.crashFreeUsersPercent === null ? null : Math.max(0, 100 - result.summary.crashFreeUsersPercent);
            label = 'Crash rate';
        }

        if (rule.type === DesktopAlertRuleType.STARTUP) {
            actual = result.summary.startupMs;
            label = 'Startup';
        }

        if (rule.type === DesktopAlertRuleType.MEMORY) {
            actual = result.summary.memoryMb;
            label = 'Memory';
        }

        if (rule.type === DesktopAlertRuleType.CPU) {
            actual = result.summary.cpuPercent;
            label = 'CPU';
        }

        const breached = actual !== null && this.compare(actual, threshold, rule.operator);

        return {
            breached,
            actualValue: actual,
            threshold,
            title: `${label} alert`,
            message: actual === null ? `${label} has no runtime data.` : `${label} is ${actual.toFixed(2)} and the configured threshold is ${threshold}.`,
            version: this.latestVersion(result.metrics),
            buildId: null,
            dimension: `${rule.type}:current`,
            evidence: {
                metric: rule.type,
                actual,
                threshold,
                sampleCount: result.summary.sampleCount,
            },
        };
    }

    private async releaseRegressionSignal(workspaceId: string, desktopAppId: string, rule: RuleRecord): Promise<AlertSignal> {
        const releases = await this.prisma.desktopRelease.findMany({
            where: {
                workspaceId,
                desktopAppId,
                status: DesktopReleaseStatus.PUBLISHED,
            },
            orderBy: [{ releasedAt: 'desc' }, { createdAt: 'desc' }],
            take: 2,
        });

        if (releases.length < 2) {
            return {
                breached: false,
                actualValue: null,
                threshold: rule.threshold ?? null,
                title: 'Release regression',
                message: 'At least two published releases are required for comparison.',
                version: releases[0]?.version ?? null,
                buildId: releases[0]?.buildId ?? null,
                dimension: 'release:insufficient-data',
                evidence: {},
            };
        }

        const [current, previous] = releases;

        const [currentStartup, previousStartup, currentCrashFree, previousCrashFree] = await Promise.all([
            this.metricAverage(workspaceId, desktopAppId, current.version, DesktopPerformanceMetricType.STARTUP_MS),
            this.metricAverage(workspaceId, desktopAppId, previous.version, DesktopPerformanceMetricType.STARTUP_MS),
            this.metricAverage(workspaceId, desktopAppId, current.version, DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT),
            this.metricAverage(workspaceId, desktopAppId, previous.version, DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT),
        ]);

        const startupDelta = this.percentIncrease(previousStartup, currentStartup);

        const previousCrashRate = previousCrashFree === null ? null : Math.max(0, 100 - previousCrashFree);
        const currentCrashRate = currentCrashFree === null ? null : Math.max(0, 100 - currentCrashFree);
        const crashDelta = this.percentIncrease(previousCrashRate, currentCrashRate);

        const regression = Math.max(startupDelta ?? 0, crashDelta ?? 0);
        const threshold = rule.threshold ?? 0;

        return {
            breached: this.compare(regression, threshold, rule.operator),
            actualValue: regression,
            threshold,
            title: 'Desktop release regression',
            message: `${previous.version} → ${current.version}: maximum measured regression ${regression.toFixed(2)}%.`,
            version: current.version,
            buildId: current.buildId,
            dimension: `release:${current.id}`,
            evidence: {
                fromReleaseId: previous.id,
                toReleaseId: current.id,
                fromVersion: previous.version,
                toVersion: current.version,
                startupDeltaPercent: startupDelta,
                crashRateDeltaPercent: crashDelta,
            },
        };
    }

    private async signingFailureSignal(workspaceId: string, desktopAppId: string): Promise<AlertSignal> {
        const security = await this.security.get(workspaceId, desktopAppId);

        const failed = security.findings.filter(
            (finding) =>
                (finding.type === DesktopSecurityCheckType.WINDOWS_SIGNING ||
                    finding.type === DesktopSecurityCheckType.MACOS_SIGNING ||
                    finding.type === DesktopSecurityCheckType.MACOS_NOTARIZATION) &&
                finding.status === DesktopSecurityCheckStatus.FAIL,
        );

        return {
            breached: failed.length > 0,
            actualValue: failed.length,
            threshold: 0,
            title: 'Desktop signing/security failure',
            message: failed.length > 0 ? `${failed.length} signing or notarization check(s) failed.` : 'Signing and notarization checks contain no failures.',
            version: null,
            buildId: null,
            dimension: `signing:${failed
                    .map((finding) => finding.findingKey)
                    .sort()
                    .join('|') || 'healthy'
                }`,
            evidence: {
                findingIds: failed.map((finding) => finding.id),
                findingKeys: failed.map((finding) => finding.findingKey),
            },
        };
    }

    private async telemetryUnavailableSignal(workspaceId: string, desktopAppId: string): Promise<AlertSignal> {
        const integrations = await this.prisma.desktopTelemetryIntegration.findMany({
            where: { workspaceId, desktopAppId },
            select: {
                id: true,
                provider: true,
                status: true,
                lastSyncedAt: true,
                lastError: true,
            },
        });

        const connected = integrations.some((item) => item.status === DesktopTelemetryIntegrationStatus.CONNECTED);

        return {
            breached: !connected,
            actualValue: connected ? 0 : 1,
            threshold: 0,
            title: 'Desktop telemetry unavailable',
            message: connected ? 'At least one desktop telemetry provider is connected.' : 'No desktop telemetry provider is currently connected.',
            version: null,
            buildId: null,
            dimension: 'telemetry:availability',
            evidence: {
                providers: integrations.map((item) => ({
                    provider: item.provider,
                    status: item.status,
                    lastSyncedAt: item.lastSyncedAt,
                    // Never include secretCiphertext.
                })),
            },
        };
    }

    private async trigger(workspaceId: string, desktopAppId: string, applicationId: string, rule: RuleRecord, signal: AlertSignal): Promise<boolean> {
        const activeKey = `${rule.id}:${signal.dimension}`.slice(0, 255);

        const existing = await this.prisma.desktopAlertIncident.findFirst({
            where: {
                workspaceId,
                desktopAppId,
                ruleId: rule.id,
                status: DesktopAlertIncidentStatus.OPEN,
            },
        });

        if (existing) {
            await this.prisma.desktopAlertIncident.update({
                where: { id: existing.id },
                data: {
                    title: signal.title,
                    message: signal.message,
                    actualValue: signal.actualValue,
                    threshold: signal.threshold,
                    version: signal.version,
                    buildId: signal.buildId,
                    evidence: signal.evidence as Prisma.InputJsonValue,
                    lastTriggeredAt: new Date(),
                },
            });

            return false;
        }

        const latestResolved = await this.prisma.desktopAlertIncident.findFirst({
            where: {
                workspaceId,
                desktopAppId,
                ruleId: rule.id,
                status: DesktopAlertIncidentStatus.RESOLVED,
            },
            orderBy: { resolvedAt: 'desc' },
            select: { resolvedAt: true },
        });

        if (latestResolved?.resolvedAt && Date.now() - latestResolved.resolvedAt.getTime() < rule.cooldownMinutes * 60_000) {
            return false;
        }

        let incident;

        try {
            incident = await this.prisma.desktopAlertIncident.create({
                data: {
                    workspaceId,
                    desktopAppId,
                    ruleId: rule.id,
                    status: DesktopAlertIncidentStatus.OPEN,
                    title: signal.title,
                    message: signal.message,
                    actualValue: signal.actualValue,
                    threshold: signal.threshold,
                    version: signal.version,
                    buildId: signal.buildId,
                    activeKey,
                    evidence: signal.evidence as Prisma.InputJsonValue,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return false;
            }

            throw error;
        }

        await this.notifyWorkspace(workspaceId, applicationId, desktopAppId, incident.id, signal);

        return true;
    }

    private async notifyWorkspace(workspaceId: string, applicationId: string, desktopAppId: string, incidentId: string, signal: AlertSignal) {
        const members = await this.prisma.workspaceMember.findMany({
            where: {
                workspaceId,
                role: {
                    in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER],
                },
            },
            select: { userId: true },
        });

        await Promise.all(
            members.map((member) =>
                this.notifications.create({
                    workspaceId,
                    userId: member.userId,
                    applicationId,
                    type: NotificationType.SYSTEM,
                    priority: NotificationPriority.WARNING,
                    title: signal.title,
                    message: signal.message,
                    resourceType: 'DesktopAlertIncident',
                    resourceId: incidentId,
                    actionUrl: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts`,
                    dedupeKey: `desktop-alert:${incidentId}:${member.userId}`,
                    payload: {
                        desktopAppId,
                        buildId: signal.buildId,
                        version: signal.version,
                    },
                }),
            ),
        );
    }

    private async resolve(ruleId: string): Promise<number> {
        const open = await this.prisma.desktopAlertIncident.findMany({
            where: {
                ruleId,
                status: DesktopAlertIncidentStatus.OPEN,
            },
            select: { id: true },
        });

        if (open.length === 0) return 0;

        const result = await this.prisma.desktopAlertIncident.updateMany({
            where: {
                id: { in: open.map((item) => item.id) },
            },
            data: {
                status: DesktopAlertIncidentStatus.RESOLVED,
                activeKey: null,
                resolvedAt: new Date(),
            },
        });

        return result.count;
    }

    async requireRule(workspaceId: string, desktopAppId: string, ruleId: string) {
        const rule = await this.prisma.desktopAlertRule.findFirst({
            where: {
                id: ruleId,
                workspaceId,
                desktopAppId,
            },
        });

        if (!rule) {
            throw new NotFoundException('Desktop alert rule not found.');
        }

        return rule;
    }

    private requiresThreshold(type: DesktopAlertRuleType): boolean {
        return ![DesktopAlertRuleType.BUILD_FAILED, DesktopAlertRuleType.SIGNING_FAILURE, DesktopAlertRuleType.TELEMETRY_UNAVAILABLE].includes(type);
    }

    private compare(actual: number, threshold: number, operator: DesktopAlertOperator): boolean {
        return operator === DesktopAlertOperator.GTE ? actual >= threshold : actual > threshold;
    }

    private latestVersion(metrics: Array<{ version: string | null; recordedAt: Date }>): string | null {
        return metrics.find((metric) => metric.version)?.version ?? null;
    }

    private async metricAverage(workspaceId: string, desktopAppId: string, version: string, type: DesktopPerformanceMetricType): Promise<number | null> {
        const result = await this.prisma.desktopMetric.aggregate({
            where: {
                workspaceId,
                desktopAppId,
                version,
                type,
            },
            _avg: { value: true },
        });

        return result._avg.value ?? null;
    }

    private percentIncrease(previous: number | null, current: number | null): number | null {
        if (previous === null || current === null || previous <= 0) return null;
        return ((current - previous) / previous) * 100;
    }
}