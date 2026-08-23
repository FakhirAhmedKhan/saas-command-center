# SaaS Command Center — Desktop Application Support
# Phases 15–18 Full Implementation Bundle

> Assumption: Desktop Phases 1–14 are already implemented exactly as the previous bundles described and are green in your repository.
>
> Status of this bundle: **UNVERIFIED / NOT EXECUTED**. The code below is implementation-ready, but you must run the verification section locally before marking any phase PASS.

---

## Scope

This bundle completes the Desktop feature:

- **Phase 15 — Desktop Alerts**
- **Phase 16 — AI Desktop Analysis**
- **Phase 17 — Security & Authorization Hardening**
- **Phase 18 — Full E2E Verification & Regression**

It deliberately reuses the existing SaaS Command Center infrastructure:

- `JwtAuthGuard`
- `WorkspaceAccessGuard`
- `WorkspaceRolesGuard`
- `NotificationService`
- existing repository connections / Code Explorer
- existing desktop build/test/release/telemetry/performance/security services
- existing Prisma/test helpers

It does **not** create a second notification system, a second repository system, or a second Code Explorer.

---

# 0. Files added/updated

```text
apps/api/prisma/models/
├── desktop-alert.prisma                         NEW
└── desktop-ai-analysis.prisma                   NEW

apps/api/src/modules/desktop-apps/
├── analysis/
│   ├── desktop-analysis-provider.interface.ts   NEW
│   └── desktop-analysis.provider.ts             NEW
├── controllers/
│   ├── desktop-alerts.controller.ts             NEW
│   ├── desktop-analysis.controller.ts           NEW
│   └── desktop-security.controller.ts           NEW
├── dto/
│   ├── desktop-alert.dto.ts                     NEW
│   └── desktop-analysis.dto.ts                  NEW
├── security/
│   ├── desktop-permissions.service.ts           NEW
│   ├── desktop-resource-scope.service.ts        NEW
│   └── desktop-secret-sanitizer.service.ts      NEW
├── services/
│   ├── desktop-alert-worker.service.ts          NEW
│   ├── desktop-alerts.service.ts                NEW
│   ├── desktop-analysis-context.service.ts      NEW
│   └── desktop-analysis.service.ts              NEW
└── desktop-apps.module.ts                       UPDATE

packages/shared-types/src/desktop-apps/
└── desktop-app.types.ts                         UPDATE

apps/web/src/features/desktop-apps/
├── desktop-alerts.tsx                           NEW
├── desktop-analysis-panel.tsx                   NEW
├── desktop-permission-gate.tsx                  NEW
├── desktop-apps-api.ts                          UPDATE
├── desktop-app-sub-nav.tsx                      UPDATE
└── index.ts                                     UPDATE

apps/web/src/app/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/
├── alerts/page.tsx                              NEW
└── page.tsx                                     UPDATE (mount AI panel)

packages/test-code/api/e2e/
├── desktop-alerts.e2e-spec.ts                   NEW
├── desktop-ai-analysis.e2e-spec.ts              NEW
├── desktop-security.e2e-spec.ts                 NEW
└── desktop-full-flow.e2e-spec.ts                NEW

packages/test-code/api/unit/modules/desktop-apps/
├── desktop-secret-sanitizer.service.spec.ts     NEW
└── desktop-analysis-context.service.spec.ts     NEW

packages/test-code/web/unit/features/desktop-apps/
├── desktop-alerts.test.tsx                      NEW
├── desktop-analysis-panel.test.tsx              NEW
├── desktop-permission-gate.test.tsx             NEW
└── desktop-apps-api-phase15-17.test.ts          NEW

packages/test-code/web/e2e/full-stack/
└── fullstack-desktop-final.spec.ts               NEW
```

---

# PHASE 15 — DESKTOP ALERTS

## 15.1 Prisma model

Create:

```text
apps/api/prisma/models/desktop-alert.prisma
```

```prisma
enum DesktopAlertRuleType {
  BUILD_FAILED
  CRASH_RATE
  STARTUP
  MEMORY
  CPU
  RELEASE_REGRESSION
  SIGNING_FAILURE
  TELEMETRY_UNAVAILABLE
}

enum DesktopAlertOperator {
  GT
  GTE
}

enum DesktopAlertIncidentStatus {
  OPEN
  RESOLVED
}

model DesktopAlertRule {
  id           String @id @default(uuid()) @db.Uuid
  workspaceId  String @map("workspace_id") @db.Uuid
  desktopAppId String @map("desktop_app_id") @db.Uuid

  name     String               @db.VarChar(160)
  type     DesktopAlertRuleType
  operator DesktopAlertOperator @default(GT)

  threshold       Float?
  cooldownMinutes Int     @default(60) @map("cooldown_minutes")
  enabled         Boolean @default(true)

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  desktopApp DesktopApplication @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)
  incidents  DesktopAlertIncident[]

  @@index([workspaceId, desktopAppId])
  @@index([desktopAppId, enabled])
  @@index([desktopAppId, type])
  @@map("desktop_alert_rules")
}

model DesktopAlertIncident {
  id           String @id @default(uuid()) @db.Uuid
  workspaceId  String @map("workspace_id") @db.Uuid
  desktopAppId String @map("desktop_app_id") @db.Uuid
  ruleId       String @map("rule_id") @db.Uuid

  status DesktopAlertIncidentStatus @default(OPEN)

  title   String @db.VarChar(255)
  message String @db.Text

  actualValue Float? @map("actual_value")
  threshold   Float?

  version String? @db.VarChar(64)
  buildId String? @map("build_id") @db.Uuid

  // Only OPEN incidents keep an activeKey. On resolution it becomes null.
  // This gives DB-level protection against duplicate active incidents.
  activeKey String? @unique @map("active_key") @db.VarChar(255)

  evidence Json @default("{}")

  triggeredAt     DateTime  @default(now()) @map("triggered_at") @db.Timestamptz(6)
  lastTriggeredAt DateTime  @default(now()) @map("last_triggered_at") @db.Timestamptz(6)
  resolvedAt      DateTime? @map("resolved_at") @db.Timestamptz(6)

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  rule       DesktopAlertRule   @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  desktopApp DesktopApplication @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)

  @@index([workspaceId, desktopAppId])
  @@index([desktopAppId, status, triggeredAt(sort: Desc)])
  @@index([ruleId, status])
  @@map("desktop_alert_incidents")
}
```

Update the existing Phase-1 `DesktopApplication` model once:

```prisma
alertRules     DesktopAlertRule[]
alertIncidents DesktopAlertIncident[]
```

Do not add duplicate relation fields if they already exist.

---

## 15.2 Shared contracts

Append to:

```text
packages/shared-types/src/desktop-apps/desktop-app.types.ts
```

```ts
export const DESKTOP_ALERT_RULE_TYPES = [
  'BUILD_FAILED',
  'CRASH_RATE',
  'STARTUP',
  'MEMORY',
  'CPU',
  'RELEASE_REGRESSION',
  'SIGNING_FAILURE',
  'TELEMETRY_UNAVAILABLE',
] as const;

export type DesktopAlertRuleType =
  (typeof DESKTOP_ALERT_RULE_TYPES)[number];

export type DesktopAlertOperator = 'GT' | 'GTE';
export type DesktopAlertIncidentStatus = 'OPEN' | 'RESOLVED';

export interface DesktopAlertRule {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  name: string;
  type: DesktopAlertRuleType;
  operator: DesktopAlertOperator;
  threshold: number | null;
  cooldownMinutes: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesktopAlertRuleInput {
  name: string;
  type: DesktopAlertRuleType;
  operator?: DesktopAlertOperator;
  threshold?: number | null;
  cooldownMinutes?: number;
  enabled?: boolean;
}

export type UpdateDesktopAlertRuleInput = Partial<
  Pick<
    CreateDesktopAlertRuleInput,
    'name' | 'operator' | 'threshold' | 'cooldownMinutes' | 'enabled'
  >
>;

export interface DesktopAlertIncident {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  ruleId: string;
  status: DesktopAlertIncidentStatus;
  title: string;
  message: string;
  actualValue: number | null;
  threshold: number | null;
  version: string | null;
  buildId: string | null;
  evidence: Record<string, unknown>;
  triggeredAt: string;
  lastTriggeredAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesktopAlertEvaluationResult {
  rulesEvaluated: number;
  triggered: number;
  resolved: number;
  unchanged: number;
}
```

---

## 15.3 DTO

Create:

```text
apps/api/src/modules/desktop-apps/dto/desktop-alert.dto.ts
```

```ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DesktopAlertOperator,
  DesktopAlertRuleType,
} from 'src/generated/prisma/enums';

export class CreateDesktopAlertRuleDto {
  @ApiProperty({ example: 'Crash rate > 2%' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ enum: DesktopAlertRuleType })
  @IsEnum(DesktopAlertRuleType)
  type!: DesktopAlertRuleType;

  @ApiPropertyOptional({ enum: DesktopAlertOperator, default: DesktopAlertOperator.GT })
  @IsOptional()
  @IsEnum(DesktopAlertOperator)
  operator?: DesktopAlertOperator;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10080)
  cooldownMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateDesktopAlertRuleDto extends PartialType(
  CreateDesktopAlertRuleDto,
) {}
```

---

