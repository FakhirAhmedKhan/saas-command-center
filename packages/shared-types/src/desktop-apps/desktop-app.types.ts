export const DESKTOP_PLATFORMS = ['WINDOWS', 'MACOS', 'LINUX', 'CROSS_PLATFORM'] as const;

export type DesktopPlatform = (typeof DESKTOP_PLATFORMS)[number];

export const DESKTOP_FRAMEWORKS = ['ELECTRON', 'TAURI', 'DOTNET', 'QT', 'JAVA', 'NATIVE_WINDOWS', 'NATIVE_MACOS', 'OTHER'] as const;

export type DesktopFramework = (typeof DESKTOP_FRAMEWORKS)[number];

export const DESKTOP_ARCHITECTURES = ['X64', 'ARM64', 'X86', 'UNIVERSAL'] as const;

export type DesktopArchitecture = (typeof DESKTOP_ARCHITECTURES)[number];

export interface DesktopApplication {
  id: string;

  applicationId: string;

  platform: DesktopPlatform;

  framework: DesktopFramework;

  architecture: DesktopArchitecture;

  packageName: string | null;

  currentVersion: string | null;

  currentBuildNumber: string | null;

  minimumOsVersion: string | null;

  updateChannel: string | null;

  createdAt: string;

  updatedAt: string;
}

export interface DesktopApplicationParent {
  id: string;

  workspaceId: string;

  name: string;

  slug: string;

  type: 'DESKTOP';

  archivedAt: string | null;

  createdAt: string;

  updatedAt: string;
}

export interface DesktopApplicationDetails extends DesktopApplication {
  application: DesktopApplicationParent;
}

export interface DesktopApplicationMetadataInput {
  platform: DesktopPlatform;

  framework: DesktopFramework;

  architecture: DesktopArchitecture;

  packageName?: string | null;

  currentVersion?: string | null;

  currentBuildNumber?: string | null;

  minimumOsVersion?: string | null;

  updateChannel?: string | null;
}

export type UpdateDesktopApplicationMetadataInput = Partial<DesktopApplicationMetadataInput>;

export interface DesktopApplication {
  id: string;
  applicationId: string;

  platform: DesktopPlatform;
  framework: DesktopFramework;
  architecture: DesktopArchitecture;

  packageName: string | null;

  currentVersion: string | null;
  currentBuildNumber: string | null;

  minimumOsVersion: string | null;

