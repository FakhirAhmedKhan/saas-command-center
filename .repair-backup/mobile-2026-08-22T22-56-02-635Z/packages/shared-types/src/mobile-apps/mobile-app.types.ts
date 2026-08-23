import { MobileApplicationDetails } from '../applications';

export const MOBILE_PLATFORMS = ['ANDROID', 'IOS', 'CROSS_PLATFORM'] as const;

export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

export const MOBILE_FRAMEWORKS = ['ANDROID_NATIVE', 'IOS_NATIVE', 'FLUTTER', 'REACT_NATIVE', 'KMP', 'OTHER'] as const;

export type MobileFramework = (typeof MOBILE_FRAMEWORKS)[number];

export interface MobileApplication {
  id: string;
  applicationId: string;

  platform: MobilePlatform;
  framework: MobileFramework;

  packageId: string | null;
  bundleId: string | null;

  minOsVersion: string | null;
  targetOsVersion: string | null;

  currentVersion: string | null;
  currentBuildNumber: string | null;

  createdAt: string;
  updatedAt: string;
}

export const MOBILE_DETECTION_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'] as const;

export type MobileDetectionConfidence = (typeof MOBILE_DETECTION_CONFIDENCE)[number];

export type MobileBuildSystem = 'GRADLE' | 'XCODE' | 'FLUTTER' | 'NODE' | 'SWIFT_PACKAGE' | 'OTHER';

export interface MobileProjectDetection {
  applicationType: 'MOBILE';

  projectRoot: string;

  platform: MobilePlatform;

  framework: MobileFramework;

  packageId: string | null;

  bundleId: string | null;

  minOsVersion: string | null;

  targetOsVersion: string | null;

  currentVersion: string | null;

  currentBuildNumber: string | null;

  buildSystem: MobileBuildSystem;

  confidence: MobileDetectionConfidence;

  evidence: string[];

  warnings: string[];
}

export interface MobileProjectDetectionResponse {
  repository: {
    id: string;

    fullName: string;

    defaultBranch: string;
  };

  mobileDetected: boolean;

  primaryProject: MobileProjectDetection | null;

  projects: MobileProjectDetection[];

  truncated: boolean;

  warnings: string[];
}
export interface MobileAppOverviewRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  archived: boolean;
  isAvailable: boolean;
}

export interface MobileAppOverview {
  mobileApp: MobileApplicationDetails;

  repository: MobileAppOverviewRepository | null;

  latestBuild: MobileBuild | null;

  latestRelease: MobileRelease | null;

  latestPerformance: null;
}

export const MOBILE_RELEASE_ENVIRONMENTS = ['DEVELOPMENT', 'QA', 'INTERNAL', 'BETA', 'PRODUCTION'] as const;

export type MobileReleaseEnvironment = (typeof MOBILE_RELEASE_ENVIRONMENTS)[number];

export const MOBILE_RELEASE_STATUSES = ['DRAFT', 'READY', 'RELEASED', 'FAILED', 'ROLLED_BACK'] as const;

export type MobileReleaseStatus = (typeof MOBILE_RELEASE_STATUSES)[number];

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

  build?: {
    id: string;
    branch: string;
    commitSha: string;
    workflowRunId: string;
  };
}

export interface CreateMobileReleaseInput {
  buildId: string;

  environment: MobileReleaseEnvironment;

  version?: string;
  buildNumber?: string;

  releaseNotes?: string | null;
}

export interface UpdateMobileReleaseStatusInput {
  status: MobileReleaseStatus;
}

export interface MobileReleaseFilters {
  environment?: MobileReleaseEnvironment;
  status?: MobileReleaseStatus;
}

export const MOBILE_PERFORMANCE_METRICS = [
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
] as const;

export type MobilePerformanceMetricName = (typeof MOBILE_PERFORMANCE_METRICS)[number];

export interface MobilePerformanceFilters {
  from?: string;
  to?: string;
  version?: string;
  buildNumber?: string;
  platform?: MobilePlatform;
}

export interface MobilePerformanceValue {
  metric: MobilePerformanceMetricName;
  value: number | null;
  unit: string;
  samples: number;
}

export interface MobilePerformanceSummary {
  providerAvailable: boolean;
  hasData: boolean;

  platform: MobilePlatform | null;
  version: string | null;
  buildNumber: string | null;

  metrics: Record<MobilePerformanceMetricName, MobilePerformanceValue>;

  from: string | null;
  to: string | null;
}

export interface MobilePerformanceVersionSummary {
  version: string;
  buildNumbers: string[];
  platform: MobilePlatform;

  crashFreeUsersRate: number | null;
  crashRate: number | null;
  crashes: number | null;
  anrOrHangs: number | null;
  coldStartupMs: number | null;
  warmStartupMs: number | null;
  memoryMb: number | null;
  networkLatencyMs: number | null;
  apiFailureRate: number | null;
  adoptionRate: number | null;
}

export type MobilePerformanceProblemSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface MobilePerformanceProblem {
  id: string;

  metric: MobilePerformanceMetricName;

  severity: MobilePerformanceProblemSeverity;

  title: string;
  description: string;

  value: number;
  threshold: number;

  version: string | null;
}

export interface MobilePerformanceComparisonMetric {
  metric: MobilePerformanceMetricName;

  before: number | null;
  after: number | null;

  absoluteDelta: number | null;
  percentDelta: number | null;

  direction: 'IMPROVED' | 'DEGRADED' | 'UNCHANGED' | 'UNKNOWN';
}

export interface MobilePerformanceComparison {
  fromVersion: string;
  toVersion: string;

  metrics: MobilePerformanceComparisonMetric[];
}

export const MOBILE_ALERT_RULE_TYPES = ['CRASH_RATE', 'ANR_HANG', 'STARTUP', 'API_FAILURE_RATE', 'BUILD_FAILED', 'RELEASE_REGRESSION'] as const;

export type MobileAlertRuleType = (typeof MOBILE_ALERT_RULE_TYPES)[number];

export interface MobileAlertRule {
  id: string;
  workspaceId: string;
  mobileAppId: string;

  name: string;

  type: MobileAlertRuleType;

  operator: 'GT' | 'GTE';

  threshold: number | null;

  cooldownMinutes: number;

  enabled: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateMobileAlertRuleInput {
  name: string;

  type: MobileAlertRuleType;

  threshold?: number | null;

  cooldownMinutes?: number;

  enabled?: boolean;
}

export interface MobileAlertIncident {
  id: string;

  ruleId: string;

  status: 'OPEN' | 'RESOLVED';

  title: string;
  message: string;

  actualValue: number | null;
  threshold: number | null;

  version: string | null;
  buildId: string | null;

  triggeredAt: string;
  resolvedAt: string | null;
}

export interface MobilePermissionSnapshot {
  role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

  canRead: true;

  canWrite: boolean;

  canAdmin: boolean;

  canManageSecrets: boolean;
}