## 15.4 Alert service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-alerts.service.ts
```

```ts
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
  ) {}

  async createRule(
    workspaceId: string,
    desktopAppId: string,
    dto: CreateDesktopAlertRuleDto,
  ) {
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

  async updateRule(
    workspaceId: string,
    desktopAppId: string,
    ruleId: string,
    dto: UpdateDesktopAlertRuleDto,
  ) {
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
        ...(dto.cooldownMinutes !== undefined
          ? { cooldownMinutes: dto.cooldownMinutes }
          : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
  }

  async deleteRule(
    workspaceId: string,
    desktopAppId: string,
    ruleId: string,
  ) {
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
        const created = await this.trigger(
          workspaceId,
          desktopAppId,
          app.applicationId,
          rule,
          signal,
        );

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

  private async evaluateRule(
    workspaceId: string,
    desktopAppId: string,
    rule: RuleRecord,
  ): Promise<AlertSignal> {
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

  private async buildFailedSignal(
    workspaceId: string,
    desktopAppId: string,
  ): Promise<AlertSignal> {
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

  private async performanceSignal(
    workspaceId: string,
    desktopAppId: string,
    rule: RuleRecord,
  ): Promise<AlertSignal> {
    const result = await this.performance.get(workspaceId, desktopAppId, {});
    const threshold = rule.threshold ?? 0;

    let actual: number | null = null;
    let label = 'Performance threshold';

    if (rule.type === DesktopAlertRuleType.CRASH_RATE) {
      actual =
        result.summary.crashFreeUsersPercent === null
          ? null
          : Math.max(0, 100 - result.summary.crashFreeUsersPercent);
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

    const breached =
      actual !== null && this.compare(actual, threshold, rule.operator);

    return {
      breached,
      actualValue: actual,
      threshold,
      title: `${label} alert`,
      message:
        actual === null
          ? `${label} has no runtime data.`
          : `${label} is ${actual.toFixed(2)} and the configured threshold is ${threshold}.`,
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

  private async releaseRegressionSignal(
    workspaceId: string,
    desktopAppId: string,
    rule: RuleRecord,
  ): Promise<AlertSignal> {
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

    const [currentStartup, previousStartup, currentCrashFree, previousCrashFree] =
      await Promise.all([
        this.metricAverage(
          workspaceId,
          desktopAppId,
          current.version,
          DesktopPerformanceMetricType.STARTUP_MS,
        ),
        this.metricAverage(
          workspaceId,
          desktopAppId,
          previous.version,
          DesktopPerformanceMetricType.STARTUP_MS,
        ),
        this.metricAverage(
          workspaceId,
          desktopAppId,
          current.version,
          DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT,
        ),
        this.metricAverage(
          workspaceId,
          desktopAppId,
          previous.version,
          DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT,
        ),
      ]);

    const startupDelta = this.percentIncrease(previousStartup, currentStartup);

    const previousCrashRate =
      previousCrashFree === null ? null : Math.max(0, 100 - previousCrashFree);
    const currentCrashRate =
      currentCrashFree === null ? null : Math.max(0, 100 - currentCrashFree);
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

  private async signingFailureSignal(
    workspaceId: string,
    desktopAppId: string,
  ): Promise<AlertSignal> {
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
      message:
        failed.length > 0
          ? `${failed.length} signing or notarization check(s) failed.`
          : 'Signing and notarization checks contain no failures.',
      version: null,
      buildId: null,
      dimension: `signing:${failed.map((finding) => finding.findingKey).sort().join('|') || 'healthy'}`,
      evidence: {
        findingIds: failed.map((finding) => finding.id),
        findingKeys: failed.map((finding) => finding.findingKey),
      },
    };
  }

  private async telemetryUnavailableSignal(
    workspaceId: string,
    desktopAppId: string,
  ): Promise<AlertSignal> {
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

    const connected = integrations.some(
      (item) => item.status === DesktopTelemetryIntegrationStatus.CONNECTED,
    );

    return {
      breached: !connected,
      actualValue: connected ? 0 : 1,
      threshold: 0,
      title: 'Desktop telemetry unavailable',
      message: connected
        ? 'At least one desktop telemetry provider is connected.'
        : 'No desktop telemetry provider is currently connected.',
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

  private async trigger(
    workspaceId: string,
    desktopAppId: string,
    applicationId: string,
    rule: RuleRecord,
    signal: AlertSignal,
  ): Promise<boolean> {
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

    if (
      latestResolved?.resolvedAt &&
      Date.now() - latestResolved.resolvedAt.getTime() <
        rule.cooldownMinutes * 60_000
    ) {
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }

      throw error;
    }

    await this.notifyWorkspace(
      workspaceId,
      applicationId,
      desktopAppId,
      incident.id,
      signal,
    );

    return true;
  }

  private async notifyWorkspace(
    workspaceId: string,
    applicationId: string,
    desktopAppId: string,
    incidentId: string,
    signal: AlertSignal,
  ) {
    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: {
          in: [
            WorkspaceRole.OWNER,
            WorkspaceRole.ADMIN,
            WorkspaceRole.DEVELOPER,
          ],
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

  async requireRule(
    workspaceId: string,
    desktopAppId: string,
    ruleId: string,
  ) {
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
    return ![
      DesktopAlertRuleType.BUILD_FAILED,
      DesktopAlertRuleType.SIGNING_FAILURE,
      DesktopAlertRuleType.TELEMETRY_UNAVAILABLE,
    ].includes(type);
  }

  private compare(
    actual: number,
    threshold: number,
    operator: DesktopAlertOperator,
  ): boolean {
    return operator === DesktopAlertOperator.GTE
      ? actual >= threshold
      : actual > threshold;
  }

  private latestVersion(
    metrics: Array<{ version: string | null; recordedAt: Date }>,
  ): string | null {
    return metrics.find((metric) => metric.version)?.version ?? null;
  }

  private async metricAverage(
    workspaceId: string,
    desktopAppId: string,
    version: string,
    type: DesktopPerformanceMetricType,
  ): Promise<number | null> {
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

  private percentIncrease(
    previous: number | null,
    current: number | null,
  ): number | null {
    if (previous === null || current === null || previous <= 0) return null;
    return ((current - previous) / previous) * 100;
  }
}
```

> If your generated Prisma client is imported from `src/generated/prisma/enums` in this module rather than `client`, keep your repository's existing import convention. Do not create duplicate enum definitions.

---

## 15.5 Alert controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-alerts.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateDesktopAlertRuleDto, UpdateDesktopAlertRuleDto } from '../dto/desktop-alert.dto';
import { DesktopAlertsService } from '../services/desktop-alerts.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Alerts')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/alerts')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopAlertsController {
  constructor(private readonly service: DesktopAlertsService) {}

  @Get('rules')
  rules(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
  ) {
    return this.service.listRules(workspaceId, desktopAppId);
  }

  @Post('rules')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  createRule(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Body() dto: CreateDesktopAlertRuleDto,
  ) {
    return this.service.createRule(workspaceId, desktopAppId, dto);
  }

  @Patch('rules/:ruleId')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  updateRule(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateDesktopAlertRuleDto,
  ) {
    return this.service.updateRule(workspaceId, desktopAppId, ruleId, dto);
  }

  @Delete('rules/:ruleId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  deleteRule(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    return this.service.deleteRule(workspaceId, desktopAppId, ruleId);
  }

  @Get('incidents')
  incidents(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
  ) {
    return this.service.listIncidents(workspaceId, desktopAppId);
  }

  @Post('evaluate')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  evaluate(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
  ) {
    return this.service.evaluateApp(workspaceId, desktopAppId);
  }
}
```

---

## 15.6 Background-worker entry point

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-alert-worker.service.ts
```

This service is deliberately an **entry point for your existing worker/background scheduler**. It does not create a second scheduler.

```ts
import { PrismaService } from '../../../database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { DesktopAlertsService } from './desktop-alerts.service';

@Injectable()
export class DesktopAlertWorkerService {
  private readonly logger = new Logger(DesktopAlertWorkerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: DesktopAlertsService,
  ) {}

  async runOnce() {
    if (this.running) {
      return { skipped: true, reason: 'already-running' as const };
    }

    this.running = true;

    try {
      const apps = await this.prisma.desktopApplication.findMany({
        where: {
          alertRules: { some: { enabled: true } },
          application: { archivedAt: null },
        },
        select: {
          id: true,
          application: {
            select: { workspaceId: true },
          },
        },
      });

      let evaluated = 0;
      let failed = 0;

      for (const app of apps) {
        try {
          await this.alerts.evaluateApp(app.application.workspaceId, app.id);
          evaluated += 1;
        } catch (error) {
          failed += 1;
          this.logger.error(
            `Desktop alert evaluation failed for ${app.id}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      return {
        skipped: false,
        apps: apps.length,
        evaluated,
        failed,
      };
    } finally {
      this.running = false;
    }
  }
}
```

Wire `DesktopAlertWorkerService.runOnce()` into the **existing** worker cadence you already use for operational jobs. For deterministic E2E, tests call the explicit `/alerts/evaluate` route rather than waiting for a timer.

---

# PHASE 16 — AI DESKTOP ANALYSIS

## 16.1 Prisma AI history model

Create:

```text
apps/api/prisma/models/desktop-ai-analysis.prisma
```

```prisma
enum DesktopAnalysisAction {
  BUILD_FAILURE
  CRASH_INCREASE
  PERFORMANCE_REGRESSION
  RELEASE_HEALTH
  CUSTOM
}

enum DesktopAnalysisConfidence {
  LIMITED
  SUPPORTED
}

model DesktopAiAnalysis {
  id              String @id @default(uuid()) @db.Uuid
  workspaceId     String @map("workspace_id") @db.Uuid
  desktopAppId    String @map("desktop_app_id") @db.Uuid
  createdByUserId String @map("created_by_user_id") @db.Uuid

  action   DesktopAnalysisAction
  question String?               @db.Text

  answer     String                    @db.Text
  confidence DesktopAnalysisConfidence
  evidence   Json

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  desktopApp DesktopApplication @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)

  @@index([workspaceId, desktopAppId, createdAt(sort: Desc)])
  @@index([createdByUserId, createdAt(sort: Desc)])
  @@map("desktop_ai_analyses")
}
```

Add exactly one relation to `DesktopApplication`:

```prisma
aiAnalyses DesktopAiAnalysis[]
```

---

## 16.2 Shared AI types

Append to the desktop shared type file:

```ts
export const DESKTOP_ANALYSIS_ACTIONS = [
  'BUILD_FAILURE',
  'CRASH_INCREASE',
  'PERFORMANCE_REGRESSION',
  'RELEASE_HEALTH',
  'CUSTOM',
] as const;

export type DesktopAnalysisAction =
  (typeof DESKTOP_ANALYSIS_ACTIONS)[number];

export type DesktopAnalysisConfidence = 'LIMITED' | 'SUPPORTED';

export type DesktopAnalysisEvidenceType =
  | 'REPOSITORY'
  | 'BUILD'
  | 'ARTIFACT'
  | 'TEST'
  | 'RELEASE'
  | 'CRASH'
  | 'PERFORMANCE'
  | 'DEPENDENCY'
  | 'SECURITY'
  | 'ALERT';

export interface DesktopAnalysisEvidence {
  type: DesktopAnalysisEvidenceType;
  id: string;
  label: string;
  href?: string;
}

export interface AnalyzeDesktopAppInput {
  action: DesktopAnalysisAction;
  question?: string;
  buildId?: string;
  releaseId?: string;
  crashId?: string;
}

export interface DesktopAnalysisResult {
  id: string;
  action: DesktopAnalysisAction;
  answer: string;
  confidence: DesktopAnalysisConfidence;
  evidence: DesktopAnalysisEvidence[];
  createdAt: string;
}
```

---

## 16.3 AI DTO

Create:

```text
apps/api/src/modules/desktop-apps/dto/desktop-analysis.dto.ts
```

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { DesktopAnalysisAction } from 'src/generated/prisma/enums';

export class AnalyzeDesktopAppDto {
  @ApiProperty({ enum: DesktopAnalysisAction })
  @IsEnum(DesktopAnalysisAction)
  action!: DesktopAnalysisAction;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  question?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  buildId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  crashId?: string;
}
```

---

## 16.4 Provider interface

Create:

```text
apps/api/src/modules/desktop-apps/analysis/desktop-analysis-provider.interface.ts
```

```ts
export interface DesktopAnalysisProviderInput {
  system: string;
  prompt: string;
}

export interface DesktopAnalysisProvider {
  analyze(input: DesktopAnalysisProviderInput): Promise<string>;
}
```

---

## 16.5 Configured provider

Create:

```text
apps/api/src/modules/desktop-apps/analysis/desktop-analysis.provider.ts
```

```ts
import type {
  DesktopAnalysisProvider,
  DesktopAnalysisProviderInput,
} from './desktop-analysis-provider.interface';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ConfiguredDesktopAnalysisProvider
  implements DesktopAnalysisProvider
{
  async analyze(input: DesktopAnalysisProviderInput): Promise<string> {
    const endpoint = process.env.DESKTOP_AI_ANALYSIS_URL?.trim();
    const apiKey = process.env.DESKTOP_AI_ANALYSIS_API_KEY?.trim();
    const model = process.env.DESKTOP_AI_ANALYSIS_MODEL?.trim();

    if (!endpoint || !apiKey || !model) {
      throw new ServiceUnavailableException(
        'Desktop AI analysis provider is not configured.',
      );
    }

    const url = new URL(endpoint);

    if (url.protocol !== 'https:' && process.env.NODE_ENV !== 'test') {
      throw new ServiceUnavailableException(
        'Desktop AI analysis endpoint must use HTTPS.',
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          system: input.system,
          prompt: input.prompt,
        }),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Desktop AI analysis provider failed.',
        );
      }

      const data = (await response.json()) as { text?: unknown };

      if (typeof data.text !== 'string' || !data.text.trim()) {
        throw new ServiceUnavailableException(
          'Desktop AI analysis provider returned an invalid response.',
        );
      }

      return data.text.trim();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;

      throw new ServiceUnavailableException(
        'Desktop AI analysis provider failed.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
```

Environment variables:

```env
DESKTOP_AI_ANALYSIS_URL=https://your-provider.example/v1/analyze
DESKTOP_AI_ANALYSIS_API_KEY=server-only-secret
DESKTOP_AI_ANALYSIS_MODEL=your-model
```

Never expose the API key to Next.js `NEXT_PUBLIC_*` variables.

---

## 16.6 Secret sanitizer

Create:

```text
apps/api/src/modules/desktop-apps/security/desktop-secret-sanitizer.service.ts
```

```ts
import { Injectable } from '@nestjs/common';

const SECRET_KEY =
  /(secret|token|password|private[_-]?key|api[_-]?key|authorization|credential|certificate|cert|dsn)/i;

const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /sk-[A-Za-z0-9_-]{20,}/g,
];

@Injectable()
export class DesktopSecretSanitizerService {
  sanitize<T>(value: T): T {
    return this.walk(value, new WeakSet<object>()) as T;
  }

  private walk(value: unknown, seen: WeakSet<object>): unknown {
    if (typeof value === 'string') return this.redactString(value);
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    if (seen.has(value)) return '[REDACTED:CIRCULAR]';
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => this.walk(item, seen));
    }

    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(source)) {
      if (SECRET_KEY.test(key)) {
        result[key] = '[REDACTED]';
        continue;
      }

      result[key] = this.walk(child, seen);
    }

    return result;
  }

  private redactString(value: string): string {
    let output = value;

    for (const pattern of SECRET_VALUE_PATTERNS) {
      output = output.replace(pattern, '[REDACTED]');
    }

    return output;
  }
}
```

---

## 16.7 AI context aggregation

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-analysis-context.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopSecretSanitizerService } from '../security/desktop-secret-sanitizer.service';

@Injectable()
export class DesktopAnalysisContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly sanitizer: DesktopSecretSanitizerService,
  ) {}

  async build(
    workspaceId: string,
    desktopAppId: string,
    options: {
      buildId?: string;
      releaseId?: string;
      crashId?: string;
    } = {},
  ) {
    const app = await this.desktopApps.findOne(workspaceId, desktopAppId);

    const [repository, builds, releases, crashes, metrics, dependencies, security, alerts] =
      await Promise.all([
        this.prisma.repositoryConnection.findFirst({
          where: {
            workspaceId,
            applicationId: app.applicationId,
          },
          select: {
            id: true,
            fullName: true,
            defaultBranch: true,
            htmlUrl: true,
            lastSyncedAt: true,
          },
        }),

        this.prisma.desktopBuild.findMany({
          where: {
            workspaceId,
            desktopAppId,
            ...(options.buildId ? { id: options.buildId } : {}),
          },
          include: {
            artifacts: true,
            testRuns: {
              include: { failures: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: options.buildId ? 1 : 5,
        }),

        this.prisma.desktopRelease.findMany({
          where: {
            workspaceId,
            desktopAppId,
            ...(options.releaseId ? { id: options.releaseId } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: options.releaseId ? 1 : 5,
        }),

        this.prisma.desktopCrash.findMany({
          where: {
            workspaceId,
            desktopAppId,
            ...(options.crashId ? { id: options.crashId } : {}),
          },
          orderBy: { lastSeenAt: 'desc' },
          take: options.crashId ? 1 : 20,
        }),

        this.prisma.desktopMetric.findMany({
          where: { workspaceId, desktopAppId },
          select: {
            id: true,
            type: true,
            value: true,
            unit: true,
            version: true,
            platform: true,
            architecture: true,
            channel: true,
            recordedAt: true,
          },
          orderBy: { recordedAt: 'desc' },
          take: 100,
        }),

        this.prisma.desktopDependency.findMany({
          where: { workspaceId, desktopAppId },
          select: {
            id: true,
            ecosystem: true,
            manifestPath: true,
            name: true,
            currentVersion: true,
            latestVersion: true,
            direct: true,
            riskStatus: true,
            severity: true,
            advisoryIds: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        }),

        this.prisma.desktopSecurityFinding.findMany({
          where: { workspaceId, desktopAppId },
          select: {
            id: true,
            findingKey: true,
            type: true,
            status: true,
            severity: true,
            title: true,
            message: true,
            sourcePath: true,
            evidence: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        }),

        this.prisma.desktopAlertIncident.findMany({
          where: { workspaceId, desktopAppId },
          select: {
            id: true,
            status: true,
            title: true,
            message: true,
            actualValue: true,
            threshold: true,
            version: true,
            buildId: true,
            triggeredAt: true,
            resolvedAt: true,
          },
          orderBy: { triggeredAt: 'desc' },
          take: 20,
        }),
      ]);

    if (options.buildId && builds.length === 0) {
      throw new NotFoundException('Desktop build not found.');
    }

    if (options.releaseId && releases.length === 0) {
      throw new NotFoundException('Desktop release not found.');
    }

    if (options.crashId && crashes.length === 0) {
      throw new NotFoundException('Desktop crash not found.');
    }

    const context = {
      desktopApp: {
        id: app.id,
        name: app.application.name,
        platform: app.platform,
        framework: app.framework,
        architecture: app.architecture,
        packageName: app.packageName,
        currentVersion: app.currentVersion,
        currentBuildNumber: app.currentBuildNumber,
        updateChannel: app.updateChannel,
      },

      repository,

      // Commits/diffs are represented only by persisted authorized evidence here.
      // The build records contain branch + commitSha. If your repository module
      // already exposes commit/diff context helpers, merge their sanitized output
      // here rather than making direct GitHub calls from this service.
      builds: builds.map((build) => ({
        id: build.id,
        workflowRunId: build.workflowRunId,
        commitSha: build.commitSha,
        branch: build.branch,
        version: build.version,
        buildNumber: build.buildNumber,
        platform: build.platform,
        architecture: build.architecture,
        status: build.status,
        durationMs: build.durationMs,
        startedAt: build.startedAt,
        completedAt: build.completedAt,
        artifacts: build.artifacts.map((artifact) => ({
          id: artifact.id,
          type: artifact.type,
          fileName: artifact.fileName,
          platform: artifact.platform,
          architecture: artifact.architecture,
          sizeBytes: artifact.sizeBytes?.toString() ?? null,
          checksum: artifact.checksum,
          // externalUrl intentionally omitted from AI context.
        })),
        tests: build.testRuns.map((run) => ({
          id: run.id,
          type: run.type,
          status: run.status,
          passed: run.passed,
          failed: run.failed,
          skipped: run.skipped,
          durationMs: run.durationMs,
          failures: run.failures.slice(0, 20).map((failure) => ({
            suite: failure.suite,
            testName: failure.testName,
            message: failure.message,
            file: failure.file,
          })),
        })),
      })),

      releases: releases.map((release) => ({
        id: release.id,
        buildId: release.buildId,
        version: release.version,
        buildNumber: release.buildNumber,
        channel: release.channel,
        platform: release.platform,
        architecture: release.architecture,
        status: release.status,
        releaseNotes: release.releaseNotes,
        releasedAt: release.releasedAt,
      })),

      crashes: crashes.map((crash) => ({
        id: crash.id,
        fingerprint: crash.fingerprint,
        message: crash.message,
        count: crash.count,
        affectedUsers: crash.affectedUsers,
        version: crash.version,
        platform: crash.platform,
        architecture: crash.architecture,
        channel: crash.channel,
        firstSeenAt: crash.firstSeenAt,
        lastSeenAt: crash.lastSeenAt,
      })),

      performance: metrics,
      dependencies,
      securityFindings: security,
      alerts,
    };

    // CRITICAL: telemetry integration records are not selected at all above.
    // Therefore secretCiphertext/provider tokens cannot enter the prompt.
    return this.sanitizer.sanitize(context);
  }
}
```

---

## 16.8 AI analysis service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-analysis.service.ts
```

```ts
import type { DesktopAnalysisEvidence } from '@command-center/shared-types';
import { PrismaService } from '../../../database/prisma.service';
import type { DesktopAnalysisProvider } from '../analysis/desktop-analysis-provider.interface';
import { ConfiguredDesktopAnalysisProvider } from '../analysis/desktop-analysis.provider';
import { AnalyzeDesktopAppDto } from '../dto/desktop-analysis.dto';
import { DesktopAnalysisContextService } from './desktop-analysis-context.service';
import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  DesktopAnalysisConfidence,
  Prisma,
} from 'src/generated/prisma/client';

@Injectable()
export class DesktopAnalysisService {
  private provider: DesktopAnalysisProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: DesktopAnalysisContextService,
    configured: ConfiguredDesktopAnalysisProvider,
  ) {
    this.provider = configured;
  }

  setProviderForTesting(provider: DesktopAnalysisProvider) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('AI provider override is test-only.');
    }

    this.provider = provider;
  }

  async analyze(
    workspaceId: string,
    desktopAppId: string,
    userId: string,
    dto: AnalyzeDesktopAppDto,
  ) {
    const context = await this.context.build(workspaceId, desktopAppId, {
      buildId: dto.buildId,
      releaseId: dto.releaseId,
      crashId: dto.crashId,
    });

    const evidence = this.evidence(context, workspaceId, desktopAppId);

    const confidence =
      evidence.length >= 2
        ? DesktopAnalysisConfidence.SUPPORTED
        : DesktopAnalysisConfidence.LIMITED;

    const system = `
You analyze desktop engineering data from SaaS Command Center.

Mandatory answer structure:
Evidence:
- only facts present in supplied context

Correlation:
- relationships observed in the supplied context

Likely cause:
- plausible explanation only when evidence supports it

Unknown cause:
- explicitly state what cannot be proven from available evidence

Rules:
- Never invent logs, commits, files, metrics, releases or root causes.
- Never claim correlation proves causation.
- State uncertainty explicitly.
- Never mention or infer secrets, credentials, private keys, signing certificates, provider tokens or hidden configuration.
- Never use knowledge from another workspace.
- Prefer evidence IDs that can be opened in SaaS Command Center.
- Be concise and actionable.
`.trim();

    const prompt = JSON.stringify(
      {
        action: dto.action,
        question: dto.question ?? null,
        context,
      },
      null,
      2,
    ).slice(0, 60_000);

    let answer: string;

    try {
      answer = await this.provider.analyze({ system, prompt });
    } catch {
      throw new BadGatewayException(
        'Desktop AI analysis is temporarily unavailable.',
      );
    }

    answer = this.ensureGroundingSections(answer);

    const stored = await this.prisma.desktopAiAnalysis.create({
      data: {
        workspaceId,
        desktopAppId,
        createdByUserId: userId,
        action: dto.action,
        question: dto.question?.trim() || null,
        answer,
        confidence,
        evidence: evidence as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: stored.id,
      action: stored.action,
      answer: stored.answer,
      confidence: stored.confidence,
      evidence,
      createdAt: stored.createdAt.toISOString(),
    };
  }

  private evidence(
    context: Awaited<ReturnType<DesktopAnalysisContextService['build']>>,
    workspaceId: string,
    desktopAppId: string,
  ): DesktopAnalysisEvidence[] {
    const evidence: DesktopAnalysisEvidence[] = [];

    if (context.repository) {
      evidence.push({
        type: 'REPOSITORY',
        id: context.repository.id,
        label: context.repository.fullName,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/code`,
      });
    }

    for (const build of context.builds) {
      evidence.push({
        type: 'BUILD',
        id: build.id,
        label: `Build ${build.buildNumber ?? build.workflowRunId}`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${build.id}`,
      });

      for (const artifact of build.artifacts) {
        evidence.push({
          type: 'ARTIFACT',
          id: artifact.id,
          label: artifact.fileName,
          href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${build.id}`,
        });
      }

      for (const run of build.tests) {
        if (run.failed > 0) {
          evidence.push({
            type: 'TEST',
            id: run.id,
            label: `${run.type}: ${run.failed} failed`,
            href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests`,
          });
        }
      }
    }

    for (const release of context.releases) {
      evidence.push({
        type: 'RELEASE',
        id: release.id,
        label: `${release.version} ${release.channel}`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases`,
      });
    }

    for (const crash of context.crashes.slice(0, 10)) {
      evidence.push({
        type: 'CRASH',
        id: crash.id,
        label: `${crash.message.slice(0, 80)} (${crash.count})`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/crashes`,
      });
    }

    for (const metric of context.performance.slice(0, 10)) {
      evidence.push({
        type: 'PERFORMANCE',
        id: metric.id,
        label: `${metric.type}: ${metric.value} ${metric.unit}`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/performance`,
      });
    }

    for (const dependency of context.dependencies
      .filter((item) => item.riskStatus !== 'CURRENT')
      .slice(0, 10)) {
      evidence.push({
        type: 'DEPENDENCY',
        id: dependency.id,
        label: `${dependency.name} ${dependency.currentVersion}`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/dependencies`,
      });
    }

    for (const finding of context.securityFindings
      .filter((item) => item.status !== 'PASS')
      .slice(0, 10)) {
      evidence.push({
        type: 'SECURITY',
        id: finding.id,
        label: finding.title,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/security`,
      });
    }

    for (const alert of context.alerts.slice(0, 10)) {
      evidence.push({
        type: 'ALERT',
        id: alert.id,
        label: alert.title,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts`,
      });
    }

    const unique = new Map<string, DesktopAnalysisEvidence>();

    for (const item of evidence) {
      unique.set(`${item.type}:${item.id}`, item);
    }

    return [...unique.values()].slice(0, 50);
  }

  private ensureGroundingSections(answer: string): string {
    const required = ['Evidence:', 'Correlation:', 'Likely cause:', 'Unknown cause:'];

    if (required.every((section) => answer.includes(section))) {
      return answer;
    }

    return [
      answer.trim(),
      '',
      'Evidence:',
      '- See the evidence references attached to this analysis.',
      '',
      'Correlation:',
      '- Available records may show correlation; correlation does not prove causation.',
      '',
      'Likely cause:',
      '- No additional cause can be asserted beyond the supplied evidence.',
      '',
      'Unknown cause:',
      '- Root cause remains uncertain where the available evidence is incomplete.',
    ].join('\n');
  }
}
```

---

## 16.9 AI controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-analysis.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { AnalyzeDesktopAppDto } from '../dto/desktop-analysis.dto';
import { DesktopAnalysisService } from '../services/desktop-analysis.service';
import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Desktop AI Analysis')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/analysis')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopAnalysisController {
  constructor(private readonly service: DesktopAnalysisService) {}

  @Post()
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  analyze(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AnalyzeDesktopAppDto,
  ) {
    return this.service.analyze(
      workspaceId,
      desktopAppId,
      request.user.id,
      dto,
    );
  }
}
```


---

# PHASE 17 — SECURITY & AUTHORIZATION HARDENING

Phase 17 does **not** introduce a second authorization system. It adds a small desktop permission contract and a workspace-scoped resource helper, then applies the same guards already used throughout SaaS Command Center.

## 17.1 Shared permission contract

Append to:

```text
packages/shared-types/src/desktop-apps/desktop-app.types.ts
```

```ts
export type DesktopWorkspaceRole =
  | 'OWNER'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'VIEWER';

export interface DesktopPermissions {
  role: DesktopWorkspaceRole;
  canRead: true;
  canWrite: boolean;
  canManage: boolean;
  canAnalyze: boolean;
  canConfigureSecrets: boolean;
}
```

---

## 17.2 Desktop permissions service

Create:

```text
apps/api/src/modules/desktop-apps/security/desktop-permissions.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import type { DesktopPermissions } from '@command-center/shared-types';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@Injectable()
export class DesktopPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    workspaceId: string,
    userId: string,
  ): Promise<DesktopPermissions> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Workspace access denied.');
    }

    const canWrite =
      membership.role === WorkspaceRole.OWNER ||
      membership.role === WorkspaceRole.ADMIN ||
      membership.role === WorkspaceRole.DEVELOPER;

    const canManage =
      membership.role === WorkspaceRole.OWNER ||
      membership.role === WorkspaceRole.ADMIN;

    return {
      role: membership.role,
      canRead: true,
      canWrite,
      canManage,
      canAnalyze: canWrite,
      canConfigureSecrets: canManage,
    };
  }
}
```

---

## 17.3 Workspace-scoped desktop resource service

Create:

```text
apps/api/src/modules/desktop-apps/security/desktop-resource-scope.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class DesktopResourceScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async application(workspaceId: string, desktopAppId: string) {
    const value = await this.prisma.desktopApplication.findFirst({
      where: {
        id: desktopAppId,
        application: {
          workspaceId,
        },
      },
      include: {
        application: true,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop application not found.');
    }

    return value;
  }

  async build(
    workspaceId: string,
    desktopAppId: string,
    buildId: string,
  ) {
    const value = await this.prisma.desktopBuild.findFirst({
      where: {
        id: buildId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop build not found.');
    }

    return value;
  }

  async artifact(
    workspaceId: string,
    desktopAppId: string,
    artifactId: string,
  ) {
    const value = await this.prisma.desktopBuildArtifact.findFirst({
      where: {
        id: artifactId,
        build: {
          workspaceId,
          desktopAppId,
        },
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop artifact not found.');
    }

    return value;
  }

  async testRun(
    workspaceId: string,
    desktopAppId: string,
    testRunId: string,
  ) {
    const value = await this.prisma.desktopTestRun.findFirst({
      where: {
        id: testRunId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop test run not found.');
    }

    return value;
  }

  async release(
    workspaceId: string,
    desktopAppId: string,
    releaseId: string,
  ) {
    const value = await this.prisma.desktopRelease.findFirst({
      where: {
        id: releaseId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop release not found.');
    }

    return value;
  }

  async telemetryIntegration(
    workspaceId: string,
    desktopAppId: string,
    integrationId: string,
  ) {
    const value = await this.prisma.desktopTelemetryIntegration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop telemetry integration not found.');
    }

    return value;
  }

  async crash(
    workspaceId: string,
    desktopAppId: string,
    crashId: string,
  ) {
    const value = await this.prisma.desktopCrash.findFirst({
      where: {
        id: crashId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop crash not found.');
    }

    return value;
  }

  async dependency(
    workspaceId: string,
    desktopAppId: string,
    dependencyId: string,
  ) {
    const value = await this.prisma.desktopDependency.findFirst({
      where: {
        id: dependencyId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop dependency not found.');
    }

    return value;
  }

  async securityFinding(
    workspaceId: string,
    desktopAppId: string,
    findingId: string,
  ) {
    const value = await this.prisma.desktopSecurityFinding.findFirst({
      where: {
        id: findingId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop security finding not found.');
    }

    return value;
  }

  async alertRule(
    workspaceId: string,
    desktopAppId: string,
    ruleId: string,
  ) {
    const value = await this.prisma.desktopAlertRule.findFirst({
      where: {
        id: ruleId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop alert rule not found.');
    }

    return value;
  }

  async alertIncident(
    workspaceId: string,
    desktopAppId: string,
    incidentId: string,
  ) {
    const value = await this.prisma.desktopAlertIncident.findFirst({
      where: {
        id: incidentId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop alert incident not found.');
    }

    return value;
  }

  async analysis(
    workspaceId: string,
    desktopAppId: string,
    analysisId: string,
  ) {
    const value = await this.prisma.desktopAiAnalysis.findFirst({
      where: {
        id: analysisId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop AI analysis not found.');
    }

    return value;
  }
}
```

The important rule is simple: **never trust a resource UUID by itself**. Every nested desktop resource lookup must include the authenticated workspace and the parent desktop application where applicable.

---

## 17.4 Permission endpoint

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-security.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { DesktopPermissionsService } from '../security/desktop-permissions.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Desktop Security')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopSecurityController {
  constructor(private readonly permissions: DesktopPermissionsService) {}

  @Get('permissions')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
    WorkspaceRole.VIEWER,
  )
  getPermissions(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) _desktopAppId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    void _desktopAppId;
    return this.permissions.get(workspaceId, request.user.id);
  }
}
```

`WorkspaceAccessGuard` is authoritative for access to the workspace. The endpoint returns capabilities only; it does not grant them.

---

## 17.5 Final DesktopAppsModule registration

Open:

```text
apps/api/src/modules/desktop-apps/desktop-apps.module.ts
```

Do **not** replace the Phase 1–14 registrations. Add these imports exactly once:

```ts
import { TeamOperationsModule } from '../team-operations/team-operations.module';
import { ConfiguredDesktopAnalysisProvider } from './analysis/desktop-analysis.provider';
import { DesktopAlertsController } from './controllers/desktop-alerts.controller';
import { DesktopAnalysisController } from './controllers/desktop-analysis.controller';
import { DesktopSecurityController } from './controllers/desktop-security.controller';
import { DesktopPermissionsService } from './security/desktop-permissions.service';
import { DesktopResourceScopeService } from './security/desktop-resource-scope.service';
import { DesktopSecretSanitizerService } from './security/desktop-secret-sanitizer.service';
import { DesktopAlertWorkerService } from './services/desktop-alert-worker.service';
import { DesktopAlertsService } from './services/desktop-alerts.service';
import { DesktopAnalysisContextService } from './services/desktop-analysis-context.service';
import { DesktopAnalysisService } from './services/desktop-analysis.service';
```

Add `TeamOperationsModule` to the module `imports` array **only once**:

```ts
TeamOperationsModule,
```

Add to `controllers`:

```ts
DesktopAlertsController,
DesktopAnalysisController,
DesktopSecurityController,
```

Add to `providers`:

```ts
DesktopAlertsService,
DesktopAlertWorkerService,
DesktopAnalysisContextService,
ConfiguredDesktopAnalysisProvider,
DesktopAnalysisService,
DesktopPermissionsService,
DesktopResourceScopeService,
DesktopSecretSanitizerService,
```

Add to `exports` if another module will invoke alert evaluation or AI analysis:

```ts
DesktopAlertsService,
DesktopAnalysisService,
DesktopPermissionsService,
```

### Important module rule

Do not create a second `NotificationService` provider inside `DesktopAppsModule`. `TeamOperationsModule` already exports the real notification service, so import the module and inject the existing service.

---

## 17.6 Migration for Phases 15–16

After adding the two Prisma files and the new relations on `DesktopApplication`, run this against your **local development database only**:

```powershell
pnpm --dir apps/api exec prisma format
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate dev --name desktop_alerts_ai_analysis
pnpm --dir apps/api exec prisma generate
```

Expected additions:

```text
DesktopAlertRuleType
DesktopAlertOperator
DesktopAlertIncidentStatus
DesktopAnalysisAction
DesktopAnalysisConfidence

desktop_alert_rules
desktop_alert_incidents
desktop_ai_analyses
```

Before accepting the migration, inspect it:

```powershell
Get-Content apps/api/prisma/migrations/*desktop_alerts_ai_analysis*/migration.sql
```

For this phase it should be additive. If you see an unexpected `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or destructive change to an existing desktop/mobile/web table, stop and inspect the schema history before applying it.

**Never run this migration command while `DATABASE_URL` points to production/Neon.**

---

## 17.7 Required workspace-scoping audit

Run this search after Phase 17:

```powershell
Get-ChildItem apps/api/src/modules/desktop-apps -Recurse -Filter *.ts |
  Select-String -Pattern 'findUnique\(|findUniqueOrThrow\('
```

A `findUnique({ where: { id } })` is not automatically wrong, but for any client-controlled nested desktop resource ID, verify ownership first or replace it with a workspace-scoped `findFirst` query. The secure shape is:

```ts
await prisma.desktopBuild.findFirst({
  where: {
    id: buildId,
    workspaceId,
    desktopAppId,
  },
});
```

For repository data, keep the existing repository module's workspace authorization and GitHub ownership checks rather than rebuilding them.

---

## 17.8 Webhook hardening rule

Do **not** create a new desktop GitHub webhook endpoint. Desktop builds already consume the repository/GitHub integration. Keep using the existing endpoint:

```text
POST /api/v1/repositories/github/webhook
```

The existing repository webhook service already verifies the `sha256` HMAC signature and dedupes GitHub delivery IDs. Phase 18 will re-run that repository E2E suite as part of desktop regression.

---

# FRONTEND — PHASES 15–17

## 19. Extend desktop API client

Open:

```text
apps/web/src/features/desktop-apps/desktop-apps-api.ts
```

Keep every existing function and import. Add these type imports:

```ts
import type {
  CreateDesktopAlertRuleInput,
  DesktopAnalysisResult,
  DesktopAlertIncident,
  DesktopAlertRule,
  DesktopPermissions,
  AnalyzeDesktopAppInput,
  UpdateDesktopAlertRuleInput,
} from '@command-center/shared-types';
```

Then append:

```ts
export function listDesktopAlertRules(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<DesktopAlertRule[]>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts/rules`,
  );
}

export function createDesktopAlertRule(
  workspaceId: string,
  desktopAppId: string,
  input: CreateDesktopAlertRuleInput,
) {
  return apiRequest<DesktopAlertRule>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts/rules`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export function updateDesktopAlertRule(
  workspaceId: string,
  desktopAppId: string,
  ruleId: string,
  input: UpdateDesktopAlertRuleInput,
) {
  return apiRequest<DesktopAlertRule>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts/rules/${ruleId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteDesktopAlertRule(
  workspaceId: string,
  desktopAppId: string,
  ruleId: string,
) {
  return apiRequest<{ success: true }>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts/rules/${ruleId}`,
    {
      method: 'DELETE',
    },
  );
}

export function listDesktopAlertIncidents(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<DesktopAlertIncident[]>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts/incidents`,
  );
}

export function evaluateDesktopAlerts(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<{
    rulesEvaluated: number;
    triggered: number;
    resolved: number;
    unchanged: number;
  }>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts/evaluate`,
    {
      method: 'POST',
    },
  );
}

export function analyzeDesktopApplication(
  workspaceId: string,
  desktopAppId: string,
  input: AnalyzeDesktopAppInput,
) {
  return apiRequest<DesktopAnalysisResult>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/analysis`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export function getDesktopPermissions(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<DesktopPermissions>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/permissions`,
  );
}
```

If your existing `apiRequest` accepts `json:` instead of `body:`, keep the existing project convention. Do not maintain two request shapes in the same client.

---

## 20. Permission gate

Create:

```text
apps/web/src/features/desktop-apps/desktop-permission-gate.tsx
```

```tsx
import type { DesktopPermissions } from '@command-center/shared-types';
import type { ReactNode } from 'react';

type DesktopPermissionRequirement =
  | 'read'
  | 'write'
  | 'manage'
  | 'analyze'
  | 'secrets';

interface Props {
  permissions: DesktopPermissions | null;
  require: DesktopPermissionRequirement;
  children: ReactNode;
  fallback?: ReactNode;
}

function allowed(
  permissions: DesktopPermissions,
  requirement: DesktopPermissionRequirement,
) {
  switch (requirement) {
    case 'read':
      return permissions.canRead;
    case 'write':
      return permissions.canWrite;
    case 'manage':
      return permissions.canManage;
    case 'analyze':
      return permissions.canAnalyze;
    case 'secrets':
      return permissions.canConfigureSecrets;
  }
}

export function DesktopPermissionGate({
  permissions,
  require,
  children,
  fallback = null,
}: Props) {
  if (!permissions || !allowed(permissions, require)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

The backend remains authoritative. This component only keeps the UI from presenting controls the user cannot use.

---

## 21. Desktop Alerts UI

Create:

```text
apps/web/src/features/desktop-apps/desktop-alerts.tsx
```

```tsx
'use client';

import {
  createDesktopAlertRule,
  deleteDesktopAlertRule,
  evaluateDesktopAlerts,
  getDesktopPermissions,
  listDesktopAlertIncidents,
  listDesktopAlertRules,
  updateDesktopAlertRule,
} from './desktop-apps-api';
import { DesktopPermissionGate } from './desktop-permission-gate';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  DesktopAlertIncident,
  DesktopAlertRule,
  DesktopAlertRuleType,
  DesktopPermissions,
} from '@command-center/shared-types';
import { BellRing, RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

const TYPES: Array<{
  value: DesktopAlertRuleType;
  label: string;
  threshold: boolean;
  defaultThreshold: string;
}> = [
  {
    value: 'BUILD_FAILED',
    label: 'Build failed',
    threshold: false,
    defaultThreshold: '',
  },
  {
    value: 'CRASH_RATE',
    label: 'Crash rate',
    threshold: true,
    defaultThreshold: '2',
  },
  {
    value: 'STARTUP',
    label: 'Startup time',
    threshold: true,
    defaultThreshold: '1500',
  },
  {
    value: 'MEMORY',
    label: 'Memory usage',
    threshold: true,
    defaultThreshold: '800',
  },
  {
    value: 'CPU',
    label: 'CPU usage',
    threshold: true,
    defaultThreshold: '80',
  },
  {
    value: 'RELEASE_REGRESSION',
    label: 'Release regression',
    threshold: true,
    defaultThreshold: '20',
  },
  {
    value: 'SIGNING_FAILURE',
    label: 'Signing failure',
    threshold: false,
    defaultThreshold: '',
  },
  {
    value: 'TELEMETRY_UNAVAILABLE',
    label: 'Telemetry unavailable',
    threshold: false,
    defaultThreshold: '',
  },
];

function incidentTone(status: DesktopAlertIncident['status']) {
  return status === 'OPEN'
    ? 'border-red-200 bg-red-50 text-red-800'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function DesktopAlerts({ workspaceId, desktopAppId }: Props) {
  const [rules, setRules] = useState<DesktopAlertRule[]>([]);
  const [incidents, setIncidents] = useState<DesktopAlertIncident[]>([]);
  const [permissions, setPermissions] = useState<DesktopPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('Crash rate above 2%');
  const [type, setType] = useState<DesktopAlertRuleType>('CRASH_RATE');
  const [threshold, setThreshold] = useState('2');
  const [cooldownMinutes, setCooldownMinutes] = useState('60');

  const selected = useMemo(
    () => TYPES.find((candidate) => candidate.value === type) ?? TYPES[0],
    [type],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [ruleData, incidentData, permissionData] = await Promise.all([
        listDesktopAlertRules(workspaceId, desktopAppId),
        listDesktopAlertIncidents(workspaceId, desktopAppId),
        getDesktopPermissions(workspaceId, desktopAppId),
      ]);

      setRules(ruleData);
      setIncidents(incidentData);
      setPermissions(permissionData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRule() {
    if (!name.trim()) {
      setError('Alert name is required.');
      return;
    }

    if (selected.threshold) {
      const number = Number(threshold);

      if (!Number.isFinite(number)) {
        setError('A valid threshold is required.');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      await createDesktopAlertRule(workspaceId, desktopAppId, {
        name: name.trim(),
        type,
        threshold: selected.threshold ? Number(threshold) : null,
        cooldownMinutes: Number(cooldownMinutes),
        enabled: true,
      });

      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function setEnabled(rule: DesktopAlertRule, enabled: boolean) {
    setError(null);

    try {
      await updateDesktopAlertRule(
        workspaceId,
        desktopAppId,
        rule.id,
        { enabled },
      );
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function remove(ruleId: string) {
    setError(null);

    try {
      await deleteDesktopAlertRule(workspaceId, desktopAppId, ruleId);
      await load();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  async function evaluate() {
    setEvaluating(true);
    setError(null);

    try {
      await evaluateDesktopAlerts(workspaceId, desktopAppId);
      await load();
    } catch (evaluateError) {
      setError(getErrorMessage(evaluateError));
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return (
      <div
        className='rounded-2xl border bg-white p-6 text-sm text-slate-500'
        data-testid='desktop-alerts-loading'
      >
        Loading desktop alerts…
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <BellRing className='size-5' aria-hidden='true' />
            <h1 className='text-xl font-semibold'>Desktop Alerts</h1>
          </div>
          <p className='mt-1 text-sm text-slate-500'>
            Build, runtime, release, signing, and telemetry alert rules.
          </p>
        </div>

        <DesktopPermissionGate permissions={permissions} require='write'>
          <button
            type='button'
            onClick={() => void evaluate()}
            disabled={evaluating}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium disabled:opacity-50'
          >
            <RefreshCcw className='size-4' aria-hidden='true' />
            {evaluating ? 'Evaluating…' : 'Evaluate now'}
          </button>
        </DesktopPermissionGate>
      </div>

      {error ? (
        <div
          role='alert'
          className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800'
        >
          {error}
        </div>
      ) : null}

      <DesktopPermissionGate permissions={permissions} require='write'>
        <section className='rounded-2xl border bg-white p-5'>
          <h2 className='font-semibold'>Create alert rule</h2>

          <div className='mt-4 grid gap-3 lg:grid-cols-4'>
            <label className='space-y-1 text-sm'>
              <span>Name</span>
              <input
                aria-label='Alert name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                className='h-10 w-full rounded-lg border px-3'
              />
            </label>

            <label className='space-y-1 text-sm'>
              <span>Type</span>
              <select
                aria-label='Alert type'
                value={type}
                onChange={(event) => {
                  const value = event.target.value as DesktopAlertRuleType;
                  const next = TYPES.find((item) => item.value === value);
                  setType(value);
                  setThreshold(next?.defaultThreshold ?? '');
                  setName(next?.label ?? 'Desktop alert');
                }}
                className='h-10 w-full rounded-lg border px-3'
              >
                {TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1 text-sm'>
              <span>Threshold</span>
              <input
                aria-label='Alert threshold'
                type='number'
                value={threshold}
                disabled={!selected.threshold}
                onChange={(event) => setThreshold(event.target.value)}
                className='h-10 w-full rounded-lg border px-3 disabled:bg-slate-50'
              />
            </label>

            <label className='space-y-1 text-sm'>
              <span>Cooldown (minutes)</span>
              <input
                aria-label='Cooldown minutes'
                type='number'
                min='1'
                max='10080'
                value={cooldownMinutes}
                onChange={(event) => setCooldownMinutes(event.target.value)}
                className='h-10 w-full rounded-lg border px-3'
              />
            </label>
          </div>

          <button
            type='button'
            onClick={() => void createRule()}
            disabled={saving}
            className='mt-4 h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50'
          >
            {saving ? 'Saving…' : 'Create alert'}
          </button>
        </section>
      </DesktopPermissionGate>

      <section className='rounded-2xl border bg-white p-5'>
        <h2 className='font-semibold'>Rules</h2>

        {rules.length === 0 ? (
          <p className='mt-4 text-sm text-slate-500' data-testid='desktop-alerts-empty'>
            No desktop alert rules yet.
          </p>
        ) : (
          <div className='mt-4 divide-y'>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className='flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between'
              >
                <div>
                  <p className='font-medium'>{rule.name}</p>
                  <p className='text-sm text-slate-500'>
                    {rule.type}
                    {rule.threshold === null ? '' : ` · threshold ${rule.threshold}`}
                    {` · ${rule.cooldownMinutes}m cooldown`}
                  </p>
                </div>

                <DesktopPermissionGate permissions={permissions} require='write'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`}
                      onClick={() => void setEnabled(rule, !rule.enabled)}
                      className='h-9 rounded-lg border px-3 text-sm'
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>

                    <DesktopPermissionGate permissions={permissions} require='manage'>
                      <button
                        type='button'
                        aria-label={`Delete ${rule.name}`}
                        onClick={() => void remove(rule.id)}
                        className='inline-flex size-9 items-center justify-center rounded-lg border'
                      >
                        <Trash2 className='size-4' aria-hidden='true' />
                      </button>
                    </DesktopPermissionGate>
                  </div>
                </DesktopPermissionGate>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className='rounded-2xl border bg-white p-5'>
        <h2 className='font-semibold'>Incidents</h2>

        {incidents.length === 0 ? (
          <p className='mt-4 text-sm text-slate-500'>No alert incidents.</p>
        ) : (
          <div className='mt-4 space-y-3'>
            {incidents.map((incident) => (
              <article key={incident.id} className='rounded-xl border p-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${incidentTone(
                      incident.status,
                    )}`}
                  >
                    {incident.status}
                  </span>
                  <span className='font-medium'>{incident.title}</span>
                </div>

                <p className='mt-2 text-sm text-slate-600'>{incident.message}</p>
                <p className='mt-2 text-xs text-slate-400'>
                  Triggered {new Date(incident.triggeredAt).toLocaleString()}
                  {incident.resolvedAt
                    ? ` · resolved ${new Date(incident.resolvedAt).toLocaleString()}`
                    : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

---

## 22. Desktop AI Analysis UI

Create:

```text
apps/web/src/features/desktop-apps/desktop-analysis-panel.tsx
```

```tsx
'use client';

import {
  analyzeDesktopApplication,
  getDesktopPermissions,
} from './desktop-apps-api';
import { DesktopPermissionGate } from './desktop-permission-gate';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  DesktopAnalysisResult,
  DesktopAnalysisAction,
  DesktopPermissions,
} from '@command-center/shared-types';
import { Bot, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
  buildId?: string;
  releaseId?: string;
  crashId?: string;
}

const ACTIONS: Array<{
  value: DesktopAnalysisAction;
  label: string;
}> = [
  { value: 'BUILD_FAILURE', label: 'Why did this build fail?' },
  { value: 'CRASH_INCREASE', label: 'Why did crashes increase?' },
  {
    value: 'PERFORMANCE_REGRESSION',
    label: 'What caused the performance regression?',
  },
  { value: 'RELEASE_HEALTH', label: 'Is this release healthy?' },
  { value: 'CUSTOM', label: 'Ask a custom question' },
];

export function DesktopAnalysisPanel({
  workspaceId,
  desktopAppId,
  buildId,
  releaseId,
  crashId,
}: Props) {
  const [permissions, setPermissions] = useState<DesktopPermissions | null>(null);
  const [action, setAction] = useState<DesktopAnalysisAction>('RELEASE_HEALTH');
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState<DesktopAnalysisResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getDesktopPermissions(workspaceId, desktopAppId)
      .then((value) => {
        if (!cancelled) {
          setPermissions(value);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(getErrorMessage(loadError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, desktopAppId]);

  async function run() {
    setRunning(true);
    setError(null);

    try {
      const result = await analyzeDesktopApplication(
        workspaceId,
        desktopAppId,
        {
          action,
          question: question.trim() || undefined,
          buildId,
          releaseId,
          crashId,
        },
      );

      setAnalysis(result);
    } catch (runError) {
      setError(getErrorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className='rounded-2xl border bg-white p-5' data-testid='desktop-ai-panel'>
      <div className='flex items-center gap-2'>
        <Bot className='size-5' aria-hidden='true' />
        <div>
          <h2 className='font-semibold'>AI Desktop Analysis</h2>
          <p className='text-sm text-slate-500'>
            Evidence-grounded analysis from your desktop engineering data.
          </p>
        </div>
      </div>

      {error ? (
        <div
          role='alert'
          className='mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800'
        >
          {error}
        </div>
      ) : null}

      <DesktopPermissionGate
        permissions={permissions}
        require='analyze'
        fallback={
          permissions ? (
            <p className='mt-4 text-sm text-slate-500'>
              Your workspace role has read-only access to AI analysis.
            </p>
          ) : null
        }
      >
        <div className='mt-4 grid gap-3 md:grid-cols-[280px_1fr]'>
          <label className='space-y-1 text-sm'>
            <span>Analysis</span>
            <select
              aria-label='Analysis action'
              value={action}
              onChange={(event) =>
                setAction(event.target.value as DesktopAnalysisAction)
              }
              className='h-10 w-full rounded-lg border px-3'
            >
              {ACTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className='space-y-1 text-sm'>
            <span>Question</span>
            <input
              aria-label='AI question'
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder='Optional: focus the analysis on a specific symptom or release.'
              className='h-10 w-full rounded-lg border px-3'
            />
          </label>
        </div>

        <button
          type='button'
          onClick={() => void run()}
          disabled={running}
          className='mt-3 h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50'
        >
          {running ? 'Analyzing…' : 'Analyze'}
        </button>
      </DesktopPermissionGate>

      {analysis ? (
        <div className='mt-5 space-y-4'>
          <div className='flex items-center gap-2 text-sm'>
            <span className='rounded-full border px-2 py-0.5'>
              {analysis.confidence}
            </span>
            <span className='text-slate-500'>{analysis.action}</span>
          </div>

          <pre className='whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100'>
            {analysis.answer}
          </pre>

          <div>
            <h3 className='text-sm font-semibold'>Evidence</h3>
            {analysis.evidence.length === 0 ? (
              <p className='mt-2 text-sm text-slate-500'>
                No evidence references were available.
              </p>
            ) : (
              <ul className='mt-2 space-y-2'>
                {analysis.evidence.map((item) => (
                  <li
                    key={`${item.type}:${item.id}`}
                    className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm'
                  >
                    <span>
                      <span className='font-medium'>{item.type}</span>
                      <span className='ml-2 text-slate-500'>{item.label}</span>
                    </span>

                    {item.href ? (
                      <a
                        href={item.href}
                        className='inline-flex items-center gap-1 text-xs font-medium underline'
                      >
                        Open
                        <ExternalLink className='size-3' aria-hidden='true' />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

---

## 23. Alerts route

Create:

```text
apps/web/src/app/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/alerts/page.tsx
```

```tsx
import { DesktopAlerts } from '@/features/desktop-apps/desktop-alerts';
import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';

interface Props {
  params: Promise<{
    workspaceId: string;
    desktopAppId: string;
  }>;
}

export default async function DesktopAlertsPage({ params }: Props) {
  const { workspaceId, desktopAppId } = await params;

  return (
    <div className='space-y-6'>
      <DesktopAppSubNav
        workspaceId={workspaceId}
        desktopAppId={desktopAppId}
      />

      <DesktopAlerts workspaceId={workspaceId} desktopAppId={desktopAppId} />
    </div>
  );
}
```

---

## 24. Mount AI analysis on Overview

Open the existing Phase 6 route:

```text
apps/web/src/app/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/page.tsx
```

Do **not** delete the current overview UI. Add:

```tsx
import { DesktopAnalysisPanel } from '@/features/desktop-apps/desktop-analysis-panel';
```

Then, after the existing overview component inside the page body, mount:

```tsx
<DesktopAnalysisPanel
  workspaceId={workspaceId}
  desktopAppId={desktopAppId}
/>
```

This keeps Phase 6 intact and adds the Phase 16 action panel below the real overview data.

---

## 25. Final desktop sub-navigation

Update the existing live tabs in:

```text
apps/web/src/features/desktop-apps/desktop-app-sub-nav.tsx
```

Use this final ordering:

```tsx
const LIVE_TABS = [
  { label: 'Overview', path: '' },
  { label: 'Code', path: '/code' },
  { label: 'Builds', path: '/builds' },
  { label: 'Tests', path: '/tests' },
  { label: 'Releases', path: '/releases' },
  { label: 'Performance', path: '/performance' },
  { label: 'Crashes', path: '/crashes' },
  { label: 'Dependencies', path: '/dependencies' },
  { label: 'Security', path: '/security' },
  { label: 'Alerts', path: '/alerts' },
  { label: 'Settings', path: '/settings' },
] as const;
```

---

## 26. Final frontend feature exports

Open:

```text
apps/web/src/features/desktop-apps/index.ts
```

Keep all existing exports and add:

```ts
export * from './desktop-alerts';
export * from './desktop-analysis-panel';
export * from './desktop-permission-gate';
```

---

# TESTING — PHASE 15

The API tests below reuse the real desktop E2E helper introduced in Phase 5. Do not create a second fixture system.

## 27. Desktop alerts API E2E

Create:

```text
packages/test-code/api/e2e/desktop-alerts.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import {
  DesktopArchitecture,
  DesktopBuildSource,
  DesktopBuildStatus,
  DesktopPerformanceMetricType,
  DesktopPlatform,
  DesktopSecurityCheckStatus,
  DesktopSecurityCheckType,
  DesktopSecuritySeverity,
  DesktopTelemetryProvider,
  DesktopTelemetryIntegrationStatus,
} from 'src/generated/prisma/enums';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import {
  API,
  createDesktopApp,
  createRepository,
} from './helpers/desktop-test-fixtures';
import { registerWorkspaceTestUser } from '../helpers/workspace';

function alertsPath(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts`;
}

async function createTelemetry(
  prisma: PrismaService,
  workspaceId: string,
  desktopAppId: string,
) {
  return prisma.desktopTelemetryIntegration.create({
    data: {
      workspaceId,
      desktopAppId,
      provider: DesktopTelemetryProvider.CUSTOM,
      status: DesktopTelemetryIntegrationStatus.CONNECTED,
      externalProjectId: `desktop-test-${desktopAppId}`,
      secretCiphertext: 'test-ciphertext',
      endpointUrl: 'https://telemetry.example.test',
      configuredAt: new Date(),
      lastSyncedAt: new Date(),
    },
  });
}

describe('Desktop Alerts E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('does not create an incident below a crash-rate threshold', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const telemetry = await createTelemetry(
      prisma,
      owner.workspaceId,
      desktop.id,
    );

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Crash rate > 2%',
        type: 'CRASH_RATE',
        threshold: 2,
        cooldownMinutes: 60,
        enabled: true,
      })
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'crash-free-users-1',
        type: DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT,
        value: 99.5,
        unit: 'percent',
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        recordedAt: new Date(),
      },
    });

    const response = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(response.body.triggered).toBe(0);
    expect(await prisma.desktopAlertIncident.count()).toBe(0);
  });

  it('creates one incident above threshold and does not spam duplicates', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const telemetry = await createTelemetry(
      prisma,
      owner.workspaceId,
      desktop.id,
    );

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Crash rate > 2%',
        type: 'CRASH_RATE',
        threshold: 2,
        cooldownMinutes: 60,
        enabled: true,
      })
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'crash-free-users-2',
        type: DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT,
        value: 95,
        unit: 'percent',
        recordedAt: new Date(),
      },
    });

    const first = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    const second = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(first.body.triggered).toBe(1);
    expect(second.body.triggered).toBe(0);
    expect(await prisma.desktopAlertIncident.count()).toBe(1);
  });

  it('resolves an open incident after the metric recovers', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const telemetry = await createTelemetry(
      prisma,
      owner.workspaceId,
      desktop.id,
    );

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'CPU > 80%',
        type: 'CPU',
        threshold: 80,
        enabled: true,
      })
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'cpu-high',
        type: DesktopPerformanceMetricType.CPU_PERCENT,
        value: 92,
        unit: 'percent',
        recordedAt: new Date(Date.now() - 1000),
      },
    });

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'cpu-recovered',
        type: DesktopPerformanceMetricType.CPU_PERCENT,
        value: 30,
        unit: 'percent',
        recordedAt: new Date(),
      },
    });

    const result = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(result.body.resolved).toBe(1);

    const incident = await prisma.desktopAlertIncident.findFirstOrThrow();
    expect(incident.status).toBe('RESOLVED');
    expect(incident.resolvedAt).not.toBeNull();
    expect(incident.activeKey).toBeNull();
  });

  it('does not evaluate a disabled rule', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const telemetry = await createTelemetry(
      prisma,
      owner.workspaceId,
      desktop.id,
    );

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Memory > 100 MB',
        type: 'MEMORY',
        threshold: 100,
        enabled: false,
      })
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'memory-high',
        type: DesktopPerformanceMetricType.MEMORY_MB,
        value: 900,
        unit: 'MB',
        recordedAt: new Date(),
      },
    });

    const result = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(result.body.rulesEvaluated).toBe(0);
    expect(await prisma.desktopAlertIncident.count()).toBe(0);
  });

  it('creates a failed-build alert', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const repository = await createRepository(
      prisma,
      owner.workspaceId,
      desktop.applicationId,
    );

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Build failed',
        type: 'BUILD_FAILED',
        enabled: true,
      })
      .expect(201);

    await prisma.desktopBuild.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        repositoryId: repository.id,
        workflowRunId: `failed-${Date.now()}`,
        source: DesktopBuildSource.GITHUB_ACTIONS,
        commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
        branch: 'main',
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        status: DesktopBuildStatus.FAILED,
        startedAt: new Date(Date.now() - 60_000),
        completedAt: new Date(),
      },
    });

    const result = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(result.body.triggered).toBe(1);
    expect(
      await prisma.desktopAlertIncident.findFirst({
        where: { desktopAppId: desktop.id },
      }),
    ).toMatchObject({ status: 'OPEN' });
  });

  it('creates a signing-failure alert from Phase 14 security findings', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Signing failure',
        type: 'SIGNING_FAILURE',
        enabled: true,
      })
      .expect(201);

    await prisma.desktopSecurityFinding.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        findingKey: 'windows-signing:test-fail',
        type: DesktopSecurityCheckType.WINDOWS_SIGNING,
        status: DesktopSecurityCheckStatus.FAIL,
        severity: DesktopSecuritySeverity.HIGH,
        title: 'Windows signing failed',
        message: 'The Windows signing check failed.',
        evidence: ['signtool returned non-zero'],
      },
    });

    const result = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(result.body.triggered).toBe(1);
  });

  it('prevents cross-workspace alert access', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const desktopB = await createDesktopApp(workspaceB);

    await workspaceA.agent
      .get(`${alertsPath(workspaceB.workspaceId, desktopB.id)}/rules`)
      .set('Authorization', `Bearer ${workspaceA.accessToken}`)
      .expect(403);
  });
});
```

### If enum names differ

The test deliberately imports the enums generated by the Phase 8/12/14 schemas. If your Phase 12 migration used a different telemetry status name than `CONNECTED`, change only the fixture value to the enum your schema actually defines. Do not weaken production validation.

---

# TESTING — PHASE 16

## 28. Secret sanitizer unit test

Create:

```text
packages/test-code/api/unit/modules/desktop-apps/desktop-secret-sanitizer.service.spec.ts
```

```ts
import { DesktopSecretSanitizerService } from 'src/modules/desktop-apps/security/desktop-secret-sanitizer.service';

