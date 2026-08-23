import type { MobileBuild, MobilePlatform } from './mobile-app.types';

export type MobileBuildStatus = 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type MobileTestType = 'UNIT' | 'UI' | 'INTEGRATION' | 'INSTRUMENTATION' | 'SNAPSHOT' | 'OTHER';

export type MobileTestStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';

export interface MobileTestFailure {
  id: string;
  testRunId: string;
  suite: string | null;
  testName: string | null;
  message: string | null;
  file: string | null;
  line?: number | null;
  stackTrace?: string | null;
  createdAt?: string;
}

export interface MobileTestRun {
  id: string;
  buildId: string;
  type: MobileTestType;
  status: MobileTestStatus;
  passed: number;
  failed: number;
  skipped: number;
  total?: number;
  durationMs: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  failures: MobileTestFailure[];
}

export interface MobileBuildFilters {
  status?: MobileBuildStatus;
  branch?: string;
  version?: string;
  platform?: MobilePlatform;
}

export interface MobileTestSummary {
  totalRuns: number;
  passed: number;
  failed: number;
  skipped: number;
  hasFailures: boolean;
}

export interface MobileBuildDetails extends MobileBuild {
  testSummary: MobileTestSummary;

  testRuns: MobileTestRun[];
}

export interface GithubMobileBuildInput {
  repositoryId: string;
  workflowRunId: string | number;
  commitSha: string;
  branch: string;
  version?: string | null;
  buildNumber?: string | null;
  platform?: MobilePlatform;
  status?: string;
  conclusion?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
}

export interface MobileBuildIngestionResult {
  build: MobileBuild;
  created?: boolean;
  updated?: boolean;
  [key: string]: unknown;
}

export interface MobileTestRunInput {
  type: MobileTestType;
  status: MobileTestStatus;
  passed?: number;
  failed?: number;
  skipped?: number;
  total?: number;
  durationMs?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failures?: Array<{
    suite?: string | null;
    testName?: string | null;
    message?: string | null;
    file?: string | null;
    line?: number | null;
    stackTrace?: string | null;
  }>;
}

export type MobileReleaseStatus = 'DRAFT' | 'READY' | 'RELEASED' | 'FAILED' | 'ROLLED_BACK';

export type MobileReleaseEnvironment = 'DEVELOPMENT' | 'QA' | 'INTERNAL' | 'BETA' | 'PRODUCTION';

export interface MobileRelease {
  id: string;
  workspaceId: string;
  mobileAppId: string;
  buildId: string;
  version: string;
  buildNumber: string;
  environment: MobileReleaseEnvironment;
  status: MobileReleaseStatus;
  commitSha: string;
  releaseNotes: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobileReleaseFilters {
  status?: MobileReleaseStatus;
  environment?: MobileReleaseEnvironment;
  version?: string;
}

export interface CreateMobileReleaseInput {
  buildId: string;
  version: string;
  buildNumber: string;
  environment: MobileReleaseEnvironment;
  releaseNotes?: string | null;
}

export interface MobilePerformanceFilters {
  from?: string;
  to?: string;
  version?: string;
  buildNumber?: string;
  platform?: MobilePlatform;
}

export interface MobilePerformanceMetric {
  metric: string;
  value: number | null;
  unit?: string | null;
  [key: string]: unknown;
}

export interface MobilePerformanceSummary {
  platform?: MobilePlatform;
  version?: string | null;
  buildNumber?: string | null;
  metrics: Record<string, number | null>;
  hasData?: boolean;
  [key: string]: unknown;
}

export interface MobilePerformanceVersionSummary {
  version: string;
  buildNumber?: string | null;
  metrics?: Record<string, number | null>;
  [key: string]: unknown;
}

export interface MobilePerformanceProblem {
  metric?: string;
  severity?: string;
  title?: string;
  message?: string;
  value?: number | null;
  [key: string]: unknown;
}

export interface MobilePerformanceComparison {
  current?: MobilePerformanceSummary;
  previous?: MobilePerformanceSummary;
  metrics?: Array<{
    metric: string;
    direction?: string;
    percentDelta?: number | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface MobileAlertRule {
  id: string;
  workspaceId: string;
  mobileAppId: string;
  type: string;
  threshold: number;
  operator?: 'GT' | 'GTE';
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreateMobileAlertRuleInput {
  type: string;
  threshold: number;
  operator?: 'GT' | 'GTE';
  enabled?: boolean;
}

export interface MobileAlertIncident {
  id: string;
  workspaceId: string;
  mobileAppId: string;
  ruleId?: string;
  status: string;
  title?: string;
  message?: string;
  triggeredAt?: string;
  resolvedAt?: string | null;
  version?: string | null;
  [key: string]: unknown;
}

export type MobileAnalysisAction = string;

export interface MobileAnalysisRequest {
  action: MobileAnalysisAction;
  [key: string]: unknown;
}

export interface MobileAnalysisEvidenceItem {
  type?: string;
  title?: string;
  label?: string;
  value?: unknown;
  source?: string;
  [key: string]: unknown;
}

export interface MobileAnalysisResult {
  id?: string;
  action: MobileAnalysisAction;
  answer: string;
  confidence?: number | string | null;
  evidence: MobileAnalysisEvidenceItem[];
  createdAt?: string;
  [key: string]: unknown;
}

export type MobileTelemetryProvider = 'FIREBASE' | 'SENTRY' | 'DATADOG' | 'NEW_RELIC' | 'CUSTOM';

export interface MobileTelemetryIntegration {
  id: string;
  workspaceId: string;
  mobileAppId: string;
  provider: MobileTelemetryProvider;
  status: string;
  externalProjectId: string;
  configuredAt?: string | null;
  lastSyncedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}
