import { MobileAppsService } from './mobile-apps.service';
import { MobilePerformanceQueryRepository, type NormalizedPerformanceRow, type PerformanceRowFilters } from './mobile-performance-query.repository';
import type {
  MobilePerformanceComparison,
  MobilePerformanceComparisonMetric,
  MobilePerformanceMetricName,
  MobilePerformanceProblem,
  MobilePerformanceSummary,
  MobilePerformanceValue,
  MobilePerformanceVersionSummary,
} from '@command-center/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';

const ALL_METRICS: MobilePerformanceMetricName[] = [
  'CRASH_FREE_USERS_RATE',
  'CRASH_RATE',
  'CRASH_COUNT',
  'ANR_COUNT',
  'HANG_COUNT',
  'COLD_STARTUP_MS',
  'WARM_STARTUP_MS',
  'MEMORY_MB',
  'NETWORK_LATENCY_MS',
  'API_FAILURE_RATE',
  'VERSION_ADOPTION_RATE',
  'SLOW_SCREEN_COUNT',
];

const SUM_METRICS = new Set<MobilePerformanceMetricName>(['CRASH_COUNT', 'ANR_COUNT', 'HANG_COUNT', 'SLOW_SCREEN_COUNT']);

@Injectable()
export class MobilePerformanceDashboardService {
  constructor(
    private readonly mobileApps: MobileAppsService,

    private readonly repository: MobilePerformanceQueryRepository,
  ) {}

  async summary(
    workspaceId: string,
    mobileAppId: string,
    query: {
      from?: string;
      to?: string;
      version?: string;
      buildNumber?: string;
      platform?: 'ANDROID' | 'IOS' | 'CROSS_PLATFORM';
    },
  ): Promise<MobilePerformanceSummary> {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    const filters = this.filters(query);

    const [rows, providerAvailable] = await Promise.all([
      this.repository.find(workspaceId, mobileAppId, filters),

      this.repository.providerAvailable(workspaceId, mobileAppId),
    ]);

    const grouped = this.groupMetrics(rows);

    const metrics = Object.fromEntries(ALL_METRICS.map((metric) => [metric, this.aggregate(metric, grouped.get(metric) ?? [])])) as Record<
      MobilePerformanceMetricName,
      MobilePerformanceValue
    >;

    const latest = rows.at(-1);

    return {
      providerAvailable,
      hasData: rows.length > 0,

      platform: latest?.platform ?? null,

      version: query.version ?? latest?.version ?? null,

      buildNumber: query.buildNumber ?? latest?.buildNumber ?? null,

      metrics,

      from: filters.from?.toISOString() ?? null,

      to: filters.to?.toISOString() ?? null,
    };
  }

  async versions(
    workspaceId: string,
    mobileAppId: string,
    query: {
      from?: string;
      to?: string;
    },
  ): Promise<MobilePerformanceVersionSummary[]> {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    const rows = await this.repository.find(workspaceId, mobileAppId, this.filters(query));

    const byVersion = new Map<string, NormalizedPerformanceRow[]>();

    for (const row of rows) {
      const bucket = byVersion.get(row.version || 'unknown') ?? [];

      bucket.push(row);

      byVersion.set(row.version || 'unknown', bucket);
    }

    return [...byVersion.entries()].map(([version, versionRows]) => this.versionSummary(version, versionRows));
  }

  async issues(
    workspaceId: string,
    mobileAppId: string,
    query: {
      from?: string;
      to?: string;
      version?: string;
      buildNumber?: string;
    },
  ): Promise<MobilePerformanceProblem[]> {
    const summary = await this.summary(workspaceId, mobileAppId, query);

    if (!summary.hasData) {
      return [];
    }

    const problems: MobilePerformanceProblem[] = [];

    this.pushProblem(problems, summary, 'CRASH_RATE', 2, 'CRITICAL', 'High crash rate', 'Crash rate exceeds 2%.');

    const anrs = summary.metrics.ANR_COUNT.value ?? 0;

    const hangs = summary.metrics.HANG_COUNT.value ?? 0;

    if (anrs + hangs > 0) {
      problems.push({
        id: 'anr-hang',

        metric: anrs > 0 ? 'ANR_COUNT' : 'HANG_COUNT',

        severity: 'WARNING',

        title: 'ANR/Hang activity detected',

        description: `${anrs} ANRs and ${hangs} hangs detected.`,

        value: anrs + hangs,

        threshold: 0,

        version: summary.version,
      });
    }

    this.pushProblem(problems, summary, 'COLD_STARTUP_MS', 3000, 'WARNING', 'Slow cold startup', 'Average cold startup exceeds 3 seconds.');

    this.pushProblem(problems, summary, 'NETWORK_LATENCY_MS', 1000, 'WARNING', 'High network latency', 'Average network latency exceeds 1 second.');

    this.pushProblem(problems, summary, 'API_FAILURE_RATE', 2, 'CRITICAL', 'High API failure rate', 'API failure rate exceeds 2%.');

    return problems;
  }