describe('DesktopSecretSanitizerService', () => {
  const service = new DesktopSecretSanitizerService();

  it('redacts secret keys recursively', () => {
    expect(
      service.sanitize({
        name: 'desktop',
        token: 'secret-token',
        nested: {
          apiKey: 'secret-key',
          password: 'secret-password',
          signingCertificate: 'secret-certificate',
          safe: 'visible',
        },
      }),
    ).toEqual({
      name: 'desktop',
      token: '[REDACTED]',
      nested: {
        apiKey: '[REDACTED]',
        password: '[REDACTED]',
        signingCertificate: '[REDACTED]',
        safe: 'visible',
      },
    });
  });

  it('redacts bearer-like values embedded in strings', () => {
    expect(
      service.sanitize('Authorization: Bearer abc.def.secret'),
    ).toContain('[REDACTED]');
  });
});
```

---

## 29. Desktop AI API E2E

Create:

```text
packages/test-code/api/e2e/desktop-ai-analysis.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import type { DesktopAnalysisProvider } from 'src/modules/desktop-apps/analysis/desktop-analysis-provider.interface';
import { DesktopAnalysisService } from 'src/modules/desktop-apps/services/desktop-analysis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import {
  API,
  createDesktopApp,
  createRepository,
} from './helpers/desktop-test-fixtures';

