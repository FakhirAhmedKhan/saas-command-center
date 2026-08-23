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