  updateChannel: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface DesktopApplicationParent {
  id: string;
  workspaceId: string;

  name: string;
  slug: string;

  type: 'DESKTOP';

  archivedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface DesktopApplicationDetails extends DesktopApplication {
  application: DesktopApplicationParent;
}

export interface DesktopApplicationMetadataInput {
  platform: DesktopPlatform;

  framework: DesktopFramework;

  architecture: DesktopArchitecture;

  packageName?: string | null;

  currentVersion?: string | null;

  currentBuildNumber?: string | null;

  minimumOsVersion?: string | null;

  updateChannel?: string | null;
}

export interface CreateDesktopApplicationInput extends DesktopApplicationMetadataInput {
  name: string;
}

export type UpdateDesktopApplicationInput = Partial<CreateDesktopApplicationInput>;

export type DesktopDetectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DesktopProjectDetectionCandidate {
  applicationType: 'DESKTOP';
  projectRoot: string;
  platform: DesktopPlatform;
  framework: DesktopFramework;
  architecture: DesktopArchitecture | null;
  packageName: string | null;
  version: string | null;
  buildNumber: string | null;
  minimumOsVersion: string | null;
  confidence: DesktopDetectionConfidence;
  score: number;
  evidence: string[];
  warnings: string[];
}

export interface DesktopProjectDetectionResponse {
  repositoryId: string;
  repositoryFullName: string;
  branch: string;
  truncated: boolean;
  candidates: DesktopProjectDetectionCandidate[];
  primary: DesktopProjectDetectionCandidate | null;
}

export type DesktopBuildSource = 'GITHUB_ACTIONS';

export type DesktopBuildStatus = 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface DesktopBuild {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  repositoryId: string;
  workflowRunId: string;
  source: DesktopBuildSource;
  commitSha: string;
  branch: string;
  version: string | null;
  buildNumber: string | null;
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  status: DesktopBuildStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesktopBuildFilters {
  status?: DesktopBuildStatus;
  platform?: DesktopPlatform;
  architecture?: DesktopArchitecture;
  branch?: string;
  version?: string;
}

export interface IngestGithubDesktopBuildInput {
  repositoryId: string;
  workflowRunId: string;
  commitSha: string;
  branch: string;
  version?: string | null;
  buildNumber?: string | null;
  platform?: DesktopPlatform;
  architecture?: DesktopArchitecture;
  status?: DesktopBuildStatus;
  conclusion?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
}

export interface DesktopBuildIngestionResult {
  ignored: boolean;
  reason: string | null;
  build: DesktopBuild | null;
}

export type DesktopBuildArtifactType = 'EXE' | 'MSI' | 'MSIX' | 'DMG' | 'PKG' | 'APP' | 'APPIMAGE' | 'DEB' | 'RPM' | 'ZIP' | 'OTHER';

export interface DesktopBuildArtifact {
  id: string;
  buildId: string;
  providerArtifactId: string;
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  type: DesktopBuildArtifactType;
  fileName: string;
  sizeBytes: number | null;
  checksum: string | null;
  externalUrl: string | null;
  createdAt: string;
}

export interface IngestDesktopBuildArtifactInput {
  providerArtifactId: string;
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  type: DesktopBuildArtifactType;
  fileName: string;
  sizeBytes?: number | null;
  checksum?: string | null;
  externalUrl?: string | null;
}

export type DesktopTestType = 'UNIT' | 'INTEGRATION' | 'UI' | 'E2E' | 'INSTALLER' | 'OTHER';

export type DesktopTestStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';

export interface DesktopTestFailure {
  id: string;
  testRunId: string;
  suite: string | null;
  testName: string | null;
  message: string | null;
  file: string | null;
  line: number | null;
  stackTrace: string | null;
  createdAt: string;
}

export interface DesktopTestRun {
  id: string;
  buildId: string;
  type: DesktopTestType;
  status: DesktopTestStatus;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  failures: DesktopTestFailure[];
}

export interface DesktopTestFailureInput {
  suite?: string | null;
  testName?: string | null;
  message?: string | null;
  file?: string | null;
  line?: number | null;
  stackTrace?: string | null;
}

export interface IngestDesktopTestRunInput {
  type: DesktopTestType;
  status: DesktopTestStatus;
  passed: number;
  failed: number;
  skipped: number;
  durationMs?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failures?: DesktopTestFailureInput[];
}

export interface DesktopTestSummary {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
}

export interface DesktopBuildDetails extends DesktopBuild {
  artifacts: DesktopBuildArtifact[];
  testRuns: DesktopTestRun[];
  testSummary: DesktopTestSummary;
}

export interface DesktopOverviewRepository {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  defaultBranch: string;
  htmlUrl: string;
  isPrivate: boolean;
  archived: boolean;
  isAvailable: boolean;
}

export interface DesktopAppOverview {
  desktopApp: DesktopApplicationDetails;
  repository: DesktopOverviewRepository | null;
  latestBuild: DesktopBuild | null;
  latestRelease: DesktopRelease | null;
  latestPerformance: null;
}

export type DesktopReleaseChannel = 'DEV' | 'ALPHA' | 'BETA' | 'STABLE' | 'LTS';

export type DesktopReleaseStatus = 'DRAFT' | 'READY' | 'PUBLISHED' | 'FAILED' | 'ROLLED_BACK';

export interface DesktopReleaseBuildSummary extends DesktopBuild {
  artifacts: DesktopBuildArtifact[];
}

export interface DesktopRelease {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  buildId: string;
  version: string;
  buildNumber: string;
  channel: DesktopReleaseChannel;
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  status: DesktopReleaseStatus;
  releaseNotes: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  build: DesktopReleaseBuildSummary;
}

export interface DesktopReleaseFilters {
  channel?: DesktopReleaseChannel;
  status?: DesktopReleaseStatus;
  platform?: DesktopPlatform;
  architecture?: DesktopArchitecture;
}

export interface CreateDesktopReleaseInput {
  buildId: string;
  channel: DesktopReleaseChannel;
  version?: string;
  buildNumber?: string;
  releaseNotes?: string | null;
}

export type DesktopTelemetryProvider = 'SENTRY' | 'DATADOG' | 'NEW_RELIC' | 'OPENTELEMETRY' | 'CUSTOM';

export type DesktopTelemetryIntegrationStatus = 'CONNECTED' | 'ERROR' | 'DISCONNECTED';

export interface DesktopTelemetryIntegration {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  provider: DesktopTelemetryProvider;
  status: DesktopTelemetryIntegrationStatus;
  externalProjectId: string;
  endpointUrl: string;
  configuredAt: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  hasSecret: boolean;
}

export interface ConnectDesktopTelemetryInput {
  provider: DesktopTelemetryProvider;
  externalProjectId: string;
  endpointUrl: string;
  secret: string;
}

export type DesktopPerformanceMetricType =
  | 'CRASH_FREE_USERS_PERCENT'
  | 'CRASH_FREE_SESSIONS_PERCENT'
  | 'STARTUP_MS'
  | 'MEMORY_MB'
  | 'CPU_PERCENT'
  | 'HANG_RATE_PERCENT'
  | 'NETWORK_LATENCY_MS'
  | 'API_FAILURE_RATE_PERCENT'
  | 'VERSION_ADOPTION_PERCENT';

export interface DesktopTelemetryPerformanceSample {
  externalId: string;
  type: DesktopPerformanceMetricType;
  value: number;
  unit: string;
  recordedAt: string;
  version?: string | null;
  platform?: DesktopPlatform | null;
  architecture?: DesktopArchitecture | null;
  channel?: DesktopReleaseChannel | null;
}

export interface DesktopTelemetryCrashSample {
  externalId: string;
  fingerprint: string;
  message: string;
  count: number;
  affectedUsers: number;
  firstSeenAt: string;
  lastSeenAt: string;
  version?: string | null;
  platform?: DesktopPlatform | null;
  architecture?: DesktopArchitecture | null;
  channel?: DesktopReleaseChannel | null;
}

export interface DesktopTelemetryVersionSample {
  version: string;
  users: number;
  sessions: number;
}

export interface DesktopTelemetrySnapshot {
  performance: DesktopTelemetryPerformanceSample[];
  crashes: DesktopTelemetryCrashSample[];
  versions: DesktopTelemetryVersionSample[];
}

export interface DesktopTelemetrySyncResult {
  integration: DesktopTelemetryIntegration;
  performanceInserted: number;
  performanceUpdated: number;
  crashesUpserted: number;
  versionsSeen: number;
}

export interface DesktopRuntimeFilters {
  from?: string;
  to?: string;
  version?: string;
  platform?: DesktopPlatform;
  architecture?: DesktopArchitecture;
  channel?: DesktopReleaseChannel;
}

export interface DesktopMetric {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  telemetryIntegrationId: string;
  externalId: string;
  type: DesktopPerformanceMetricType;
  value: number;
  unit: string;
  version: string | null;
  platform: DesktopPlatform | null;
  architecture: DesktopArchitecture | null;
  channel: DesktopReleaseChannel | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesktopPerformanceSummary {
  crashFreeUsersPercent: number | null;
  crashFreeSessionsPercent: number | null;
  startupMs: number | null;
  memoryMb: number | null;
  cpuPercent: number | null;
  hangRatePercent: number | null;
  networkLatencyMs: number | null;
  apiFailureRatePercent: number | null;
  versionAdoptionPercent: number | null;
  sampleCount: number;
  from: string | null;
  to: string | null;
}

export interface DesktopPerformanceResponse {
  summary: DesktopPerformanceSummary;
  metrics: DesktopMetric[];
}

export interface DesktopCrash {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  telemetryIntegrationId: string;
  externalId: string;
  fingerprint: string;
  message: string;
  count: number;
  affectedUsers: number;
  version: string | null;
  platform: DesktopPlatform | null;
  architecture: DesktopArchitecture | null;
  channel: DesktopReleaseChannel | null;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DesktopDependencyEcosystem = 'NPM' | 'CARGO' | 'NUGET' | 'MAVEN' | 'GRADLE' | 'CMAKE' | 'CONAN' | 'VCPKG' | 'OTHER';

export type DesktopDependencyRiskStatus = 'CURRENT' | 'UPDATE_AVAILABLE' | 'VULNERABLE' | 'UNKNOWN';

export type DesktopSecuritySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DesktopDependency {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  ecosystem: DesktopDependencyEcosystem;
  manifestPath: string;
  name: string;
  currentVersion: string;
  latestVersion: string | null;
  direct: boolean;
  riskStatus: DesktopDependencyRiskStatus;
  severity: DesktopSecuritySeverity | null;
  advisoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type DesktopSecurityCheckType = 'WINDOWS_SIGNING' | 'MACOS_SIGNING' | 'MACOS_NOTARIZATION' | 'PACKAGING_CONFIGURATION' | 'DEPENDENCY_VULNERABILITY';

export type DesktopSecurityCheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';

export interface DesktopSecurityFinding {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  findingKey: string;
  type: DesktopSecurityCheckType;
  status: DesktopSecurityCheckStatus;
  severity: DesktopSecuritySeverity;
  title: string;
  message: string;
  sourcePath: string | null;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DesktopSecuritySummary {
  windowsSigning: DesktopSecurityCheckStatus;
  macosSigning: DesktopSecurityCheckStatus;
  notarization: DesktopSecurityCheckStatus;
  criticalRisks: number;
  highRisks: number;
  findings: DesktopSecurityFinding[];
}

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

export type DesktopAlertRuleType = (typeof DESKTOP_ALERT_RULE_TYPES)[number];

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

export type UpdateDesktopAlertRuleInput = Partial<Pick<CreateDesktopAlertRuleInput, 'name' | 'operator' | 'threshold' | 'cooldownMinutes' | 'enabled'>>;

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

export const DESKTOP_ANALYSIS_ACTIONS = ['BUILD_FAILURE', 'CRASH_INCREASE', 'PERFORMANCE_REGRESSION', 'RELEASE_HEALTH', 'CUSTOM'] as const;

export type DesktopAnalysisAction = (typeof DESKTOP_ANALYSIS_ACTIONS)[number];

export type DesktopAnalysisConfidence = 'LIMITED' | 'SUPPORTED';

export type DesktopAnalysisEvidenceType =
  'REPOSITORY' | 'BUILD' | 'ARTIFACT' | 'TEST' | 'RELEASE' | 'CRASH' | 'PERFORMANCE' | 'DEPENDENCY' | 'SECURITY' | 'ALERT';

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
export type DesktopWorkspaceRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export interface DesktopPermissions {
  role: DesktopWorkspaceRole;
  canRead: true;
  canWrite: boolean;
  canManage: boolean;
  canAnalyze: boolean;
  canConfigureSecrets: boolean;
}