class FakeDesktopAnalysisProvider implements DesktopAnalysisProvider {
  calls: Array<{ system: string; prompt: string }> = [];

  async analyze(input: { system: string; prompt: string }) {
    this.calls.push(input);

    return [
      'Evidence:',
      '- A failed build is present in the supplied context.',
      '',
      'Correlation:',
      '- The build failure is correlated with the latest commit.',
      '',
      'Likely cause:',
      '- Test evidence should be inspected before assigning a root cause.',
      '',
      'Unknown cause:',
      '- The supplied evidence does not prove causation.',
    ].join('\n');
  }
}

function analysisPath(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/analysis`;
}

describe('Desktop AI Analysis E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let analysis: DesktopAnalysisService;
  let fake: FakeDesktopAnalysisProvider;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    app = await createTestApp();
    prisma = app.get(PrismaService);
    analysis = app.get(DesktopAnalysisService);
    fake = new FakeDesktopAnalysisProvider();
    analysis.setProviderForTesting(fake);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('runs deterministic build-failure analysis and stores evidence', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    await createRepository(prisma, owner.workspaceId, desktop.applicationId);

    const response = await owner.agent
      .post(analysisPath(owner.workspaceId, desktop.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        action: 'BUILD_FAILURE',
        question: 'Why did the latest build fail?',
      })
      .expect(201);

    expect(response.body.answer).toContain('Evidence:');
    expect(response.body.answer).toContain('Correlation:');
    expect(response.body.answer).toContain('Likely cause:');
    expect(response.body.answer).toContain('Unknown cause:');
    expect(response.body.id).toEqual(expect.any(String));

    const stored = await prisma.desktopAiAnalysis.findUniqueOrThrow({
      where: { id: response.body.id as string },
    });

    expect(stored.workspaceId).toBe(owner.workspaceId);
    expect(stored.desktopAppId).toBe(desktop.id);
    expect(fake.calls).toHaveLength(1);
  });

  it('never sends telemetry credentials to the AI provider', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);

    await prisma.desktopTelemetryIntegration.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        provider: 'CUSTOM',
        status: 'CONNECTED',
        externalProjectId: `desktop-test-${desktop.id}`,
        secretCiphertext: 'SUPER_SECRET_CIPHERTEXT_DO_NOT_SEND',
        endpointUrl: 'https://telemetry.example.test',
        configuredAt: new Date(),
      },
    });

    await owner.agent
      .post(analysisPath(owner.workspaceId, desktop.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ action: 'RELEASE_HEALTH' })
      .expect(201);

    const prompt = fake.calls[0]?.prompt ?? '';

    expect(prompt).not.toContain('SUPER_SECRET_CIPHERTEXT_DO_NOT_SEND');
    expect(prompt).not.toContain('secretCiphertext');
  });

  it('rejects an analysis resource id from another desktop app', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const first = await createDesktopApp(owner);
    const second = await createDesktopApp(owner);

    const integration = await prisma.desktopTelemetryIntegration.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: second.id,
        provider: 'CUSTOM',
        status: 'CONNECTED',
        externalProjectId: `foreign-crash-project-${Date.now()}`,
        endpointUrl: 'https://telemetry.example.test',
        secretCiphertext: 'encrypted-test-secret',
        configuredAt: new Date(),
      },
    });

    const crash = await prisma.desktopCrash.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: second.id,
        telemetryIntegrationId: integration.id,
        externalId: `foreign-crash-${Date.now()}`,
        fingerprint: 'foreign-fingerprint',
        message: 'Foreign crash',
        count: 1,
        affectedUsers: 1,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    await owner.agent
      .post(analysisPath(owner.workspaceId, first.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        action: 'CRASH_INCREASE',
        crashId: crash.id,
      })
      .expect(404);
  });

  it('does not allow a viewer to invoke AI analysis', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);

    await prisma.workspaceMember.create({
      data: {
        workspaceId: owner.workspaceId,
        userId: viewer.userId,
        role: 'VIEWER',
      },
    });

    await viewer.agent
      .post(analysisPath(owner.workspaceId, desktop.id))
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({ action: 'CUSTOM', question: 'Analyze this app' })
      .expect(403);
  });

  it('converts provider failure to a safe 502 response', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);

    analysis.setProviderForTesting({
      async analyze() {
        throw new Error('provider leaked internal detail');
      },
    });

    const response = await owner.agent
      .post(analysisPath(owner.workspaceId, desktop.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ action: 'CUSTOM', question: 'What happened?' })
      .expect(502);

    expect(JSON.stringify(response.body)).not.toContain(
      'provider leaked internal detail',
    );
  });
});
```

---

# TESTING — PHASE 17

## 30. Desktop authorization/security E2E

Create:

```text
packages/test-code/api/e2e/desktop-security.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import {
  API,
  createDesktopApp,
} from './helpers/desktop-test-fixtures';
import request from 'supertest';

function desktopBase(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;
}

describe('Desktop Phase 17 Security E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('requires authentication for every desktop read surface', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const base = desktopBase(owner.workspaceId, desktop.id);

    const paths = [
      base,
      `${base}/overview`,
      `${base}/builds`,
      `${base}/tests`,
      `${base}/releases`,
      `${base}/performance`,
      `${base}/crashes`,
      `${base}/dependencies`,
      `${base}/security`,
      `${base}/alerts/rules`,
      `${base}/alerts/incidents`,
      `${base}/permissions`,
    ];

    for (const path of paths) {
      const response = await request(app.getHttpServer()).get(path);
      expect(response.status).toBe(401);
    }
  });

  it('does not allow workspace A to read desktop resources in workspace B', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const desktopB = await createDesktopApp(workspaceB);
    const base = desktopBase(workspaceB.workspaceId, desktopB.id);

    const paths = [
      base,
      `${base}/overview`,
      `${base}/builds`,
      `${base}/tests`,
      `${base}/releases`,
      `${base}/performance`,
      `${base}/crashes`,
      `${base}/dependencies`,
      `${base}/security`,
      `${base}/alerts/rules`,
      `${base}/alerts/incidents`,
      `${base}/permissions`,
    ];

    for (const path of paths) {
      const response = await workspaceA.agent
        .get(path)
        .set('Authorization', `Bearer ${workspaceA.accessToken}`);

      expect([403, 404]).toContain(response.status);
    }
  });

  it('gives viewer read capabilities but no write/manage/AI/secret capability', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);

    await prisma.workspaceMember.create({
      data: {
        workspaceId: owner.workspaceId,
        userId: viewer.userId,
        role: 'VIEWER',
      },
    });

    const permissions = await viewer.agent
      .get(`${desktopBase(owner.workspaceId, desktop.id)}/permissions`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .expect(200);

    expect(permissions.body).toEqual({
      role: 'VIEWER',
      canRead: true,
      canWrite: false,
      canManage: false,
      canAnalyze: false,
      canConfigureSecrets: false,
    });

    await viewer.agent
      .post(`${desktopBase(owner.workspaceId, desktop.id)}/alerts/rules`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({
        name: 'Viewer should fail',
        type: 'BUILD_FAILED',
      })
      .expect(403);

    await viewer.agent
      .post(`${desktopBase(owner.workspaceId, desktop.id)}/analysis`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({ action: 'CUSTOM', question: 'No write access' })
      .expect(403);
  });

  it('does not expose encrypted telemetry secrets in permissions or alert responses', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const secret = 'TOP_SECRET_DESKTOP_TELEMETRY_CIPHERTEXT';

    await prisma.desktopTelemetryIntegration.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        provider: 'CUSTOM',
        status: 'CONNECTED',
        externalProjectId: `desktop-test-${desktop.id}`,
        secretCiphertext: secret,
        endpointUrl: 'https://telemetry.example.test',
        configuredAt: new Date(),
      },
    });

    const permissions = await owner.agent
      .get(`${desktopBase(owner.workspaceId, desktop.id)}/permissions`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const alerts = await owner.agent
      .get(`${desktopBase(owner.workspaceId, desktop.id)}/alerts/incidents`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(JSON.stringify(permissions.body)).not.toContain(secret);
    expect(JSON.stringify(alerts.body)).not.toContain(secret);
  });

  it('rejects a forged GitHub webhook signature', async () => {
    const response = await request(app.getHttpServer())
      .post(`${API}/repositories/github/webhook`)
      .set('content-type', 'application/json')
      .set('x-github-delivery', `desktop-security-${Date.now()}`)
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', 'sha256=definitely-invalid')
      .send(Buffer.from(JSON.stringify({ installation: { id: 1 } })));

    expect(response.status).toBe(401);
  });
});
```

The final webhook verification also re-runs the existing repository integration E2E because that suite already proves valid signatures and duplicate delivery idempotency.

---

# FRONTEND TESTS — PHASES 15–17

## 31. API-client test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-apps-api-phase15-17.test.ts
```

```ts
import {
  analyzeDesktopApplication,
  createDesktopAlertRule,
  deleteDesktopAlertRule,
  evaluateDesktopAlerts,
  getDesktopPermissions,
  listDesktopAlertIncidents,
  listDesktopAlertRules,
  updateDesktopAlertRule,
} from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);
const W = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';
const R = '33333333-3333-4333-8333-333333333333';