  async compare(workspaceId: string, mobileAppId: string, fromVersion: string, toVersion: string): Promise<MobilePerformanceComparison> {
    if (fromVersion === toVersion) {
      throw new BadRequestException('Choose two different versions.');
    }

    const [beforeRows, afterRows] = await Promise.all([
      this.repository.find(workspaceId, mobileAppId, {
        version: fromVersion,
      }),

      this.repository.find(workspaceId, mobileAppId, {
        version: toVersion,
      }),
    ]);

    await this.mobileApps.findOne(workspaceId, mobileAppId);

    const before = this.groupMetrics(beforeRows);

    const after = this.groupMetrics(afterRows);

    const metrics = ALL_METRICS.map((metric): MobilePerformanceComparisonMetric => {
      const beforeValue = this.aggregate(metric, before.get(metric) ?? []).value;

      const afterValue = this.aggregate(metric, after.get(metric) ?? []).value;

      return this.compareMetric(metric, beforeValue, afterValue);
    });

    return {
      fromVersion,
      toVersion,
      metrics,
    };
  }

  private filters(query: {
    from?: string;
    to?: string;
    version?: string;
    buildNumber?: string;
    platform?: 'ANDROID' | 'IOS' | 'CROSS_PLATFORM';
  }): PerformanceRowFilters {
    const from = query.from ? new Date(query.from) : undefined;

    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException('`from` must be before `to`.');
    }

    return {
      from,
      to,

      version: query.version,

      buildNumber: query.buildNumber,

      platform: query.platform,
    };
  }

  private groupMetrics(rows: NormalizedPerformanceRow[]) {
    const grouped = new Map<MobilePerformanceMetricName, number[]>();

    for (const row of rows) {
      const values = grouped.get(row.metric) ?? [];

      values.push(row.value);

      grouped.set(row.metric, values);
    }

    return grouped;
  }

  private aggregate(
    metric: MobilePerformanceMetricName,

    values: number[],
  ): MobilePerformanceValue {
    if (values.length === 0) {
      return {
        metric,
        value: null,
        unit: this.unit(metric),
        samples: 0,
      };
    }

    const value = SUM_METRICS.has(metric) ? values.reduce((total, item) => total + item, 0) : values.reduce((total, item) => total + item, 0) / values.length;

    return {
      metric,

      value: Math.round(value * 100) / 100,

      unit: this.unit(metric),

      samples: values.length,
    };
  }

  private versionSummary(version: string, rows: NormalizedPerformanceRow[]): MobilePerformanceVersionSummary {
    const grouped = this.groupMetrics(rows);

    const value = (metric: MobilePerformanceMetricName) => this.aggregate(metric, grouped.get(metric) ?? []).value;

    return {
      version,

      buildNumbers: [...new Set(rows.map((row) => row.buildNumber).filter((build): build is string => Boolean(build)))],

      platform: rows[0]!.platform,

      crashFreeUsersRate: value('CRASH_FREE_USERS_RATE'),

      crashRate: value('CRASH_RATE'),

      crashes: value('CRASH_COUNT'),

      anrOrHangs: (value('ANR_COUNT') ?? 0) + (value('HANG_COUNT') ?? 0),

      coldStartupMs: value('COLD_STARTUP_MS'),

      warmStartupMs: value('WARM_STARTUP_MS'),

      memoryMb: value('MEMORY_MB'),

      networkLatencyMs: value('NETWORK_LATENCY_MS'),

      apiFailureRate: value('API_FAILURE_RATE'),

      adoptionRate: value('VERSION_ADOPTION_RATE'),
    };
  }

  private compareMetric(metric: MobilePerformanceMetricName, before: number | null, after: number | null): MobilePerformanceComparisonMetric {
    if (before === null || after === null) {
      return {
        metric,
        before,
        after,

        absoluteDelta: null,

        percentDelta: null,

        direction: 'UNKNOWN',
      };
    }

    const absoluteDelta = after - before;

    const percentDelta = before === 0 ? null : (absoluteDelta / Math.abs(before)) * 100;

    const lowerIsBetter = metric !== 'CRASH_FREE_USERS_RATE' && metric !== 'VERSION_ADOPTION_RATE';

    const improved = lowerIsBetter ? after < before : after > before;

    const degraded = lowerIsBetter ? after > before : after < before;

    return {
      metric,
      before,
      after,

      absoluteDelta: Math.round(absoluteDelta * 100) / 100,

      percentDelta: percentDelta === null ? null : Math.round(percentDelta * 100) / 100,

      direction: improved ? 'IMPROVED' : degraded ? 'DEGRADED' : 'UNCHANGED',
    };
  }

  private pushProblem(
    problems: MobilePerformanceProblem[],

    summary: MobilePerformanceSummary,

    metric: MobilePerformanceMetricName,

    threshold: number,

    severity: 'WARNING' | 'CRITICAL',

    title: string,
    description: string,
  ) {
    const value = summary.metrics[metric].value;

    if (value === null || value <= threshold) {
      return;
    }

    problems.push({
      id: metric,

      metric,
      severity,

      title,
      description,

      value,
      threshold,

      version: summary.version,
    });
  }

  private unit(metric: MobilePerformanceMetricName): string {
    switch (metric) {
      case 'CRASH_FREE_USERS_RATE':
      case 'CRASH_RATE':
      case 'API_FAILURE_RATE':
      case 'VERSION_ADOPTION_RATE':
        return '%';

      case 'COLD_STARTUP_MS':
      case 'WARM_STARTUP_MS':
      case 'NETWORK_LATENCY_MS':
        return 'ms';

      case 'MEMORY_MB':
        return 'MB';

      default:
        return 'count';
    }
  }
}