describe('desktop Phase 15-17 API client', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('uses the alert endpoints', async () => {
    await listDesktopAlertRules(W, A);
    await listDesktopAlertIncidents(W, A);
    await evaluateDesktopAlerts(W, A);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      1,
      `/workspaces/${W}/desktop-apps/${A}/alerts/rules`,
    );
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      `/workspaces/${W}/desktop-apps/${A}/alerts/incidents`,
    );
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      3,
      `/workspaces/${W}/desktop-apps/${A}/alerts/evaluate`,
      { method: 'POST' },
    );
  });

  it('creates, updates, and deletes alert rules', async () => {
    await createDesktopAlertRule(W, A, {
      name: 'Build failed',
      type: 'BUILD_FAILED',
      enabled: true,
    });

    await updateDesktopAlertRule(W, A, R, { enabled: false });
    await deleteDesktopAlertRule(W, A, R);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      1,
      `/workspaces/${W}/desktop-apps/${A}/alerts/rules`,
      {
        method: 'POST',
        body: {
          name: 'Build failed',
          type: 'BUILD_FAILED',
          enabled: true,
        },
      },
    );

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      `/workspaces/${W}/desktop-apps/${A}/alerts/rules/${R}`,
      { method: 'PATCH', body: { enabled: false } },
    );

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      3,
      `/workspaces/${W}/desktop-apps/${A}/alerts/rules/${R}`,
      { method: 'DELETE' },
    );
  });

  it('uses the AI analysis and permissions endpoints', async () => {
    await analyzeDesktopApplication(W, A, {
      action: 'RELEASE_HEALTH',
      question: 'Healthy?',
    });
    await getDesktopPermissions(W, A);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      1,
      `/workspaces/${W}/desktop-apps/${A}/analysis`,
      {
        method: 'POST',
        body: {
          action: 'RELEASE_HEALTH',
          question: 'Healthy?',
        },
      },
    );

    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      `/workspaces/${W}/desktop-apps/${A}/permissions`,
    );
  });
});
```

---

## 32. Permission gate unit test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-permission-gate.test.tsx
```

```tsx
import { DesktopPermissionGate } from '@/features/desktop-apps/desktop-permission-gate';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const viewer = {
  role: 'VIEWER' as const,
  canRead: true as const,
  canWrite: false,
  canManage: false,
  canAnalyze: false,
  canConfigureSecrets: false,
};

const admin = {
  role: 'ADMIN' as const,
  canRead: true as const,
  canWrite: true,
  canManage: true,
  canAnalyze: true,
  canConfigureSecrets: true,
};

describe('DesktopPermissionGate', () => {
  it('allows viewer read UI but hides write UI', () => {
    const { rerender } = render(
      <DesktopPermissionGate permissions={viewer} require='read'>
        <span>Readable</span>
      </DesktopPermissionGate>,
    );

    expect(screen.getByText('Readable')).toBeInTheDocument();

    rerender(
      <DesktopPermissionGate permissions={viewer} require='write'>
        <span>Writable</span>
      </DesktopPermissionGate>,
    );

    expect(screen.queryByText('Writable')).not.toBeInTheDocument();
  });

  it('allows admin management and secret configuration UI', () => {
    render(
      <>
        <DesktopPermissionGate permissions={admin} require='manage'>
          <span>Manage</span>
        </DesktopPermissionGate>
        <DesktopPermissionGate permissions={admin} require='secrets'>
          <span>Secrets</span>
        </DesktopPermissionGate>
      </>,
    );

    expect(screen.getByText('Manage')).toBeInTheDocument();
    expect(screen.getByText('Secrets')).toBeInTheDocument();
  });
});
```

---

## 33. Desktop Alerts component unit test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-alerts.test.tsx
```

```tsx
import { DesktopAlerts } from '@/features/desktop-apps/desktop-alerts';
import * as api from '@/features/desktop-apps/desktop-apps-api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  createDesktopAlertRule: vi.fn(),
  deleteDesktopAlertRule: vi.fn(),
  evaluateDesktopAlerts: vi.fn(),
  getDesktopPermissions: vi.fn(),
  listDesktopAlertIncidents: vi.fn(),
  listDesktopAlertRules: vi.fn(),
  updateDesktopAlertRule: vi.fn(),
}));

const W = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';

describe('DesktopAlerts', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(api.listDesktopAlertRules).mockResolvedValue([]);
    vi.mocked(api.listDesktopAlertIncidents).mockResolvedValue([]);
    vi.mocked(api.getDesktopPermissions).mockResolvedValue({
      role: 'ADMIN',
      canRead: true,
      canWrite: true,
      canManage: true,
      canAnalyze: true,
      canConfigureSecrets: true,
    });
    vi.mocked(api.createDesktopAlertRule).mockResolvedValue({} as never);
    vi.mocked(api.evaluateDesktopAlerts).mockResolvedValue({
      rulesEvaluated: 1,
      triggered: 0,
      resolved: 0,
      unchanged: 1,
    });
  });

  it('renders the empty state and creates a rule', async () => {
    render(<DesktopAlerts workspaceId={W} desktopAppId={A} />);

    expect(await screen.findByText('No desktop alert rules yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Alert name'), {
      target: { value: 'Build failed' },
    });
    fireEvent.change(screen.getByLabelText('Alert type'), {
      target: { value: 'BUILD_FAILED' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create alert' }));

    await waitFor(() => {
      expect(api.createDesktopAlertRule).toHaveBeenCalledWith(W, A, {
        name: 'Build failed',
        type: 'BUILD_FAILED',
        threshold: null,
        cooldownMinutes: 60,
        enabled: true,
      });
    });
  });

  it('hides write controls from a viewer', async () => {
    vi.mocked(api.getDesktopPermissions).mockResolvedValue({
      role: 'VIEWER',
      canRead: true,
      canWrite: false,
      canManage: false,
      canAnalyze: false,
      canConfigureSecrets: false,
    });

    render(<DesktopAlerts workspaceId={W} desktopAppId={A} />);

    await screen.findByText('No desktop alert rules yet.');

    expect(screen.queryByText('Create alert rule')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Evaluate now' }),
    ).not.toBeInTheDocument();
  });
});
```

---

## 34. Desktop AI panel unit test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-analysis-panel.test.tsx
```

```tsx
import { DesktopAnalysisPanel } from '@/features/desktop-apps/desktop-analysis-panel';
import * as api from '@/features/desktop-apps/desktop-apps-api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  analyzeDesktopApplication: vi.fn(),
  getDesktopPermissions: vi.fn(),
}));

const W = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';

describe('DesktopAnalysisPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getDesktopPermissions).mockResolvedValue({
      role: 'DEVELOPER',
      canRead: true,
      canWrite: true,
      canManage: false,
      canAnalyze: true,
      canConfigureSecrets: false,
    });
  });

  it('runs an evidence-grounded analysis and renders evidence', async () => {
    vi.mocked(api.analyzeDesktopApplication).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      action: 'RELEASE_HEALTH',
      answer: [
        'Evidence:',
        '- build 100 succeeded',
        'Correlation:',
        '- no regression observed',
        'Likely cause:',
        '- none supported',
        'Unknown cause:',
        '- not applicable',
      ].join('\n'),
      confidence: 'SUPPORTED',
      evidence: [
        {
          type: 'BUILD',
          id: '44444444-4444-4444-8444-444444444444',
          label: 'Build 100',
          href: `/workspaces/${W}/desktop-apps/${A}/builds/44444444-4444-4444-8444-444444444444`,
        },
      ],
      createdAt: '2026-08-23T00:00:00.000Z',
    });

    render(<DesktopAnalysisPanel workspaceId={W} desktopAppId={A} />);

    await waitFor(() =>
      expect(api.getDesktopPermissions).toHaveBeenCalledWith(W, A),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(await screen.findByText('SUPPORTED')).toBeInTheDocument();
    expect(screen.getByText(/Evidence:/)).toBeInTheDocument();
    expect(screen.getByText('Build 100')).toBeInTheDocument();
  });

  it('shows read-only state for viewer', async () => {
    vi.mocked(api.getDesktopPermissions).mockResolvedValue({
      role: 'VIEWER',
      canRead: true,
      canWrite: false,
      canManage: false,
      canAnalyze: false,
      canConfigureSecrets: false,
    });

    render(<DesktopAnalysisPanel workspaceId={W} desktopAppId={A} />);

    expect(
      await screen.findByText(
        'Your workspace role has read-only access to AI analysis.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Analyze' })).not.toBeInTheDocument();
  });
});
```

---

# PHASE 18 — FULL VERIFICATION & REGRESSION

Phase 18 is not another business feature. It is the acceptance gate for the entire Desktop implementation from Phase 1 through Phase 17.

## 35. Desktop full-flow API E2E

Create:

```text
packages/test-code/api/e2e/desktop-full-flow.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import type { DesktopAnalysisProvider } from 'src/modules/desktop-apps/analysis/desktop-analysis-provider.interface';
import { DesktopAnalysisService } from 'src/modules/desktop-apps/services/desktop-analysis.service';
import {
  DesktopArchitecture,
  DesktopBuildArtifactType,
  DesktopPerformanceMetricType,
  DesktopPlatform,
  DesktopReleaseChannel,
  DesktopReleaseStatus,
  DesktopSecurityCheckStatus,
  DesktopSecurityCheckType,
  DesktopSecuritySeverity,
  DesktopTelemetryIntegrationStatus,
  DesktopTelemetryProvider,
  DesktopTestStatus,
  DesktopTestType,
} from 'src/generated/prisma/enums';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import {
  API,
  createDesktopApp,
  createRepository,
  ingestSuccessfulBuild,
} from './helpers/desktop-test-fixtures';

class FinalDesktopAiProvider implements DesktopAnalysisProvider {
  async analyze() {
    return [
      'Evidence:',
      '- Build, release, runtime, security, and alert evidence is available.',
      '',
      'Correlation:',
      '- Startup degradation correlates with the current release.',
      '',
      'Likely cause:',
      '- The evidence supports investigating the release-specific startup path.',
      '',
      'Unknown cause:',
      '- A definitive root cause is not proven by correlation alone.',
    ].join('\n');
  }
}

function base(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;
}

describe('Desktop Phase 18 full flow E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    app = await createTestApp();
    prisma = app.get(PrismaService);
    app
      .get(DesktopAnalysisService)
      .setProviderForTesting(new FinalDesktopAiProvider());
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('runs an Electron desktop engineering lifecycle from app to alert and AI analysis', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner, {
      name: 'Electron Final Flow',
      platform: 'CROSS_PLATFORM',
      framework: 'ELECTRON',
      architecture: 'X64',
      currentVersion: '3.0.0',
      currentBuildNumber: '300',
    });

    const repository = await createRepository(
      prisma,
      owner.workspaceId,
      desktop.applicationId,
    );

    const build = await ingestSuccessfulBuild(
      owner,
      desktop.id,
      repository.id,
      'desktop-final-electron',
    );

    const artifact = await prisma.desktopBuildArtifact.create({
      data: {
        buildId: build.id,
        providerArtifactId: 'artifact-final-electron',
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        type: DesktopBuildArtifactType.MSI,
        fileName: 'command-center-3.0.0-x64.msi',
        sizeBytes: BigInt(88_000_000),
        checksum: 'sha256:desktop-final',
        externalUrl: 'https://artifacts.example.test/command-center.msi',
      },
    });

    const testRun = await prisma.desktopTestRun.create({
      data: {
        buildId: build.id,
        type: DesktopTestType.E2E,
        status: DesktopTestStatus.PASSED,
        passed: 42,
        failed: 0,
        skipped: 1,
        total: 43,
        durationMs: 120_000,
        startedAt: new Date(Date.now() - 120_000),
        completedAt: new Date(),
      },
    });

    const release = await prisma.desktopRelease.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        buildId: build.id,
        version: '3.0.0',
        buildNumber: '300',
        channel: DesktopReleaseChannel.STABLE,
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        status: DesktopReleaseStatus.PUBLISHED,
        releaseNotes: 'Desktop final verification release.',
        releasedAt: new Date(),
      },
    });

    const integration = await prisma.desktopTelemetryIntegration.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        provider: DesktopTelemetryProvider.CUSTOM,
        status: DesktopTelemetryIntegrationStatus.CONNECTED,
        externalProjectId: 'desktop-final-project',
        endpointUrl: 'https://telemetry.example.test',
        secretCiphertext: 'encrypted-not-plaintext',
        configuredAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });

    await prisma.desktopMetric.createMany({
      data: [
        {
          workspaceId: owner.workspaceId,
          desktopAppId: desktop.id,
          telemetryIntegrationId: integration.id,
          externalId: 'startup-final',
          type: DesktopPerformanceMetricType.STARTUP_MS,
          value: 1850,
          unit: 'ms',
          version: '3.0.0',
          platform: DesktopPlatform.WINDOWS,
          architecture: DesktopArchitecture.X64,
          channel: DesktopReleaseChannel.STABLE,
          recordedAt: new Date(),
        },
        {
          workspaceId: owner.workspaceId,
          desktopAppId: desktop.id,
          telemetryIntegrationId: integration.id,
          externalId: 'crash-free-final',
          type: DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT,
          value: 99.7,
          unit: 'percent',
          version: '3.0.0',
          platform: DesktopPlatform.WINDOWS,
          architecture: DesktopArchitecture.X64,
          channel: DesktopReleaseChannel.STABLE,
          recordedAt: new Date(),
        },
      ],
    });

    const crash = await prisma.desktopCrash.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: integration.id,
        externalId: 'crash-final',
        fingerprint: 'main-window:create:final',
        message: 'Renderer startup exception',
        count: 3,
        affectedUsers: 2,
        version: '3.0.0',
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        channel: DesktopReleaseChannel.STABLE,
        firstSeenAt: new Date(Date.now() - 30_000),
        lastSeenAt: new Date(),
      },
    });

    await prisma.desktopSecurityFinding.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        findingKey: 'final:windows-signing',
        type: DesktopSecurityCheckType.WINDOWS_SIGNING,
        status: DesktopSecurityCheckStatus.PASS,
        severity: DesktopSecuritySeverity.INFO,
        title: 'Windows signing configuration',
        message: 'Signing evidence is present.',
        sourcePath: 'electron-builder.yml',
        evidence: ['electron-builder.yml'],
      },
    });

    const rule = await owner.agent
      .post(`${base(owner.workspaceId, desktop.id)}/alerts/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Startup above 1500 ms',
        type: 'STARTUP',
        threshold: 1500,
        cooldownMinutes: 60,
        enabled: true,
      })
      .expect(201);

    const evaluation = await owner.agent
      .post(`${base(owner.workspaceId, desktop.id)}/alerts/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(evaluation.body.triggered).toBe(1);

    const incidents = await owner.agent
      .get(`${base(owner.workspaceId, desktop.id)}/alerts/incidents`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(incidents.body).toHaveLength(1);
    expect(incidents.body[0]).toMatchObject({
      ruleId: rule.body.id,
      status: 'OPEN',
    });

    const ai = await owner.agent
      .post(`${base(owner.workspaceId, desktop.id)}/analysis`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        action: 'RELEASE_HEALTH',
        releaseId: release.id,
        crashId: crash.id,
        question: 'Is this Electron release healthy?',
      })
      .expect(201);

    expect(ai.body.answer).toContain('Evidence:');
    expect(ai.body.answer).toContain('Correlation:');
    expect(ai.body.answer).toContain('Likely cause:');
    expect(ai.body.answer).toContain('Unknown cause:');

    const persisted = await prisma.desktopApplication.findFirstOrThrow({
      where: {
        id: desktop.id,
        application: { workspaceId: owner.workspaceId },
      },
      include: {
        builds: {
          include: {
            artifacts: true,
            testRuns: true,
            releases: true,
          },
        },
        metrics: true,
        crashes: true,
        securityFindings: true,
        alertRules: true,
        alertIncidents: true,
        aiAnalyses: true,
      },
    });

    expect(persisted.builds[0]?.artifacts.some((item) => item.id === artifact.id)).toBe(true);
    expect(persisted.builds[0]?.testRuns.some((item) => item.id === testRun.id)).toBe(true);
    expect(persisted.builds[0]?.releases.some((item) => item.id === release.id)).toBe(true);
    expect(persisted.metrics.length).toBeGreaterThan(0);
    expect(persisted.crashes.length).toBe(1);
    expect(persisted.alertIncidents.length).toBe(1);
    expect(persisted.aiAnalyses.length).toBe(1);
  });

  it.each([
    ['TAURI', 'WINDOWS', 'X64'],
    ['DOTNET', 'WINDOWS', 'X64'],
    ['NATIVE_MACOS', 'MACOS', 'ARM64'],
  ] as const)(
    'creates and reads %s desktop metadata without breaking workspace isolation',
    async (framework, platform, architecture) => {
      const owner = await registerWorkspaceTestUser(app, prisma);
      const desktop = await createDesktopApp(owner, {
        name: `${framework} Final`,
        framework,
        platform,
        architecture,
        packageName: `com.commandcenter.${framework.toLowerCase()}.final`,
      });

      const response = await owner.agent
        .get(`${API}/workspaces/${owner.workspaceId}/desktop-apps/${desktop.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(response.body.framework).toBe(framework);
      expect(response.body.platform).toBe(platform);
      expect(response.body.architecture).toBe(architecture);
    },
  );
});
```

### One relation check before running

Phase 11 must have added this to `DesktopBuild`:

```prisma
releases DesktopRelease[]
```

If your Phase 11 schema used a different relation field name, update only the final `include` in this E2E test to that already-existing name.

---

## 36. Final desktop browser E2E

Create:

```text
packages/test-code/web/e2e/full-stack/fullstack-desktop-final.spec.ts
```

```ts
import {
  authorizedApiRequest,
  loginThroughUi,
  uniqueValue,
} from './fixtures/helpers';
import {
  readFullStackState,
  type FullStackState,
} from './fixtures/state';
import { expect, test, type APIRequestContext, type Route } from '@playwright/test';

let state: FullStackState;

test.describe.configure({ mode: 'serial' });

async function createDesktopApp(request: APIRequestContext) {
  const response = await authorizedApiRequest(
    request,
    state,
    state.owner.accessToken,
    `/workspaces/${state.owner.workspaceId}/desktop-apps`,
    {
      method: 'POST',
      data: {
        name: uniqueValue('Desktop Final', state.runId),
        platform: 'CROSS_PLATFORM',
        framework: 'ELECTRON',
        architecture: 'X64',
        packageName: `com.commandcenter.final.${Date.now()}`,
        currentVersion: '3.0.0',
        currentBuildNumber: '300',
      },
    },
  );

  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('Desktop Phase 18 final frontend', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('renders Alerts with loading, empty, create, incident, and responsive navigation states', async ({
    page,
    request,
  }) => {
    await loginThroughUi(page, state.owner);
    const desktop = await createDesktopApp(request);

    const apiBase =
      `/api/v1/workspaces/${state.owner.workspaceId}` +
      `/desktop-apps/${desktop.id}`;

    let rules: Array<Record<string, unknown>> = [];
    let incidents: Array<Record<string, unknown>> = [];

    await page.route(`**${apiBase}/permissions`, (route) =>
      json(route, {
        role: 'OWNER',
        canRead: true,
        canWrite: true,
        canManage: true,
        canAnalyze: true,
        canConfigureSecrets: true,
      }),
    );

    await page.route(`**${apiBase}/alerts/rules**`, async (route) => {
      const method = route.request().method();
      const url = new URL(route.request().url());
      const id = url.pathname.split('/').at(-1);

      if (method === 'GET') {
        await json(route, rules);
        return;
      }

      if (method === 'POST') {
        const input = route.request().postDataJSON() as Record<string, unknown>;
        const rule = {
          id: '11111111-1111-4111-8111-111111111111',
          workspaceId: state.owner.workspaceId,
          desktopAppId: desktop.id,
          operator: 'GT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...input,
        };
        rules = [rule];
        await json(route, rule, 201);
        return;
      }

      if (method === 'PATCH' && id) {
        const input = route.request().postDataJSON() as Record<string, unknown>;
        rules = rules.map((rule) =>
          rule.id === id ? { ...rule, ...input } : rule,
        );
        await json(route, rules[0]);
        return;
      }

      if (method === 'DELETE') {
        rules = [];
        await json(route, { success: true });
        return;
      }

      await route.fallback();
    });

    await page.route(`**${apiBase}/alerts/incidents`, (route) =>
      json(route, incidents),
    );

    await page.route(`**${apiBase}/alerts/evaluate`, async (route) => {
      incidents = [
        {
          id: '22222222-2222-4222-8222-222222222222',
          workspaceId: state.owner.workspaceId,
          desktopAppId: desktop.id,
          ruleId: '11111111-1111-4111-8111-111111111111',
          status: 'OPEN',
          title: 'Desktop build failed',
          message: 'Build 300 failed.',
          actualValue: null,
          threshold: null,
          version: '3.0.0',
          buildId: null,
          evidence: {},
          triggeredAt: new Date().toISOString(),
          lastTriggeredAt: new Date().toISOString(),
          resolvedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await json(route, {
        rulesEvaluated: 1,
        triggered: 1,
        resolved: 0,
        unchanged: 0,
      }, 201);
    });

    await page.goto(
      `/workspaces/${state.owner.workspaceId}/desktop-apps/${desktop.id}/alerts`,
    );

    await expect(page.getByRole('heading', { name: 'Desktop Alerts' })).toBeVisible();
    await expect(page.getByText('No desktop alert rules yet.')).toBeVisible();

    await page.getByLabel('Alert name').fill('Build failed');
    await page.getByLabel('Alert type').selectOption('BUILD_FAILED');
    await page.getByRole('button', { name: 'Create alert' }).click();

    await expect(page.getByText('Build failed').first()).toBeVisible();

    await page.getByRole('button', { name: 'Evaluate now' }).click();
    await expect(page.getByText('Desktop build failed')).toBeVisible();
    await expect(page.getByText('OPEN')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'Desktop Alerts' })).toBeVisible();
    await expect(page.getByText('Alerts', { exact: true }).first()).toBeVisible();
  });

  test('renders evidence-grounded AI analysis and never renders a secret', async ({
    page,
    request,
  }) => {
    await loginThroughUi(page, state.owner);
    const desktop = await createDesktopApp(request);

    const apiBase =
      `/api/v1/workspaces/${state.owner.workspaceId}` +
      `/desktop-apps/${desktop.id}`;

    await page.route(`**${apiBase}/permissions`, (route) =>
      json(route, {
        role: 'OWNER',
        canRead: true,
        canWrite: true,
        canManage: true,
        canAnalyze: true,
        canConfigureSecrets: true,
      }),
    );

    await page.route(`**${apiBase}/overview`, (route) =>
      json(route, {
        application: {
          id: desktop.id,
          name: 'Desktop Final',
          platform: 'CROSS_PLATFORM',
          framework: 'ELECTRON',
          architecture: 'X64',
        },
        repository: null,
        latestBuild: null,
        latestRelease: null,
        runtime: null,
      }),
    );

    await page.route(`**${apiBase}/analysis`, (route) =>
      json(
        route,
        {
          id: '33333333-3333-4333-8333-333333333333',
          action: 'RELEASE_HEALTH',
          answer: [
            'Evidence:',
            '- Release metadata is available.',
            'Correlation:',
            '- No regression is proven.',
            'Likely cause:',
            '- No likely cause is supported.',
            'Unknown cause:',
            '- Additional telemetry is required.',
          ].join('\n'),
          confidence: 'SUPPORTED',
          evidence: [
            {
              type: 'RELEASE',
              id: '44444444-4444-4444-8444-444444444444',
              label: 'Release 3.0.0',
            },
          ],
          createdAt: new Date().toISOString(),
        },
        201,
      ),
    );

    await page.goto(
      `/workspaces/${state.owner.workspaceId}/desktop-apps/${desktop.id}`,
    );

    await expect(page.getByTestId('desktop-ai-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Analyze' }).click();

    await expect(page.getByText('SUPPORTED')).toBeVisible();
    await expect(page.getByText(/Correlation:/)).toBeVisible();
    await expect(page.getByText('Release 3.0.0')).toBeVisible();
    await expect(page.getByText(/SUPER_SECRET|secretCiphertext/i)).toHaveCount(0);
  });

  test('shows read-only desktop controls for a viewer', async ({ page, request }) => {
    await loginThroughUi(page, state.owner);
    const desktop = await createDesktopApp(request);

    const apiBase =
      `/api/v1/workspaces/${state.owner.workspaceId}` +
      `/desktop-apps/${desktop.id}`;

    await page.route(`**${apiBase}/permissions`, (route) =>
      json(route, {
        role: 'VIEWER',
        canRead: true,
        canWrite: false,
        canManage: false,
        canAnalyze: false,
        canConfigureSecrets: false,
      }),
    );
    await page.route(`**${apiBase}/alerts/rules`, (route) => json(route, []));
    await page.route(`**${apiBase}/alerts/incidents`, (route) => json(route, []));

    await page.goto(
      `/workspaces/${state.owner.workspaceId}/desktop-apps/${desktop.id}/alerts`,
    );

    await expect(page.getByRole('heading', { name: 'Desktop Alerts' })).toBeVisible();
    await expect(page.getByText('Create alert rule')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Evaluate now' })).toHaveCount(0);
  });
});
```

This browser suite intentionally mocks only the new Phase 15–17 API surfaces. The Phase 1–14 API/browser suites still run in the final regression matrix and remain responsible for their own real integrations.

---

# 37. Final verification PowerShell runner

Create:

```text
scripts/verify-desktop-phases-15-18.ps1
```

```powershell
$ErrorActionPreference = 'Stop'

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " $Name" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan

    & $Command

    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }

    Write-Host "PASS: $Name" -ForegroundColor Green
}

Write-Host ""
Write-Host "DESKTOP PHASES 15-18 VERIFICATION" -ForegroundColor Cyan
Write-Host "No production/Neon database mutation is performed by this script." -ForegroundColor Yellow

Run-Step 'Prisma format' {
    pnpm --dir apps/api exec prisma format
}

Run-Step 'Prisma validate' {
    pnpm --dir apps/api exec prisma validate
}

Run-Step 'Prisma generate' {
    pnpm --dir apps/api exec prisma generate
}

Run-Step 'Shared types build' {
    pnpm --filter @command-center/shared-types build
}

Run-Step 'API typecheck' {
    pnpm --filter @command-center/api typecheck
}

Run-Step 'Web typecheck' {
    pnpm --filter @command-center/web typecheck
}

Run-Step 'API lint' {
    pnpm --filter @command-center/api lint
}

Run-Step 'Web lint' {
    pnpm --filter @command-center/web lint
}

Run-Step 'API build' {
    pnpm --filter @command-center/api build
}

Run-Step 'Web build' {
    pnpm --filter @command-center/web build
}

$desktopApiTests = @(
    'desktop-alerts.e2e-spec.ts',
    'desktop-ai-analysis.e2e-spec.ts',
    'desktop-security.e2e-spec.ts',
    'desktop-full-flow.e2e-spec.ts'
)

foreach ($testFile in $desktopApiTests) {
    Run-Step "API E2E: $testFile" {
        pnpm --dir apps/api exec jest `
          --config ../../packages/test-code/api/jest-e2e.config.cjs `
          --runInBand `
          --runTestsByPath "../../packages/test-code/api/e2e/$testFile"
    }
}

Run-Step 'Desktop Phase 15-17 frontend unit tests' {
    pnpm --filter @command-center/web-tests exec vitest run `
      unit/features/desktop-apps/desktop-alerts.test.tsx `
      unit/features/desktop-apps/desktop-analysis-panel.test.tsx `
      unit/features/desktop-apps/desktop-permission-gate.test.tsx `
      unit/features/desktop-apps/desktop-apps-api-phase15-17.test.ts
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " PHASE 15-18 TARGETED VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Run the full regression matrix below before declaring Phase 18 PASS." -ForegroundColor Yellow
```

This script does **not** call `migrate dev`, `migrate reset`, `db push`, or touch a production database. Apply the new migration separately against your intended local development DB, then let E2E use the dedicated test DB enforced by your test setup.

---

# 38. Exact targeted verification commands

First, with your local development DB selected, generate/apply the additive migration once:

```powershell
pnpm --dir apps/api exec prisma format
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate dev --name desktop_alerts_ai_analysis
pnpm --dir apps/api exec prisma generate
```

Then run the non-destructive verification script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-desktop-phases-15-18.ps1
```

Or run the four new API suites manually:

```powershell
pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-alerts.e2e-spec.ts

pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-ai-analysis.e2e-spec.ts

pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-security.e2e-spec.ts

pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-full-flow.e2e-spec.ts
```

Frontend targeted tests:

```powershell
pnpm --filter @command-center/web-tests exec vitest run unit/features/desktop-apps
```

Final desktop browser test using the same full-stack Playwright configuration already used by the project:

```powershell
pnpm --dir apps/web exec playwright test ../../packages/test-code/web/e2e/full-stack/fullstack-desktop-final.spec.ts --config ../../packages/test-code/web/playwright.fullstack.config.ts
```

If the existing package exposes a wrapper script for full-stack Playwright, prefer that wrapper so its normal environment/database bootstrap is preserved.

---

# 39. FULL DESKTOP PHASE 1–18 REGRESSION MATRIX

After the targeted Phase 15–18 tests pass, run every existing desktop API E2E file. With the previous bundles, the expected set is:

```powershell
$desktopTests = @(
  'desktop-foundation.e2e-spec.ts',
  'desktop-apps.e2e-spec.ts',
  'desktop-repository-linking.e2e-spec.ts',
  'desktop-project-detection.e2e-spec.ts',
  'desktop-overview.e2e-spec.ts',
  'desktop-builds.e2e-spec.ts',
  'desktop-artifacts.e2e-spec.ts',
  'desktop-tests.e2e-spec.ts',
  'desktop-releases.e2e-spec.ts',
  'desktop-telemetry.e2e-spec.ts',
  'desktop-performance.e2e-spec.ts',
  'desktop-security-health.e2e-spec.ts',
  'desktop-alerts.e2e-spec.ts',
  'desktop-ai-analysis.e2e-spec.ts',
  'desktop-security.e2e-spec.ts',
  'desktop-full-flow.e2e-spec.ts'
)

foreach ($file in $desktopTests) {
  Write-Host ""
  Write-Host "===== $file =====" -ForegroundColor Cyan

  pnpm --dir apps/api exec jest `
    --config ../../packages/test-code/api/jest-e2e.config.cjs `
    --runInBand `
    --runTestsByPath "../../packages/test-code/api/e2e/$file"

  if ($LASTEXITCODE -ne 0) {
    throw "$file failed"
  }
}
```

If one of the earlier bundles used a slightly different filename, keep the real filename in your repository instead of renaming a green suite only to match this list.

---

# 40. Existing-system regression required by Phase 18

Desktop support reuses repository, GitHub, Code Explorer, notification, workspace, and authentication infrastructure. Re-run those existing suites too.

At minimum:

```powershell
pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/phase19-repository-integrations.e2e-spec.ts

pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/phase20-code-explorer.e2e-spec.ts
```

Also run the existing auth/workspace/notification tests in your current E2E set. If you want the strongest final gate, run the complete API package:

```powershell
pnpm --filter @command-center/api-tests test
```

And complete web tests:

```powershell
pnpm --filter @command-center/web-tests test
```

Finally:

```powershell
pnpm run test:all
```

Do not accept a “desktop-only green” result if an existing SaaS Command Center regression is now red.

---

# 41. Phase 18 scenario checklist

Use this as the final manual + automated acceptance sheet.

### Scenario A — Electron

```text
Create Desktop App
→ CROSS_PLATFORM / ELECTRON / X64
→ link GitHub repository
→ detect Electron
→ Code Explorer opens linked repository
→ ingest build
→ ingest artifact
→ ingest tests
→ create/publish release
→ connect telemetry
→ load performance/crashes
→ scan dependencies/security
→ create alert
→ trigger/resolve alert
→ run AI analysis
```

Expected: all desktop pages use the same desktop app ID and workspace; no duplicated repository/notification system.

### Scenario B — Tauri

```text
WINDOWS or CROSS_PLATFORM
TAURI
X64 or ARM64
Cargo + npm dependencies as appropriate
installer artifact visible
runtime metrics and alerts work
```

### Scenario C — .NET

```text
WINDOWS
DOTNET
X64/ARM64
NuGet dependency inventory
MSI/MSIX/EXE artifact tracking
signing security status visible
```

### Scenario D — native macOS

```text
MACOS
NATIVE_MACOS
ARM64 or UNIVERSAL
DMG/PKG/APP artifact tracking
macOS signing check
notarization check
release + runtime health
```

### Scenario E — Security

```text
anonymous → 401
outsider → 403/404
viewer read → allowed
viewer write → 403
developer operational write → allowed where specified
admin/owner management → allowed
cross-workspace child resource id → never exposed
forged GitHub webhook → 401
duplicate valid GitHub delivery → idempotent
telemetry ciphertext → never returned
AI prompt → never contains secrets
```

### Scenario F — Existing product regression

```text
Auth still works
Workspaces still work
Existing SaaS applications still work
Websites still work
Mobile applications still work
Repository/GitHub integration still works
Code Explorer still works
Notifications still work
Monitoring still works
```

---

# 42. Phase-by-phase acceptance

## Phase 15 — PASS only if

- Alert rule CRUD works.
- Threshold evaluation works.
- Failed-build alerts work.
- Signing alerts work.
- Telemetry-unavailable alerts work.
- Active incidents dedupe.
- Cooldown suppresses repeat notifications.
- Recovery resolves incidents.
- Disabled rules do not fire.
- Existing NotificationService receives notifications.
- Workspace isolation tests pass.
- Frontend Alerts page works in loading/empty/error/success states.

Current bundle status: **UNVERIFIED / NOT EXECUTED**.

## Phase 16 — PASS only if

- Deterministic/mock provider test passes.
- Build/release/crash IDs are validated inside the requested workspace/app.
- Context contains only permitted engineering evidence.
- Telemetry credentials/signing secrets do not enter prompt/context/output.
- Response contains `Evidence`, `Correlation`, `Likely cause`, and `Unknown cause` sections.
- AI provider errors return a safe server response.
- Viewer cannot invoke AI analysis.
- Frontend displays evidence references and uncertainty.

Current bundle status: **UNVERIFIED / NOT EXECUTED**.

## Phase 17 — PASS only if

- Every desktop route requires JWT/workspace authorization.
- Write routes use explicit roles.
- Cross-workspace resources are inaccessible.
- Client-supplied resource IDs are workspace/app scoped before use.
- Frontend hides unauthorized controls but backend remains authoritative.
- Existing GitHub signature/idempotency E2E remains green.
- Secret/ciphertext leakage checks pass.

Current bundle status: **UNVERIFIED / NOT EXECUTED**.

## Phase 18 — PASS only if

- Prisma format/validate/generate pass.
- Shared types compile.
- API typecheck/lint/build pass.
- Web typecheck/lint/build pass.
- Unit tests pass.
- Every Desktop Phase 1–18 API E2E suite passes.
- Repository + GitHub + Code Explorer regression tests pass.
- Desktop frontend unit/API-client tests pass.
- Full-stack desktop Playwright tests pass.
- Responsive/collapsed/mobile-width behavior remains usable.
- Existing SaaS Command Center test suites remain green.

Current bundle status: **UNVERIFIED / NOT EXECUTED**.

---

# 43. Environment variables for Phase 16

The AI provider is disabled unless these are configured:

```env
DESKTOP_AI_ANALYSIS_URL=https://your-provider-endpoint.example/v1/analyze
DESKTOP_AI_ANALYSIS_API_KEY=replace-with-secret
DESKTOP_AI_ANALYSIS_MODEL=your-model-name
```

Do not expose any of these through `NEXT_PUBLIC_*` variables. The frontend calls your NestJS API only; the NestJS API owns provider credentials.

For tests, the API E2E suite overrides the provider in memory and does not require a real AI service.

---

# 44. Recommended implementation order

Apply this bundle in exactly this order:

```text
1. Phase 15 Prisma alert model
2. Phase 15 shared types + DTO + service + controller + worker
3. Phase 16 Prisma AI model
4. Phase 16 shared types + sanitizer + context + provider + service + controller
5. Phase 17 permissions/resource-scope services + controller
6. Update DesktopAppsModule
7. Generate one additive local migration for Phase 15/16
8. Prisma generate
9. Shared types build
10. API typecheck
11. Add frontend API functions
12. Add permission gate
13. Add Alerts page
14. Add AI panel to Overview
15. Update sub-navigation
16. Add unit tests
17. Add Phase 15 API E2E
18. Add Phase 16 API E2E
19. Add Phase 17 security E2E
20. Add Phase 18 full-flow E2E
21. Add final Playwright E2E
22. Run targeted verification
23. Run Phase 1–18 regression
24. Run full existing-product regression
```

If a command fails, fix the **first real error** before moving to the next verification layer. Do not mark later phases PASS because a later command happened to run.

---

# FINAL STATUS

```text
Phase 15 — Desktop Alerts                  UNVERIFIED
Phase 16 — AI Desktop Analysis             UNVERIFIED
Phase 17 — Security & Authorization        UNVERIFIED
Phase 18 — Full Verification               NOT EXECUTED

Overall Desktop Support Phase 1–18         NOT VERIFIED BY THIS BUNDLE
```

The implementation is intentionally designed so that Phase 18 can prove the whole feature rather than merely checking whether the new files compile.
