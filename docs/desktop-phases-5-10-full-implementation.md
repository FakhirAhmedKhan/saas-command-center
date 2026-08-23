# SaaS Command Center — Desktop Application Support

## Phases 5–10 Full Implementation Bundle

**Assumption:** Phases 1–4 are already implemented and working. In particular:

- `ApplicationType.DESKTOP`, `DesktopPlatform`, `DesktopFramework`, `DesktopArchitecture`, and `DesktopApplication` already exist.
- Desktop CRUD already exists.
- The Desktop Apps frontend already exists.
- Phase 4 repository linking already exists and exposes:
  - `GET /api/v1/workspaces/:workspaceId/desktop-apps/:desktopAppId/repository`
  - `POST /api/v1/workspaces/:workspaceId/desktop-apps/:desktopAppId/repository`
  - `DELETE /api/v1/workspaces/:workspaceId/desktop-apps/:desktopAppId/repository`
- `DesktopAppsService.findOne(workspaceId, desktopAppId)` returns the desktop application together with its parent `SaasApplication`.
- `DesktopRepositoryService.getLinkedRepository(workspaceId, desktopAppId)` returns the existing workspace-scoped `RepositoryConnection`.
- `DesktopAppsModule` already imports `RepositoriesModule`.

This bundle intentionally reuses the existing Repository/GitHub/Code Explorer stack. It does **not** add desktop-specific source-code APIs.

> Verification status in this document is **NOT EXECUTED**. Run the commands at the end in the real repository and only mark a phase PASS after the commands succeed.

---

# 0. Final File Map

```text
packages/shared-types/src/desktop-apps/
└── desktop-app.types.ts                         UPDATE

apps/api/prisma/models/
├── desktop-application.prisma                  UPDATE
├── desktop-build.prisma                        NEW  (Phase 8)
├── desktop-build-artifact.prisma               NEW  (Phase 9)
└── desktop-test.prisma                         NEW  (Phase 10)

apps/api/prisma/models/repositories.prisma       UPDATE

apps/api/src/modules/desktop-apps/
├── controllers/
│   ├── desktop-project-detection.controller.ts NEW
│   ├── desktop-overview.controller.ts          NEW
│   ├── desktop-builds.controller.ts            NEW
│   ├── desktop-build-artifacts.controller.ts   NEW
│   └── desktop-tests.controller.ts             NEW
├── dto/
│   ├── desktop-build.dto.ts                    NEW
│   ├── desktop-build-artifact.dto.ts           NEW
│   └── desktop-test.dto.ts                     NEW
├── services/
│   ├── desktop-project-detector.ts             NEW
│   ├── desktop-project-detection.service.ts    NEW
│   ├── desktop-overview.service.ts             NEW
│   ├── desktop-builds.service.ts               NEW
│   ├── desktop-build-artifacts.service.ts      NEW
│   └── desktop-tests.service.ts                NEW
└── desktop-apps.module.ts                      UPDATE

apps/web/src/features/desktop-apps/
├── desktop-apps-api.ts                         UPDATE
├── desktop-app-sub-nav.tsx                     NEW
├── desktop-project-detection-panel.tsx         NEW
├── desktop-overview.tsx                        NEW
├── desktop-build-utils.ts                      NEW
├── desktop-builds.tsx                          NEW
└── desktop-tests.tsx                           NEW

apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/
├── page.tsx                                    UPDATE / MERGE
├── code/page.tsx                               NEW
├── builds/page.tsx                             NEW
├── builds/[buildId]/page.tsx                   NEW
└── tests/page.tsx                              NEW

packages/test-code/api/e2e/
├── helpers/desktop-test-fixtures.ts            NEW
├── desktop-project-detection.e2e-spec.ts       NEW
├── desktop-overview.e2e-spec.ts                NEW
├── desktop-builds.e2e-spec.ts                  NEW
├── desktop-build-artifacts.e2e-spec.ts         NEW
└── desktop-tests.e2e-spec.ts                   NEW

packages/test-code/api/unit/
└── desktop-project-detector.spec.ts            NEW

packages/test-code/web/unit/features/desktop-apps/
├── desktop-apps-api.phase5-10.test.ts           NEW
├── desktop-app-sub-nav.test.tsx                NEW
├── desktop-project-detection-panel.test.tsx    NEW
├── desktop-builds.test.tsx                     NEW
└── desktop-tests.test.tsx                      NEW

packages/test-code/web/e2e/full-stack/
└── fullstack-desktop-phases-5-10.spec.ts       NEW
```

---

# 1. Shared Types — Phases 5–10

Open the existing Phase-1 file:

```text
packages/shared-types/src/desktop-apps/desktop-app.types.ts
```

Keep the Phase 1–4 declarations and append the following.

```ts
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
  latestRelease: null;
  latestPerformance: null;
}
```

Make sure the existing package entry point continues exporting the desktop types. If Phase 1 already contains this line, do not duplicate it.

```ts
export * from './desktop-apps/desktop-app.types';
```

---

# PHASE 5 — AUTOMATIC DESKTOP PROJECT DETECTION

## 5.1 Backend: pure detector

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-project-detector.ts
```

```ts
import type {
  DesktopArchitecture,
  DesktopFramework,
  DesktopPlatform,
  DesktopProjectDetectionCandidate,
  DesktopProjectDetectionResponse,
} from '@command-center/shared-types';

export interface DesktopRepositorySnapshot {
  repositoryId: string;
  repositoryFullName: string;
  branch: string;
  truncated: boolean;
  paths: string[];
  files: Record<string, string>;
}

interface CandidateDraft {
  projectRoot: string;
  platform: DesktopPlatform;
  framework: DesktopFramework;
  architecture?: DesktopArchitecture | null;
  packageName?: string | null;
  version?: string | null;
  buildNumber?: string | null;
  minimumOsVersion?: string | null;
  score: number;
  evidence: string[];
  warnings?: string[];
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index < 0 ? '' : normalized.slice(0, index);
}

function join(root: string, name: string): string {
  return root ? `${root}/${name}` : name;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function getText(snapshot: DesktopRepositorySnapshot, path: string): string | null {
  const normalized = normalizePath(path);
  return snapshot.files[normalized] ?? null;
}

function safeJson(text: string | null): Record<string, unknown> | null {
  if (!text) return null;

  try {
    const value = JSON.parse(text) as unknown;

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function confidence(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 85) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  return 'LOW';
}

function parseRustVersion(cargo: string | null): string | null {
  if (!cargo) return null;
  return cargo.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1] ?? null;
}

function parseDotnetVersion(project: string | null): string | null {
  if (!project) return null;

  return project.match(/<Version>([^<]+)<\/Version>/i)?.[1]?.trim() ?? project.match(/<AssemblyVersion>([^<]+)<\/AssemblyVersion>/i)?.[1]?.trim() ?? null;
}

function inferArchitectures(text: string): DesktopArchitecture | null {
  const lower = text.toLowerCase();

  if (/(universal2|universal binary|arm64.*x64|x64.*arm64)/s.test(lower)) {
    return 'UNIVERSAL';
  }

  if (/(arm64|aarch64)/.test(lower)) return 'ARM64';
  if (/(win32|x86\b|i386)/.test(lower)) return 'X86';
  if (/(x64|amd64|x86_64)/.test(lower)) return 'X64';

  return null;
}

function inferPlatforms(text: string): DesktopPlatform {
  const lower = text.toLowerCase();

  const windows = /(windows|win32|msi|msix|wpf|winui|windows forms)/.test(lower);
  const macos = /(macos|darwin|osx|appkit|mac catalyst)/.test(lower);
  const linux = /(linux|appimage|deb|rpm)/.test(lower);

  const count = [windows, macos, linux].filter(Boolean).length;

  if (count > 1) return 'CROSS_PLATFORM';
  if (windows) return 'WINDOWS';
  if (macos) return 'MACOS';
  if (linux) return 'LINUX';

  return 'CROSS_PLATFORM';
}

function detectElectron(snapshot: DesktopRepositorySnapshot, packagePath: string): CandidateDraft | null {
  const packageJson = safeJson(getText(snapshot, packagePath));

  if (!packageJson) return null;

  const dependencies = {
    ...objectValue(packageJson.dependencies),
    ...objectValue(packageJson.devDependencies),
  };

  const scripts = objectValue(packageJson.scripts);
  const build = objectValue(packageJson.build);

  const hasElectron = typeof dependencies.electron === 'string';
  const hasBuilder = typeof dependencies['electron-builder'] === 'string';
  const hasForge = typeof dependencies['@electron-forge/cli'] === 'string' || Object.keys(dependencies).some((key) => key.startsWith('@electron-forge/'));

  const main = stringValue(packageJson.main);
  const scriptText = JSON.stringify(scripts ?? {}).toLowerCase();

  if (!hasElectron && !hasBuilder && !hasForge && !scriptText.includes('electron')) {
    return null;
  }

  const root = dirname(packagePath);
  const evidence = [packagePath];

  if (hasElectron) evidence.push('package.json:electron');
  if (hasBuilder) evidence.push('package.json:electron-builder');
  if (hasForge) evidence.push('package.json:electron-forge');

  const buildText = JSON.stringify(build ?? {});

  return {
    projectRoot: root,
    platform: inferPlatforms(`${buildText} ${scriptText}`),
    framework: 'ELECTRON',
    architecture: inferArchitectures(`${buildText} ${scriptText}`),
    packageName: stringValue(packageJson.name) ?? stringValue(build?.appId) ?? null,
    version: stringValue(packageJson.version),
    buildNumber: null,
    minimumOsVersion: null,
    score: Math.min(100, 70 + (hasBuilder ? 12 : 0) + (hasForge ? 12 : 0) + (main ? 6 : 0)),
    evidence,
  };
}

function detectTauri(snapshot: DesktopRepositorySnapshot, configPath: string): CandidateDraft | null {
  const rootMarker = '/src-tauri/';
  const normalized = normalizePath(configPath);

  const markerIndex = normalized.indexOf(rootMarker);
  const root = markerIndex >= 0 ? normalized.slice(0, markerIndex) : normalized.startsWith('src-tauri/') ? '' : dirname(dirname(normalized));

  const tauriRoot = join(root, 'src-tauri');
  const cargoPath = join(tauriRoot, 'Cargo.toml');

  const config = safeJson(getText(snapshot, normalized));
  const cargo = getText(snapshot, cargoPath);

  if (!cargo && !config) return null;

  const packageNode = objectValue(config?.package);
  const productName = stringValue(packageNode?.productName) ?? stringValue(config?.productName);

  const version = stringValue(packageNode?.version) ?? stringValue(config?.version) ?? parseRustVersion(cargo);

  const combined = `${getText(snapshot, normalized) ?? ''}\n${cargo ?? ''}`;

  return {
    projectRoot: root,
    platform: inferPlatforms(combined),
    framework: 'TAURI',
    architecture: inferArchitectures(combined),
    packageName: productName,
    version,
    buildNumber: null,
    minimumOsVersion: null,
    score: cargo ? 98 : 88,
    evidence: unique([normalized, ...(cargo ? [cargoPath] : [])]),
  };
}

function detectDotnet(snapshot: DesktopRepositorySnapshot, projectPath: string): CandidateDraft | null {
  const text = getText(snapshot, projectPath);
  if (!text) return null;

  const lower = text.toLowerCase();

  const isDesktop =
    lower.includes('<usewpf>true</usewpf>') ||
    lower.includes('<usewindowsforms>true</usewindowsforms>') ||
    lower.includes('microsoft.windowsappsdk') ||
    lower.includes('avalonia');

  if (!isDesktop) return null;

  const evidence = [projectPath];
  const targetFramework = text.match(/<TargetFrameworks?>([^<]+)<\/TargetFrameworks?>/i)?.[1] ?? '';

  const runtimeIdentifiers = text.match(/<RuntimeIdentifiers?>([^<]+)<\/RuntimeIdentifiers?>/i)?.[1] ?? '';

  const combined = `${text}\n${targetFramework}\n${runtimeIdentifiers}`;

  const platform: DesktopPlatform =
    lower.includes('avalonia') && !/windows/i.test(combined)
      ? 'CROSS_PLATFORM'
      : inferPlatforms(combined.includes('windows') ? combined : `${combined} windows`);

  const packageName =
    text.match(/<AssemblyName>([^<]+)<\/AssemblyName>/i)?.[1]?.trim() ??
    projectPath
      .split('/')
      .pop()
      ?.replace(/\.(cs|fs|vb)proj$/i, '') ??
    null;

  return {
    projectRoot: dirname(projectPath),
    platform,
    framework: 'DOTNET',
    architecture: inferArchitectures(combined),
    packageName,
    version: parseDotnetVersion(text),
    buildNumber: null,
    minimumOsVersion: text.match(/<TargetPlatformMinVersion>([^<]+)<\/TargetPlatformMinVersion>/i)?.[1]?.trim() ?? null,
    score: lower.includes('microsoft.windowsappsdk') || lower.includes('<usewpf>true</usewpf>') ? 96 : 90,
    evidence,
  };
}

function detectQt(snapshot: DesktopRepositorySnapshot, path: string): CandidateDraft | null {
  const text = getText(snapshot, path);
  if (!text) return null;

  const lower = text.toLowerCase();

  const qtEvidence = /\bfind_package\s*\(\s*qt[56]/i.test(text) || /\bqt_add_(executable|qml_module)/i.test(text) || /\bqt\s*\+=/i.test(text);

  if (!qtEvidence) return null;

  const root = dirname(path);
  const target =
    text.match(/\bqt_add_executable\s*\(\s*([A-Za-z0-9_.-]+)/i)?.[1] ??
    text.match(/\badd_executable\s*\(\s*([A-Za-z0-9_.-]+)/i)?.[1] ??
    text.match(/^\s*TARGET\s*=\s*([^\r\n#]+)/im)?.[1]?.trim() ??
    null;

  return {
    projectRoot: root,
    platform: inferPlatforms(lower),
    framework: 'QT',
    architecture: inferArchitectures(lower),
    packageName: target,
    version: null,
    buildNumber: null,
    minimumOsVersion: null,
    score: path.toLowerCase().endsWith('.pro') ? 92 : 90,
    evidence: [path],
  };
}

function detectJava(snapshot: DesktopRepositorySnapshot, path: string): CandidateDraft | null {
  const text = getText(snapshot, path);
  if (!text) return null;

  const lower = text.toLowerCase();

  const javafx = lower.includes('org.openjfx') || lower.includes('javafx-controls') || lower.includes('javafx.fxml') || lower.includes('javafx');

  const swing = snapshot.paths.some(
    (candidate) => /\.(java|kt)$/i.test(candidate) && /\b(src|app)\b/i.test(candidate) && /swing/i.test(getText(snapshot, candidate) ?? ''),
  );

  if (!javafx && !swing) return null;

  let version: string | null = null;
  let packageName: string | null = null;

  if (path.endsWith('pom.xml')) {
    version = text.match(/<version>([^<]+)<\/version>/i)?.[1]?.trim() ?? null;
    packageName = text.match(/<artifactId>([^<]+)<\/artifactId>/i)?.[1]?.trim() ?? null;
  } else {
    version = text.match(/\bversion\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? null;

    packageName = text.match(/\brootProject\.name\s*=\s*['"]([^'"]+)['"]/i)?.[1] ?? null;
  }

  return {
    projectRoot: dirname(path),
    platform: 'CROSS_PLATFORM',
    framework: 'JAVA',
    architecture: inferArchitectures(lower),
    packageName,
    version,
    buildNumber: null,
    minimumOsVersion: null,
    score: javafx ? 90 : 72,
    evidence: [path, javafx ? 'JavaFX dependency' : 'Swing source evidence'],
  };
}

function detectNativeMacos(snapshot: DesktopRepositorySnapshot, path: string): CandidateDraft | null {
  const normalized = normalizePath(path);

  if (!/\.(xcodeproj|xcworkspace)\//i.test(`${normalized}/`) && !/\.(xcodeproj|xcworkspace)$/i.test(normalized)) {
    return null;
  }

  const root = dirname(normalized.replace(/\/[^/]+$/, ''));
  const projectFile = snapshot.paths.find((candidate) => candidate.startsWith(root ? `${root}/` : '') && candidate.endsWith('project.pbxproj'));

  const pbx = projectFile ? getText(snapshot, projectFile) : null;

  if (pbx && !/(SDKROOT\s*=\s*macosx|MACOSX_DEPLOYMENT_TARGET|com\.apple\.product-type\.application)/i.test(pbx)) {
    return null;
  }

  const packageName =
    pbx
      ?.match(/\bPRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/i)?.[1]
      ?.replace(/["']/g, '')
      .trim() ?? null;

  const version =
    pbx
      ?.match(/\bMARKETING_VERSION\s*=\s*([^;]+);/i)?.[1]
      ?.replace(/["']/g, '')
      .trim() ?? null;

  const buildNumber =
    pbx
      ?.match(/\bCURRENT_PROJECT_VERSION\s*=\s*([^;]+);/i)?.[1]
      ?.replace(/["']/g, '')
      .trim() ?? null;

  const minimumOsVersion =
    pbx
      ?.match(/\bMACOSX_DEPLOYMENT_TARGET\s*=\s*([^;]+);/i)?.[1]
      ?.replace(/["']/g, '')
      .trim() ?? null;

  return {
    projectRoot: root,
    platform: 'MACOS',
    framework: 'NATIVE_MACOS',
    architecture: pbx ? inferArchitectures(pbx) : null,
    packageName,
    version,
    buildNumber,
    minimumOsVersion,
    score: pbx ? 96 : 76,
    evidence: unique([normalized, ...(projectFile ? [projectFile] : [])]),
  };
}

function mergeCandidates(candidates: CandidateDraft[]): DesktopProjectDetectionCandidate[] {
  const grouped = new Map<string, CandidateDraft>();

  for (const candidate of candidates) {
    const key = `${candidate.projectRoot}:${candidate.framework}`;

    const existing = grouped.get(key);

    if (!existing || candidate.score > existing.score) {
      grouped.set(key, candidate);
      continue;
    }

    existing.evidence = unique([...existing.evidence, ...candidate.evidence]);
  }

  return [...grouped.values()]
    .map((candidate) => ({
      applicationType: 'DESKTOP' as const,
      projectRoot: candidate.projectRoot,
      platform: candidate.platform,
      framework: candidate.framework,
      architecture: candidate.architecture ?? null,
      packageName: candidate.packageName ?? null,
      version: candidate.version ?? null,
      buildNumber: candidate.buildNumber ?? null,
      minimumOsVersion: candidate.minimumOsVersion ?? null,
      confidence: confidence(candidate.score),
      score: candidate.score,
      evidence: unique(candidate.evidence),
      warnings: unique(candidate.warnings ?? []),
    }))
    .sort((a, b) => b.score - a.score || a.projectRoot.localeCompare(b.projectRoot));
}

export class DesktopProjectDetector {
  detect(snapshot: DesktopRepositorySnapshot): DesktopProjectDetectionResponse {
    const paths = snapshot.paths.map(normalizePath);
    const drafts: CandidateDraft[] = [];

    for (const path of paths) {
      if (path.endsWith('package.json')) {
        const candidate = detectElectron(snapshot, path);
        if (candidate) drafts.push(candidate);
      }

      if (/(^|\/)src-tauri\/tauri\.conf\.(json|json5)$/i.test(path) || /(^|\/)src-tauri\/tauri\.conf\.json$/i.test(path)) {
        const candidate = detectTauri(snapshot, path);
        if (candidate) drafts.push(candidate);
      }

      if (/\.(csproj|fsproj|vbproj)$/i.test(path)) {
        const candidate = detectDotnet(snapshot, path);
        if (candidate) drafts.push(candidate);
      }

      if (/(^|\/)CMakeLists\.txt$/i.test(path) || /\.pro$/i.test(path)) {
        const candidate = detectQt(snapshot, path);
        if (candidate) drafts.push(candidate);
      }

      if (/(^|\/)(pom\.xml|build\.gradle|build\.gradle\.kts)$/i.test(path)) {
        const candidate = detectJava(snapshot, path);
        if (candidate) drafts.push(candidate);
      }

      if (/\.(xcodeproj|xcworkspace)(\/|$)/i.test(path)) {
        const candidate = detectNativeMacos(snapshot, path);
        if (candidate) drafts.push(candidate);
      }
    }

    const candidates = mergeCandidates(drafts);

    if (snapshot.truncated) {
      for (const candidate of candidates) {
        candidate.warnings.push('Repository metadata was truncated; detection may be incomplete.');
      }
    }

    return {
      repositoryId: snapshot.repositoryId,
      repositoryFullName: snapshot.repositoryFullName,
      branch: snapshot.branch,
      truncated: snapshot.truncated,
      candidates,
      primary: candidates[0] ?? null,
    };
  }
}
```

## 5.2 Backend: repository-backed detection service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-project-detection.service.ts
```

```ts
import { DesktopRepositoryService } from './desktop-repository.service';
import { DesktopProjectDetector, type DesktopRepositorySnapshot } from './desktop-project-detector';
import { GithubCodeService } from '../../repositories/services/github-code.service';
import { BadRequestException, Injectable } from '@nestjs/common';

const MAX_METADATA_FILES = 80;
const MAX_METADATA_FILE_SIZE = 300_000;

@Injectable()
export class DesktopProjectDetectionService {
  private readonly detector = new DesktopProjectDetector();

  constructor(
    private readonly desktopRepositories: DesktopRepositoryService,
    private readonly githubCode: GithubCodeService,
  ) {}

  async detect(workspaceId: string, desktopAppId: string) {
    const repository = await this.desktopRepositories.getLinkedRepository(workspaceId, desktopAppId);

    if (!repository) {
      throw new BadRequestException('Connect a repository before running desktop project detection.');
    }

    if (repository.archived || !repository.isAvailable) {
      throw new BadRequestException('The linked repository is not available for desktop project detection.');
    }

    const tree = await this.githubCode.getTree(repository.installation.externalInstallationId, repository.owner, repository.name, repository.defaultBranch);

    const paths = tree.entries.filter((entry) => entry.type === 'file').map((entry) => entry.path);

    const candidateEntries = tree.entries.filter(
      (entry) =>
        entry.type === 'file' && this.isDetectionFile(entry.path) && (entry.size === null || entry.size === undefined || entry.size <= MAX_METADATA_FILE_SIZE),
    );

    const selectedEntries = candidateEntries.slice(0, MAX_METADATA_FILES);

    const files: Record<string, string> = {};

    for (const entry of selectedEntries) {
      try {
        const file = await this.githubCode.getFile(
          repository.installation.externalInstallationId,
          repository.owner,
          repository.name,
          entry.path,
          repository.defaultBranch,
        );

        if (file.size > MAX_METADATA_FILE_SIZE) {
          continue;
        }

        files[entry.path] = file.content;
      } catch {
        // Missing/deleted/unreadable metadata must not crash the full detection pass.
      }
    }

    // Xcode project metadata is inside *.xcodeproj/project.pbxproj.
    const xcodeProjectFiles = tree.entries
      .filter((entry) => entry.type === 'file' && /(^|\/)[^/]+\.xcodeproj\/project\.pbxproj$/i.test(entry.path) && !files[entry.path])
      .slice(0, Math.max(0, MAX_METADATA_FILES - Object.keys(files).length));

    for (const entry of xcodeProjectFiles) {
      try {
        const file = await this.githubCode.getFile(
          repository.installation.externalInstallationId,
          repository.owner,
          repository.name,
          entry.path,
          repository.defaultBranch,
        );

        if (file.size <= MAX_METADATA_FILE_SIZE) {
          files[entry.path] = file.content;
        }
      } catch {
        // Safe degradation.
      }
    }

    // Swing does not require a special build dependency, so inspect a small,
    // bounded source sample as well. This lets the pure detector find imports
    // such as javax.swing without downloading the entire repository.
    const javaSourceFiles = tree.entries
      .filter(
        (entry) =>
          entry.type === 'file' &&
          /\.(java|kt)$/i.test(entry.path) &&
          !files[entry.path] &&
          (entry.size === null || entry.size === undefined || entry.size <= MAX_METADATA_FILE_SIZE),
      )
      .slice(0, 20);

    for (const entry of javaSourceFiles) {
      try {
        const file = await this.githubCode.getFile(
          repository.installation.externalInstallationId,
          repository.owner,
          repository.name,
          entry.path,
          repository.defaultBranch,
        );

        if (file.size <= MAX_METADATA_FILE_SIZE) {
          files[entry.path] = file.content;
        }
      } catch {
        // Safe degradation.
      }
    }

    const snapshot: DesktopRepositorySnapshot = {
      repositoryId: repository.id,
      repositoryFullName: repository.fullName,
      branch: repository.defaultBranch,
      truncated: tree.truncated || candidateEntries.length > MAX_METADATA_FILES,
      paths,
      files,
    };

    return this.detector.detect(snapshot);
  }

  private isDetectionFile(path: string): boolean {
    return (
      /(^|\/)package\.json$/i.test(path) ||
      /(^|\/)src-tauri\/tauri\.conf\.(json|json5)$/i.test(path) ||
      /(^|\/)src-tauri\/Cargo\.toml$/i.test(path) ||
      /\.(csproj|fsproj|vbproj|sln)$/i.test(path) ||
      /(^|\/)CMakeLists\.txt$/i.test(path) ||
      /\.pro$/i.test(path) ||
      /(^|\/)(pom\.xml|build\.gradle|build\.gradle\.kts)$/i.test(path) ||
      /(^|\/)[^/]+\.xcodeproj\/project\.pbxproj$/i.test(path)
    );
  }
}
```

## 5.3 Backend: detection controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-project-detection.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { DesktopProjectDetectionService } from '../services/desktop-project-detection.service';
import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Desktop Project Detection')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class DesktopProjectDetectionController {
  constructor(private readonly service: DesktopProjectDetectionService) {}

  @Post('detect')
  @ApiOperation({
    summary: 'Detect desktop project configuration from the linked repository',
  })
  detect(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.service.detect(workspaceId, desktopAppId);
  }
}
```

## 5.4 Frontend API

Append to:

```text
apps/web/src/features/desktop-apps/desktop-apps-api.ts
```

```ts
import type { DesktopApplicationDetails, DesktopProjectDetectionResponse, UpdateDesktopApplicationInput } from '@command-center/shared-types';

export function detectDesktopProject(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopProjectDetectionResponse>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/detect`, {
    method: 'POST',
  });
}

/**
 * Dedicated Phase 5 helper so this implementation does not depend on the
 * exact Phase 2 update-helper function name. It intentionally calls the
 * already-existing PATCH desktop-app endpoint rather than creating another
 * backend mutation.
 */
export function applyDetectedDesktopConfiguration(workspaceId: string, desktopAppId: string, input: UpdateDesktopApplicationInput) {
  return apiRequest<DesktopApplicationDetails>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
```

## 5.5 Frontend: detection panel

Create:

```text
apps/web/src/features/desktop-apps/desktop-project-detection-panel.tsx
```

```tsx
'use client';

import { applyDetectedDesktopConfiguration, detectDesktopProject } from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  DesktopApplicationDetails,
  DesktopArchitecture,
  DesktopFramework,
  DesktopPlatform,
  DesktopProjectDetectionCandidate,
} from '@command-center/shared-types';
import { Loader2, SearchCode } from 'lucide-react';
import { useState } from 'react';

interface Props {
  workspaceId: string;
  desktopApp: DesktopApplicationDetails;
  onApplied?: (desktopApp: DesktopApplicationDetails) => void;
}

export function DesktopProjectDetectionPanel({ workspaceId, desktopApp, onApplied }: Props) {
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<DesktopProjectDetectionCandidate | null>(null);

  async function detect(): Promise<void> {
    setRunning(true);
    setError(null);

    try {
      const result = await detectDesktopProject(workspaceId, desktopApp.id);
      setCandidate(result.primary);

      if (!result.primary) {
        setError('No supported desktop project was detected. You can keep the current manual configuration.');
      }
    } catch (caught: unknown) {
      setError(getErrorMessage(caught));
    } finally {
      setRunning(false);
    }
  }

  async function apply(): Promise<void> {
    if (!candidate) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await applyDetectedDesktopConfiguration(workspaceId, desktopApp.id, {
        platform: candidate.platform,
        framework: candidate.framework,
        architecture: candidate.architecture ?? desktopApp.architecture,
        packageName: candidate.packageName ?? desktopApp.packageName ?? undefined,
        currentVersion: candidate.version ?? desktopApp.currentVersion ?? undefined,
        currentBuildNumber: candidate.buildNumber ?? desktopApp.currentBuildNumber ?? undefined,
        minimumOsVersion: candidate.minimumOsVersion ?? desktopApp.minimumOsVersion ?? undefined,
      });

      onApplied?.(updated);
    } catch (caught: unknown) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  function updateCandidate<K extends keyof DesktopProjectDetectionCandidate>(key: K, value: DesktopProjectDetectionCandidate[K]): void {
    setCandidate((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-slate-950'>Project detection</h2>
          <p className='mt-1 max-w-2xl text-sm leading-6 text-slate-500'>
            Analyze the linked repository for Electron, Tauri, .NET, Qt, Java desktop, or native macOS project metadata.
          </p>
        </div>

        <button
          type='button'
          disabled={running || saving}
          onClick={() => void detect()}
          className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50'
        >
          {running ? <Loader2 className='size-4 animate-spin' aria-hidden='true' /> : <SearchCode className='size-4' aria-hidden='true' />}
          {running ? 'Analyzing...' : 'Analyze Repository'}
        </button>
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          {error}
        </div>
      ) : null}

      {candidate ? (
        <div className='mt-5 space-y-5 border-t border-slate-200 pt-5'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <label className='text-sm font-medium text-slate-700'>
              Platform
              <select
                aria-label='Detected platform'
                value={candidate.platform}
                onChange={(event) => updateCandidate('platform', event.target.value as DesktopPlatform)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3'
              >
                <option value='WINDOWS'>Windows</option>
                <option value='MACOS'>macOS</option>
                <option value='LINUX'>Linux</option>
                <option value='CROSS_PLATFORM'>Cross-platform</option>
              </select>
            </label>

            <label className='text-sm font-medium text-slate-700'>
              Framework
              <select
                aria-label='Detected framework'
                value={candidate.framework}
                onChange={(event) => updateCandidate('framework', event.target.value as DesktopFramework)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3'
              >
                <option value='ELECTRON'>Electron</option>
                <option value='TAURI'>Tauri</option>
                <option value='DOTNET'>.NET</option>
                <option value='QT'>Qt</option>
                <option value='JAVA'>Java</option>
                <option value='NATIVE_WINDOWS'>Native Windows</option>
                <option value='NATIVE_MACOS'>Native macOS</option>
                <option value='OTHER'>Other</option>
              </select>
            </label>

            <label className='text-sm font-medium text-slate-700'>
              Architecture
              <select
                aria-label='Detected architecture'
                value={candidate.architecture ?? desktopApp.architecture}
                onChange={(event) => updateCandidate('architecture', event.target.value as DesktopArchitecture)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3'
              >
                <option value='X64'>x64</option>
                <option value='ARM64'>ARM64</option>
                <option value='X86'>x86</option>
                <option value='UNIVERSAL'>Universal</option>
              </select>
            </label>

            <div className='text-sm'>
              <p className='font-medium text-slate-700'>Confidence</p>
              <p className='mt-1.5 flex h-10 items-center'>
                <span className='rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700'>
                  {candidate.confidence} · {candidate.score}%
                </span>
              </p>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='text-sm font-medium text-slate-700'>
              Package / app identifier
              <input
                aria-label='Detected package name'
                value={candidate.packageName ?? ''}
                onChange={(event) => updateCandidate('packageName', event.target.value || null)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3'
              />
            </label>

            <label className='text-sm font-medium text-slate-700'>
              Version
              <input
                aria-label='Detected version'
                value={candidate.version ?? ''}
                onChange={(event) => updateCandidate('version', event.target.value || null)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3'
              />
            </label>
          </div>

          <div>
            <p className='text-sm font-medium text-slate-700'>Evidence</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {candidate.evidence.map((item) => (
                <span key={item} className='rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600'>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <button
            type='button'
            disabled={saving}
            onClick={() => void apply()}
            className='inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50'
          >
            {saving ? 'Saving...' : 'Use Detected Configuration'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
```

## 5.6 Backend unit tests: controlled framework fixtures

Create:

```text
packages/test-code/api/unit/desktop-project-detector.spec.ts
```

```ts
import { DesktopProjectDetector, type DesktopRepositorySnapshot } from '../../../apps/api/src/modules/desktop-apps/services/desktop-project-detector';

function snapshot(paths: string[], files: Record<string, string>): DesktopRepositorySnapshot {
  return {
    repositoryId: '11111111-1111-4111-8111-111111111111',
    repositoryFullName: 'command-center/desktop-fixture',
    branch: 'main',
    truncated: false,
    paths,
    files,
  };
}

describe('DesktopProjectDetector', () => {
  const detector = new DesktopProjectDetector();

  it('detects Electron', () => {
    const result = detector.detect(
      snapshot(['package.json'], {
        'package.json': JSON.stringify({
          name: 'electron-demo',
          version: '1.4.0',
          main: 'dist/main.js',
          devDependencies: {
            electron: '^40.0.0',
            'electron-builder': '^26.0.0',
          },
          build: {
            win: {
              target: ['nsis'],
            },
            mac: {
              target: ['dmg'],
            },
          },
        }),
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'ELECTRON',
      platform: 'CROSS_PLATFORM',
      packageName: 'electron-demo',
      version: '1.4.0',
      confidence: 'HIGH',
    });
  });

  it('detects Tauri', () => {
    const result = detector.detect(
      snapshot(['package.json', 'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json'], {
        'src-tauri/Cargo.toml': `
[package]
name = "tauri-demo"
version = "2.3.0"

[dependencies]
tauri = "2"
`,
        'src-tauri/tauri.conf.json': JSON.stringify({
          productName: 'Tauri Demo',
          version: '2.3.0',
          bundle: {
            active: true,
            targets: 'all',
          },
        }),
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'TAURI',
      packageName: 'Tauri Demo',
      version: '2.3.0',
      confidence: 'HIGH',
    });
  });

  it('detects WPF .NET', () => {
    const result = detector.detect(
      snapshot(['src/Desktop/Desktop.csproj'], {
        'src/Desktop/Desktop.csproj': `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <Version>3.0.1</Version>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
  </PropertyGroup>
</Project>
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'DOTNET',
      platform: 'WINDOWS',
      architecture: 'X64',
      packageName: 'Desktop',
      version: '3.0.1',
    });
  });

  it('detects WinUI .NET', () => {
    const result = detector.detect(
      snapshot(['WindowsApp/WindowsApp.csproj'], {
        'WindowsApp/WindowsApp.csproj': `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0-windows10.0.22621.0</TargetFramework>
    <TargetPlatformMinVersion>10.0.19041.0</TargetPlatformMinVersion>
    <RuntimeIdentifiers>win-x64;win-arm64</RuntimeIdentifiers>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.WindowsAppSDK" Version="1.8.0" />
  </ItemGroup>
</Project>
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'DOTNET',
      platform: 'WINDOWS',
      architecture: 'UNIVERSAL',
      minimumOsVersion: '10.0.19041.0',
    });
  });

  it('detects Qt with CMake', () => {
    const result = detector.detect(
      snapshot(['desktop/CMakeLists.txt'], {
        'desktop/CMakeLists.txt': `
cmake_minimum_required(VERSION 3.24)
project(CommandCenterDesktop)
find_package(Qt6 REQUIRED COMPONENTS Widgets)
qt_add_executable(command-center main.cpp)
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'QT',
      packageName: 'command-center',
    });
  });

  it('detects JavaFX', () => {
    const result = detector.detect(
      snapshot(['desktop/pom.xml'], {
        'desktop/pom.xml': `
<project>
  <artifactId>desktop-javafx</artifactId>
  <version>5.0.0</version>
  <dependencies>
    <dependency>
      <groupId>org.openjfx</groupId>
      <artifactId>javafx-controls</artifactId>
    </dependency>
  </dependencies>
</project>
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'JAVA',
      platform: 'CROSS_PLATFORM',
      packageName: 'desktop-javafx',
      version: '5.0.0',
    });
  });

  it('detects native macOS', () => {
    const path = 'MacApp/MacApp.xcodeproj/project.pbxproj';

    const result = detector.detect(
      snapshot([path], {
        [path]: `
SDKROOT = macosx;
MACOSX_DEPLOYMENT_TARGET = 14.0;
PRODUCT_BUNDLE_IDENTIFIER = com.commandcenter.mac;
MARKETING_VERSION = 1.7.0;
CURRENT_PROJECT_VERSION = 170;
`,
      }),
    );

    expect(result.primary).toMatchObject({
      framework: 'NATIVE_MACOS',
      platform: 'MACOS',
      packageName: 'com.commandcenter.mac',
      version: '1.7.0',
      buildNumber: '170',
      minimumOsVersion: '14.0',
    });
  });

  it('does not classify an ordinary Node web repository as desktop', () => {
    const result = detector.detect(
      snapshot(['package.json'], {
        'package.json': JSON.stringify({
          name: 'website',
          dependencies: {
            next: '^16.0.0',
            react: '^19.0.0',
          },
        }),
      }),
    );

    expect(result.primary).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('returns all desktop projects in a monorepo ordered by confidence', () => {
    const result = detector.detect(
      snapshot(['apps/electron/package.json', 'apps/tauri/src-tauri/Cargo.toml', 'apps/tauri/src-tauri/tauri.conf.json'], {
        'apps/electron/package.json': JSON.stringify({
          name: 'electron-app',
          devDependencies: {
            electron: '^40.0.0',
          },
        }),
        'apps/tauri/src-tauri/Cargo.toml': `
[package]
name = "tauri-app"
version = "1.0.0"
`,
        'apps/tauri/src-tauri/tauri.conf.json': JSON.stringify({
          productName: 'Tauri App',
        }),
      }),
    );

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((candidate) => candidate.framework)).toEqual(expect.arrayContaining(['ELECTRON', 'TAURI']));
  });

  it('adds a warning when repository metadata is truncated', () => {
    const source = snapshot(['package.json'], {
      'package.json': JSON.stringify({
        name: 'electron-app',
        devDependencies: {
          electron: '^40.0.0',
        },
      }),
    });

    source.truncated = true;

    const result = detector.detect(source);

    expect(result.primary?.warnings.join(' ')).toContain('truncated');
  });
});
```

## 5.7 API E2E helper used by Phases 5–10

Create:

```text
packages/test-code/api/e2e/helpers/desktop-test-fixtures.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { RepositoryProvider } from 'src/generated/prisma/enums';
import { registerWorkspaceTestUser } from '../../helpers/workspace';

export const API = '/api/v1';

export type WorkspaceIdentity = Awaited<ReturnType<typeof registerWorkspaceTestUser>>;

let sequence = 0;

export async function createDesktopApp(owner: WorkspaceIdentity, overrides: Record<string, unknown> = {}) {
  sequence += 1;

  const response = await owner.agent
    .post(`${API}/workspaces/${owner.workspaceId}/desktop-apps`)
    .set('Authorization', `Bearer ${owner.accessToken}`)
    .send({
      name: `Desktop Fixture ${Date.now()}-${sequence}`,
      platform: 'CROSS_PLATFORM',
      framework: 'ELECTRON',
      architecture: 'X64',
      packageName: `com.commandcenter.desktop.${Date.now()}.${sequence}`,
      currentVersion: '1.0.0',
      currentBuildNumber: '100',
      ...overrides,
    });

  expect(response.status).toBe(201);

  return response.body as {
    id: string;
    applicationId: string;
    platform: string;
    framework: string;
    architecture: string;
    application: {
      id: string;
      workspaceId: string;
      name: string;
    };
  };
}

export async function createRepository(prisma: PrismaService, workspaceId: string, applicationId: string | null = null) {
  sequence += 1;

  const installation = await prisma.repositoryInstallation.create({
    data: {
      workspaceId,
      provider: RepositoryProvider.GITHUB,
      externalInstallationId: `desktop-installation-${Date.now()}-${sequence}`,
      accountLogin: 'command-center',
      accountType: 'Organization',
    },
  });

  const name = `desktop-repository-${Date.now()}-${sequence}`;

  return prisma.repositoryConnection.create({
    data: {
      workspaceId,
      installationId: installation.id,
      applicationId,
      provider: RepositoryProvider.GITHUB,
      externalRepoId: `desktop-repo-${Date.now()}-${sequence}`,
      owner: 'command-center',
      name,
      fullName: `command-center/${name}`,
      defaultBranch: 'main',
      isPrivate: false,
      htmlUrl: `https://github.com/command-center/${name}`,
      archived: false,
      isAvailable: true,
    },
    include: {
      installation: true,
    },
  });
}

export async function createLinkedDesktopFixture(app: INestApplication, prisma: PrismaService) {
  const owner = await registerWorkspaceTestUser(app, prisma);
  const desktopApp = await createDesktopApp(owner);
  const repository = await createRepository(prisma, owner.workspaceId, desktopApp.applicationId);

  return {
    owner,
    desktopApp,
    repository,
  };
}

export function buildPath(workspaceId: string, desktopAppId: string): string {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds`;
}

export function overviewPath(workspaceId: string, desktopAppId: string): string {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/overview`;
}

export function detectPath(workspaceId: string, desktopAppId: string): string {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/detect`;
}

export async function ingestSuccessfulBuild(owner: WorkspaceIdentity, desktopAppId: string, repositoryId: string, suffix = `${Date.now()}-${++sequence}`) {
  const response = await owner.agent
    .post(`${buildPath(owner.workspaceId, desktopAppId)}/ingest/github`)
    .set('Authorization', `Bearer ${owner.accessToken}`)
    .send({
      repositoryId,
      workflowRunId: `run-${suffix}`,
      commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
      branch: 'main',
      version: '1.0.0',
      buildNumber: '100',
      platform: 'WINDOWS',
      architecture: 'X64',
      status: 'SUCCESS',
      startedAt: '2026-08-23T01:00:00.000Z',
      completedAt: '2026-08-23T01:05:00.000Z',
      durationMs: 300000,
    });

  expect(response.status).toBe(201);
  expect(response.body.ignored).toBe(false);

  return response.body.build as {
    id: string;
    repositoryId: string;
    workflowRunId: string;
    status: string;
  };
}
```

## 5.8 Phase 5 API E2E

Create:

```text
packages/test-code/api/e2e/desktop-project-detection.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { GithubCodeService } from 'src/modules/repositories/services/github-code.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { createLinkedDesktopFixture, detectPath } from './helpers/desktop-test-fixtures';

describe('Desktop Project Detection E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let githubCode: GithubCodeService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    githubCode = app.get(GithubCodeService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await resetDatabase(prisma);
    await app.close();
  });

  it('detects Electron from the linked repository', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'tree-1',
      truncated: false,
      entries: [
        {
          path: 'package.json',
          type: 'file',
          sha: 'file-1',
          size: 200,
        },
      ],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockResolvedValue({
      path: 'package.json',
      sha: 'file-1',
      size: 200,
      content: JSON.stringify({
        name: 'desktop-electron',
        version: '2.0.0',
        devDependencies: {
          electron: '^40.0.0',
          'electron-builder': '^26.0.0',
        },
      }),
      encoding: 'base64',
    } as never);

    const response = await fixture.owner.agent
      .post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.primary).toMatchObject({
      framework: 'ELECTRON',
      packageName: 'desktop-electron',
      version: '2.0.0',
    });
  });

  it('returns safe empty detection for a non-desktop repository', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'tree-web',
      truncated: false,
      entries: [
        {
          path: 'package.json',
          type: 'file',
          sha: 'file-web',
          size: 100,
        },
      ],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockResolvedValue({
      path: 'package.json',
      sha: 'file-web',
      size: 100,
      content: JSON.stringify({
        name: 'website',
        dependencies: {
          next: '^16.0.0',
        },
      }),
      encoding: 'base64',
    } as never);

    const response = await fixture.owner.agent
      .post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.primary).toBeNull();
    expect(response.body.candidates).toEqual([]);
  });

  it('does not fail the detection pass when one metadata file disappears', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'tree-missing',
      truncated: false,
      entries: [
        {
          path: 'apps/a/package.json',
          type: 'file',
          sha: '1',
          size: 100,
        },
        {
          path: 'apps/b/package.json',
          type: 'file',
          sha: '2',
          size: 100,
        },
      ],
    } as never);

    jest
      .spyOn(githubCode, 'getFile')
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({
        path: 'apps/b/package.json',
        sha: '2',
        size: 100,
        content: JSON.stringify({
          name: 'working-electron',
          devDependencies: {
            electron: '^40.0.0',
          },
        }),
        encoding: 'base64',
      } as never);

    const response = await fixture.owner.agent
      .post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.primary.framework).toBe('ELECTRON');
  });

  it('requires authentication', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const response = await fixture.owner.agent.post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id));

    expect(response.status).toBe(401);
  });

  it('rejects cross-workspace desktop application access', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const attacker = await (await import('../helpers/workspace')).registerWorkspaceTestUser(app, prisma);

    const response = await attacker.agent
      .post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${attacker.accessToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

# PHASE 6 — DESKTOP APP OVERVIEW

The final Phase-10 version of the overview can safely include the latest build. Releases and runtime performance remain `null` until their later phases.

## 6.1 Backend overview service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-overview.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopRepositoryService } from './desktop-repository.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DesktopOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly desktopRepositories: DesktopRepositoryService,
  ) {}

  async get(workspaceId: string, desktopAppId: string) {
    const desktopApp = await this.desktopApps.findOne(workspaceId, desktopAppId);

    const repository = await this.desktopRepositories.getLinkedRepository(workspaceId, desktopAppId);

    const latestBuild = await this.prisma.desktopBuild.findFirst({
      where: {
        workspaceId,
        desktopAppId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      desktopApp,
      repository,
      latestBuild,
      latestRelease: null,
      latestPerformance: null,
    };
  }
}
```

> During Phase 6 **before** applying Phase 8 migration, temporarily return `latestBuild: null` instead of querying `prisma.desktopBuild`. After Phase 8 is installed, use the final service above.

## 6.2 Backend overview controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-overview.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { DesktopOverviewService } from '../services/desktop-overview.service';
import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Desktop Application Overview')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class DesktopOverviewController {
  constructor(private readonly service: DesktopOverviewService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get the desktop application overview',
  })
  get(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.service.get(workspaceId, desktopAppId);
  }
}
```

## 6.3 Frontend overview API

Append to `desktop-apps-api.ts`:

```ts
import type { DesktopAppOverview } from '@command-center/shared-types';

export function getDesktopAppOverview(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopAppOverview>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/overview`);
}
```

## 6.4 Frontend sub-navigation

Create:

```text
apps/web/src/features/desktop-apps/desktop-app-sub-nav.tsx
```

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

const LIVE_TABS = [
  {
    label: 'Overview',
    path: '',
  },
  {
    label: 'Code',
    path: '/code',
  },
  {
    label: 'Builds',
    path: '/builds',
  },
  {
    label: 'Tests',
    path: '/tests',
  },
] as const;

const FUTURE_TABS = ['Releases', 'Performance', 'Crashes', 'Dependencies', 'Security'] as const;

export function DesktopAppSubNav({ workspaceId, desktopAppId }: Props) {
  const pathname = usePathname();

  const base = `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;

  return (
    <nav aria-label='Desktop application navigation' className='flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1'>
      {LIVE_TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        const active = tab.path === '' ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white'
                : 'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
            }
          >
            {tab.label}
          </Link>
        );
      })}

      {FUTURE_TABS.map((tab) => (
        <span
          key={tab}
          aria-disabled='true'
          title='Available in a later desktop support phase'
          className='cursor-not-allowed whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-300'
        >
          {tab}
        </span>
      ))}
    </nav>
  );
}
```

## 6.5 Frontend overview component

Create:

```text
apps/web/src/features/desktop-apps/desktop-overview.tsx
```

```tsx
import type { DesktopAppOverview } from '@command-center/shared-types';
import { GitBranch, Package, MonitorCog, Workflow } from 'lucide-react';
import Link from 'next/link';

interface Props {
  workspaceId: string;
  desktopAppId: string;
  overview: DesktopAppOverview;
}

function value(value: string | null | undefined): string {
  return value?.trim() || 'Not set';
}

export function DesktopOverview({ workspaceId, desktopAppId, overview }: Props) {
  const { desktopApp, repository, latestBuild } = overview;

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex items-center gap-2'>
          <MonitorCog className='size-5 text-slate-500' aria-hidden='true' />
          <h2 className='font-semibold text-slate-950'>Desktop metadata</h2>
        </div>

        <dl className='mt-4 grid gap-4 sm:grid-cols-2'>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Platform</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{desktopApp.platform}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Framework</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{desktopApp.framework}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Architecture</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{desktopApp.architecture}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Package</dt>
            <dd className='mt-1 break-all text-sm font-medium text-slate-800'>{value(desktopApp.packageName)}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Version</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{value(desktopApp.currentVersion)}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Build</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{value(desktopApp.currentBuildNumber)}</dd>
          </div>
        </dl>
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex items-center gap-2'>
          <GitBranch className='size-5 text-slate-500' aria-hidden='true' />
          <h2 className='font-semibold text-slate-950'>Repository</h2>
        </div>

        {repository ? (
          <div className='mt-4'>
            <p className='font-semibold text-slate-900'>{repository.fullName}</p>
            <p className='mt-1 text-sm text-slate-500'>Default branch: {repository.defaultBranch}</p>
            <Link href={`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/code`} className='mt-4 inline-flex text-sm font-semibold text-brand-600'>
              Browse code
            </Link>
          </div>
        ) : (
          <p className='mt-4 text-sm text-slate-500'>No repository is connected.</p>
        )}
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2'>
        <div className='flex items-center gap-2'>
          <Workflow className='size-5 text-slate-500' aria-hidden='true' />
          <h2 className='font-semibold text-slate-950'>Latest build</h2>
        </div>

        {latestBuild ? (
          <div className='mt-4 flex flex-wrap items-center gap-3 text-sm'>
            <span className='rounded-full bg-slate-100 px-3 py-1 font-semibold'>{latestBuild.status}</span>
            <span>{latestBuild.platform}</span>
            <span>{latestBuild.architecture}</span>
            <span>{latestBuild.branch}</span>
            <Link href={`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${latestBuild.id}`} className='font-semibold text-brand-600'>
              Build details
            </Link>
          </div>
        ) : (
          <div className='mt-4 flex items-center gap-2 text-sm text-slate-500'>
            <Package className='size-4' aria-hidden='true' />
            No builds have been recorded yet.
          </div>
        )}
      </section>
    </div>
  );
}
```

## 6.6 Desktop app detail page integration

Do **not** delete the Phase-3 edit/archive form. Merge the Phase-5/6 blocks into the current detail page. The data-loading part should follow this structure:

```tsx
'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopOverview } from '@/features/desktop-apps/desktop-overview';
import { DesktopProjectDetectionPanel } from '@/features/desktop-apps/desktop-project-detection-panel';
import { getDesktopAppOverview } from '@/features/desktop-apps/desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopAppOverview } from '@command-center/shared-types';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DesktopAppPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  const [overview, setOverview] = useState<DesktopAppOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      setOverview(await getDesktopAppOverview(params.workspaceId, params.desktopAppId));
    } catch (caught: unknown) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    void getDesktopAppOverview(params.workspaceId, params.desktopAppId)
      .then((value) => {
        if (active) setOverview(value);
      })
      .catch((caught: unknown) => {
        if (active) setError(getErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.workspaceId, params.desktopAppId]);

  if (loading) {
    return <main className='p-8'>Loading desktop application...</main>;
  }

  if (error || !overview) {
    return (
      <main className='p-8'>
        <div role='alert'>{error ?? 'Desktop application was not found.'}</div>
      </main>
    );
  }

  return (
    <main className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <header>
        <p className='text-sm font-medium text-slate-500'>Desktop App</p>
        <h1 className='mt-1 text-2xl font-bold text-slate-950'>{overview.desktopApp.application.name}</h1>
      </header>

      <DesktopAppSubNav workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />

      <DesktopOverview workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} overview={overview} />

      <DesktopProjectDetectionPanel workspaceId={params.workspaceId} desktopApp={overview.desktopApp} onApplied={() => void load()} />

      {/*
        KEEP the existing Phase-3 settings/edit/archive section here.
        Do not remove working CRUD behavior when merging this code.
      */}
    </main>
  );
}
```

## 6.7 Phase 6 API E2E

Create:

```text
packages/test-code/api/e2e/desktop-overview.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { createLinkedDesktopFixture, overviewPath } from './helpers/desktop-test-fixtures';

describe('Desktop Overview E2E', () => {
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

  it('returns desktop metadata and linked repository', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const response = await fixture.owner.agent
      .get(overviewPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.desktopApp.id).toBe(fixture.desktopApp.id);

    expect(response.body.repository.id).toBe(fixture.repository.id);

    expect(response.body.repository.defaultBranch).toBe('main');
  });

  it('returns null optional overview sections safely', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const response = await fixture.owner.agent
      .get(overviewPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.latestRelease).toBeNull();
    expect(response.body.latestPerformance).toBeNull();
  });

  it('rejects cross-workspace overview access', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const outsider = await registerWorkspaceTestUser(app, prisma);

    const response = await outsider.agent
      .get(overviewPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${outsider.accessToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

# PHASE 7 — EXISTING CODE EXPLORER INTEGRATION

## 7.1 Backend

**No new source-code controller, service, DTO, or database model is required.**

Use the existing endpoints:

```text
GET /api/v1/workspaces/:workspaceId/repositories/:repositoryId/code/branches
GET /api/v1/workspaces/:workspaceId/repositories/:repositoryId/code/tree
GET /api/v1/workspaces/:workspaceId/repositories/:repositoryId/code/file
GET /api/v1/workspaces/:workspaceId/repositories/:repositoryId/code/search
GET /api/v1/workspaces/:workspaceId/repositories/:repositoryId/code/diff
```

Desktop only needs Phase-6 overview to tell the UI which `repositoryId` belongs to this desktop app.

## 7.2 Frontend Code route

Create:

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/code/page.tsx
```

```tsx
'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { getDesktopAppOverview } from '@/features/desktop-apps/desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { CodeExplorer } from '@/features/repositories/code-explorer';
import type { DesktopAppOverview } from '@command-center/shared-types';
import { Code2, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DesktopCodePage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  const [overview, setOverview] = useState<DesktopAppOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getDesktopAppOverview(params.workspaceId, params.desktopAppId)
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(getErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.workspaceId, params.desktopAppId]);

  if (loading) {
    return <main className='p-8'>Loading repository...</main>;
  }

  if (error || !overview) {
    return (
      <main className='p-8'>
        <div role='alert'>{error ?? 'Desktop application was not found.'}</div>
      </main>
    );
  }

  const repository = overview.repository;

  return (
    <main className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <header>
        <div className='flex items-center gap-2 text-sm text-slate-500'>
          <Code2 className='size-4' aria-hidden='true' />
          Desktop Code
        </div>

        <h1 className='mt-1 text-2xl font-bold text-slate-950'>{overview.desktopApp.application.name}</h1>
      </header>

      <DesktopAppSubNav workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />

      {!repository ? (
        <section className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center'>
          <GitBranch className='size-10 text-slate-300' aria-hidden='true' />

          <h2 className='mt-4 text-lg font-semibold text-slate-900'>Connect a repository first</h2>

          <p className='mt-2 max-w-lg text-sm text-slate-500'>
            The Desktop Code tab reuses the workspace Code Explorer. Connect a repository to this desktop application before browsing source.
          </p>

          <Link href={`/workspaces/${params.workspaceId}/desktop-apps/${params.desktopAppId}`} className='mt-4 font-semibold text-brand-600'>
            Back to desktop overview
          </Link>
        </section>
      ) : (
        <CodeExplorer workspaceId={params.workspaceId} repositoryId={repository.id} />
      )}
    </main>
  );
}
```

## 7.3 Phase 7 regression test requirement

Do not create another backend Code Explorer test suite. Run the existing repository Code Explorer API E2E suite after adding the desktop route, then add a small frontend route test confirming the desktop page hands the linked repository ID to the existing explorer.

The browser regression command is provided in the final verification section.

---

# PHASE 8 — DESKTOP BUILD TRACKING

Phase 8 records normalized CI build metadata. GitHub Actions is the first provider. The normalized ingest endpoint is also deterministic for E2E tests and can be called by the GitHub webhook adapter later.

## 8.1 Prisma: desktop build model

Create:

```text
apps/api/prisma/models/desktop-build.prisma
```

```prisma
enum DesktopBuildSource {
  GITHUB_ACTIONS
}

enum DesktopBuildStatus {
  QUEUED
  BUILDING
  SUCCESS
  FAILED
  CANCELLED
}

model DesktopBuild {
  id           String @id @default(uuid()) @db.Uuid
  workspaceId  String @map("workspace_id") @db.Uuid
  desktopAppId String @map("desktop_app_id") @db.Uuid
  repositoryId String @map("repository_id") @db.Uuid

  workflowRunId String             @map("workflow_run_id") @db.VarChar(128)
  source        DesktopBuildSource @default(GITHUB_ACTIONS)

  commitSha String @map("commit_sha") @db.VarChar(64)
  branch    String @db.VarChar(255)

  version     String? @db.VarChar(64)
  buildNumber String? @map("build_number") @db.VarChar(64)

  platform     DesktopPlatform
  architecture DesktopArchitecture
  status       DesktopBuildStatus @default(QUEUED)

  startedAt   DateTime? @map("started_at") @db.Timestamptz(6)
  completedAt DateTime? @map("completed_at") @db.Timestamptz(6)
  durationMs  Int?      @map("duration_ms")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  desktopApp DesktopApplication    @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)
  repository RepositoryConnection @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@unique([repositoryId, workflowRunId, platform, architecture])
  @@index([workspaceId, desktopAppId])
  @@index([desktopAppId, createdAt(sort: Desc)])
  @@index([repositoryId, createdAt(sort: Desc)])
  @@index([status])
  @@index([platform, architecture])
  @@map("desktop_builds")
}
```

Update the existing Phase-1 `DesktopApplication` model in:

```text
apps/api/prisma/models/desktop-application.prisma
```

Add exactly one relation field:

```prisma
builds DesktopBuild[]
```

Update the existing `RepositoryConnection` model in:

```text
apps/api/prisma/models/repositories.prisma
```

Add exactly one relation field:

```prisma
desktopBuilds DesktopBuild[]
```

Do not add Phase-9 artifacts or Phase-10 test relations yet. Apply Phase 8 migration first.

## 8.2 Build DTOs

Create:

```text
apps/api/src/modules/desktop-apps/dto/desktop-build.dto.ts
```

```ts
import { DesktopArchitecture, DesktopBuildStatus, DesktopPlatform } from 'src/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, MaxLength, Min } from 'class-validator';

export class DesktopBuildQueryDto {
  @ApiPropertyOptional({
    enum: DesktopBuildStatus,
  })
  @IsOptional()
  @IsEnum(DesktopBuildStatus)
  status?: DesktopBuildStatus;

  @ApiPropertyOptional({
    enum: DesktopPlatform,
  })
  @IsOptional()
  @IsEnum(DesktopPlatform)
  platform?: DesktopPlatform;

  @ApiPropertyOptional({
    enum: DesktopArchitecture,
  })
  @IsOptional()
  @IsEnum(DesktopArchitecture)
  architecture?: DesktopArchitecture;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string;
}

export class IngestGithubDesktopBuildDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  repositoryId!: string;

  @ApiProperty({
    example: '123456789',
  })
  @IsString()
  @Length(1, 128)
  workflowRunId!: string;

  @ApiProperty({
    example: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
  })
  @IsString()
  @Length(7, 64)
  commitSha!: string;

  @ApiProperty({
    example: 'main',
  })
  @IsString()
  @Length(1, 255)
  branch!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  buildNumber?: string | null;

  @ApiPropertyOptional({
    enum: DesktopPlatform,
  })
  @IsOptional()
  @IsEnum(DesktopPlatform)
  platform?: DesktopPlatform;

  @ApiPropertyOptional({
    enum: DesktopArchitecture,
  })
  @IsOptional()
  @IsEnum(DesktopArchitecture)
  architecture?: DesktopArchitecture;

  @ApiPropertyOptional({
    enum: DesktopBuildStatus,
  })
  @IsOptional()
  @IsEnum(DesktopBuildStatus)
  status?: DesktopBuildStatus;

  @ApiPropertyOptional({
    description: 'Raw GitHub Actions conclusion. Used only when status is not supplied.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  conclusion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number | null;
}
```

## 8.3 Build service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-builds.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import { DesktopArchitecture, DesktopBuildSource, DesktopBuildStatus, DesktopPlatform } from 'src/generated/prisma/enums';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { DesktopBuildQueryDto, IngestGithubDesktopBuildDto } from '../dto/desktop-build.dto';
import { DesktopAppsService } from './desktop-apps.service';

@Injectable()
export class DesktopBuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
  ) {}

  async list(workspaceId: string, desktopAppId: string, query: DesktopBuildQueryDto) {
    await this.requireApp(workspaceId, desktopAppId);

    return this.prisma.desktopBuild.findMany({
      where: {
        workspaceId,
        desktopAppId,
        ...(query.status
          ? {
              status: query.status,
            }
          : {}),
        ...(query.platform
          ? {
              platform: query.platform,
            }
          : {}),
        ...(query.architecture
          ? {
              architecture: query.architecture,
            }
          : {}),
        ...(query.branch
          ? {
              branch: query.branch,
            }
          : {}),
        ...(query.version
          ? {
              version: query.version,
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(workspaceId: string, desktopAppId: string, buildId: string) {
    await this.requireApp(workspaceId, desktopAppId);

    const build = await this.prisma.desktopBuild.findFirst({
      where: {
        id: buildId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!build) {
      throw new NotFoundException('Desktop build not found.');
    }

    return build;
  }

  async getLatest(workspaceId: string, desktopAppId: string) {
    await this.requireApp(workspaceId, desktopAppId);

    return this.prisma.desktopBuild.findFirst({
      where: {
        workspaceId,
        desktopAppId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async ingestGithubBuild(workspaceId: string, desktopAppId: string, dto: IngestGithubDesktopBuildDto) {
    const app = await this.requireApp(workspaceId, desktopAppId);

    if (app.application.archivedAt) {
      throw new BadRequestException('Archived desktop applications cannot receive build updates.');
    }

    const repository = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: dto.repositoryId,
        workspaceId,
        applicationId: app.applicationId,
        archived: false,
        isAvailable: true,
      },
      select: {
        id: true,
      },
    });

    if (!repository) {
      return {
        ignored: true,
        reason: 'Repository is not the active repository linked to this desktop application.',
        build: null,
      };
    }

    const platform = dto.platform ?? app.platform;
    const architecture = dto.architecture ?? app.architecture;

    const status = this.resolveStatus(dto.status, dto.conclusion);

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : null;

    const completedAt = dto.completedAt ? new Date(dto.completedAt) : null;

    const durationMs = dto.durationMs ?? (startedAt && completedAt ? Math.max(0, completedAt.getTime() - startedAt.getTime()) : null);

    const build = await this.prisma.desktopBuild.upsert({
      where: {
        repositoryId_workflowRunId_platform_architecture: {
          repositoryId: dto.repositoryId,
          workflowRunId: dto.workflowRunId.trim(),
          platform,
          architecture,
        },
      },
      create: {
        workspaceId,
        desktopAppId,
        repositoryId: dto.repositoryId,
        workflowRunId: dto.workflowRunId.trim(),
        source: DesktopBuildSource.GITHUB_ACTIONS,
        commitSha: dto.commitSha.trim(),
        branch: dto.branch.trim(),
        version: this.optional(dto.version),
        buildNumber: this.optional(dto.buildNumber),
        platform,
        architecture,
        status,
        startedAt,
        completedAt,
        durationMs,
      },
      update: {
        commitSha: dto.commitSha.trim(),
        branch: dto.branch.trim(),
        version: this.optional(dto.version),
        buildNumber: this.optional(dto.buildNumber),
        status,
        startedAt,
        completedAt,
        durationMs,
      },
    });

    return {
      ignored: false,
      reason: null,
      build,
    };
  }

  private async requireApp(workspaceId: string, desktopAppId: string) {
    return this.desktopApps.findOne(workspaceId, desktopAppId);
  }

  private optional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private resolveStatus(explicit: DesktopBuildStatus | undefined, conclusion: string | null | undefined): DesktopBuildStatus {
    if (explicit) {
      return explicit;
    }

    switch (conclusion?.trim().toLowerCase()) {
      case 'success':
        return DesktopBuildStatus.SUCCESS;

      case 'failure':
      case 'timed_out':
      case 'action_required':
      case 'startup_failure':
        return DesktopBuildStatus.FAILED;

      case 'cancelled':
      case 'skipped':
      case 'stale':
        return DesktopBuildStatus.CANCELLED;

      case 'in_progress':
        return DesktopBuildStatus.BUILDING;

      default:
        return DesktopBuildStatus.QUEUED;
    }
  }
}
```

## 8.4 Build controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-builds.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { DesktopBuildQueryDto, IngestGithubDesktopBuildDto } from '../dto/desktop-build.dto';
import { DesktopBuildsService } from '../services/desktop-builds.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Builds')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/builds')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopBuildsController {
  constructor(private readonly service: DesktopBuildsService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Query()
    query: DesktopBuildQueryDto,
  ) {
    return this.service.list(workspaceId, desktopAppId, query);
  }

  @Get(':buildId')
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,
  ) {
    return this.service.findOne(workspaceId, desktopAppId, buildId);
  }

  @Post('ingest/github')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Ingest a normalized GitHub Actions desktop build',
  })
  ingestGithub(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Body()
    dto: IngestGithubDesktopBuildDto,
  ) {
    return this.service.ingestGithubBuild(workspaceId, desktopAppId, dto);
  }
}
```

## 8.5 Frontend build API

Append to `desktop-apps-api.ts`:

```ts
import type { DesktopBuild, DesktopBuildFilters, DesktopBuildIngestionResult, IngestGithubDesktopBuildInput } from '@command-center/shared-types';

export function listDesktopBuilds(workspaceId: string, desktopAppId: string, filters: DesktopBuildFilters = {}) {
  const search = new URLSearchParams();

  if (filters.status) search.set('status', filters.status);
  if (filters.platform) search.set('platform', filters.platform);
  if (filters.architecture) {
    search.set('architecture', filters.architecture);
  }
  if (filters.branch) search.set('branch', filters.branch);
  if (filters.version) search.set('version', filters.version);

  const query = search.toString();

  return apiRequest<DesktopBuild[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds${query ? `?${query}` : ''}`);
}

export function getDesktopBuild(workspaceId: string, desktopAppId: string, buildId: string) {
  return apiRequest<DesktopBuild>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}`);
}

export function ingestGithubDesktopBuild(workspaceId: string, desktopAppId: string, input: IngestGithubDesktopBuildInput) {
  return apiRequest<DesktopBuildIngestionResult>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/ingest/github`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
```

## 8.6 Build utility

Create:

```text
apps/web/src/features/desktop-apps/desktop-build-utils.ts
```

```ts
import type { DesktopBuildArtifactType, DesktopBuildStatus, DesktopTestType } from '@command-center/shared-types';

export function shortSha(value: string): string {
  return value.slice(0, 8);
}

export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return '—';

  const seconds = Math.round(durationMs / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

export const DESKTOP_BUILD_STATUS_LABELS: Record<DesktopBuildStatus, string> = {
  QUEUED: 'Queued',
  BUILDING: 'Building',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const DESKTOP_ARTIFACT_TYPE_LABELS: Record<DesktopBuildArtifactType, string> = {
  EXE: 'EXE',
  MSI: 'MSI',
  MSIX: 'MSIX',
  DMG: 'DMG',
  PKG: 'PKG',
  APP: 'APP',
  APPIMAGE: 'AppImage',
  DEB: 'DEB',
  RPM: 'RPM',
  ZIP: 'ZIP',
  OTHER: 'Other',
};

export const DESKTOP_TEST_TYPE_LABELS: Record<DesktopTestType, string> = {
  UNIT: 'Unit',
  INTEGRATION: 'Integration',
  UI: 'UI',
  E2E: 'E2E',
  INSTALLER: 'Installer',
  OTHER: 'Other',
};
```

## 8.7 Builds component

Create:

```text
apps/web/src/features/desktop-apps/desktop-builds.tsx
```

```tsx
'use client';

import { listDesktopBuilds } from './desktop-apps-api';
import { DESKTOP_BUILD_STATUS_LABELS, formatDuration, shortSha } from './desktop-build-utils';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopArchitecture, DesktopBuild, DesktopBuildStatus, DesktopPlatform } from '@command-center/shared-types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function BuildStatus({ status }: { status: DesktopBuildStatus }) {
  return <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700'>{DESKTOP_BUILD_STATUS_LABELS[status]}</span>;
}

export function DesktopBuilds({ workspaceId, desktopAppId }: Props) {
  const [builds, setBuilds] = useState<DesktopBuild[]>([]);
  const [status, setStatus] = useState<DesktopBuildStatus | ''>('');
  const [platform, setPlatform] = useState<DesktopPlatform | ''>('');
  const [architecture, setArchitecture] = useState<DesktopArchitecture | ''>('');
  const [branch, setBranch] = useState('');
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setBuilds(
        await listDesktopBuilds(workspaceId, desktopAppId, {
          status: status || undefined,
          platform: platform || undefined,
          architecture: architecture || undefined,
          branch: branch.trim() || undefined,
          version: version.trim() || undefined,
        }),
      );
    } catch (caught: unknown) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [architecture, branch, desktopAppId, platform, status, version, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className='space-y-4'>
      <div className='grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5'>
        <label className='text-xs font-semibold text-slate-500'>
          Status
          <select
            aria-label='Build status filter'
            value={status}
            onChange={(event) => setStatus(event.target.value as DesktopBuildStatus | '')}
            className='mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm'
          >
            <option value=''>All</option>
            {Object.keys(DESKTOP_BUILD_STATUS_LABELS).map((value) => (
              <option key={value} value={value}>
                {DESKTOP_BUILD_STATUS_LABELS[value as DesktopBuildStatus]}
              </option>
            ))}
          </select>
        </label>

        <label className='text-xs font-semibold text-slate-500'>
          Platform
          <select
            aria-label='Build platform filter'
            value={platform}
            onChange={(event) => setPlatform(event.target.value as DesktopPlatform | '')}
            className='mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm'
          >
            <option value=''>All</option>
            <option value='WINDOWS'>Windows</option>
            <option value='MACOS'>macOS</option>
            <option value='LINUX'>Linux</option>
            <option value='CROSS_PLATFORM'>Cross-platform</option>
          </select>
        </label>

        <label className='text-xs font-semibold text-slate-500'>
          Architecture
          <select
            aria-label='Build architecture filter'
            value={architecture}
            onChange={(event) => setArchitecture(event.target.value as DesktopArchitecture | '')}
            className='mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm'
          >
            <option value=''>All</option>
            <option value='X64'>x64</option>
            <option value='ARM64'>ARM64</option>
            <option value='X86'>x86</option>
            <option value='UNIVERSAL'>Universal</option>
          </select>
        </label>

        <label className='text-xs font-semibold text-slate-500'>
          Branch
          <input
            aria-label='Build branch filter'
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            className='mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm'
          />
        </label>

        <label className='text-xs font-semibold text-slate-500'>
          Version
          <input
            aria-label='Build version filter'
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            className='mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm'
          />
        </label>
      </div>

      {error ? (
        <div role='alert' className='rounded-xl bg-red-50 p-4 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className='rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500'>Loading builds...</div>
      ) : builds.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>
          No desktop builds match the current filters.
        </div>
      ) : (
        <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white'>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Status</th>
                  <th className='px-4 py-3'>Platform</th>
                  <th className='px-4 py-3'>Architecture</th>
                  <th className='px-4 py-3'>Branch</th>
                  <th className='px-4 py-3'>Commit</th>
                  <th className='px-4 py-3'>Version</th>
                  <th className='px-4 py-3'>Duration</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {builds.map((build) => (
                  <tr key={build.id}>
                    <td className='px-4 py-3'>
                      <BuildStatus status={build.status} />
                    </td>
                    <td className='px-4 py-3'>{build.platform}</td>
                    <td className='px-4 py-3'>{build.architecture}</td>
                    <td className='px-4 py-3'>{build.branch}</td>
                    <td className='px-4 py-3 font-mono'>{shortSha(build.commitSha)}</td>
                    <td className='px-4 py-3'>
                      <Link href={`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${build.id}`} className='font-semibold text-brand-600'>
                        {build.version ?? 'Build details'}
                      </Link>
                    </td>
                    <td className='px-4 py-3'>{formatDuration(build.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
```

## 8.8 Builds route

Create:

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/builds/page.tsx
```

```tsx
'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopBuilds } from '@/features/desktop-apps/desktop-builds';
import { useParams } from 'next/navigation';

export default function DesktopBuildsPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  return (
    <main className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <header>
        <p className='text-sm font-medium text-slate-500'>Desktop App</p>
        <h1 className='mt-1 text-2xl font-bold text-slate-950'>Builds</h1>
      </header>

      <DesktopAppSubNav workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />

      <DesktopBuilds workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />
    </main>
  );
}
```

## 8.9 Phase 8 API E2E

Create:

```text
packages/test-code/api/e2e/desktop-builds.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { buildPath, createLinkedDesktopFixture, createRepository } from './helpers/desktop-test-fixtures';

describe('Desktop Builds E2E', () => {
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

  function payload(repositoryId: string, overrides: Record<string, unknown> = {}) {
    return {
      repositoryId,
      workflowRunId: '901',
      commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
      branch: 'main',
      version: '2.0.0',
      buildNumber: '200',
      platform: 'WINDOWS',
      architecture: 'X64',
      status: 'QUEUED',
      startedAt: '2026-08-23T01:00:00.000Z',
      ...overrides,
    };
  }

  it('tracks queued -> building -> success idempotently', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const path = `${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`;

    const queued = await fixture.owner.agent.post(path).set('Authorization', `Bearer ${fixture.owner.accessToken}`).send(payload(fixture.repository.id));

    expect(queued.status).toBe(201);
    expect(queued.body.build.status).toBe('QUEUED');

    const building = await fixture.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          status: 'BUILDING',
        }),
      );

    expect(building.status).toBe(201);
    expect(building.body.build.id).toBe(queued.body.build.id);
    expect(building.body.build.status).toBe('BUILDING');

    const success = await fixture.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          status: 'SUCCESS',
          completedAt: '2026-08-23T01:05:00.000Z',
        }),
      );

    expect(success.body.build.id).toBe(queued.body.build.id);
    expect(success.body.build.status).toBe('SUCCESS');
    expect(success.body.build.durationMs).toBe(300000);

    expect(
      await prisma.desktopBuild.count({
        where: {
          repositoryId: fixture.repository.id,
          workflowRunId: '901',
        },
      }),
    ).toBe(1);
  });

  it('tracks failed build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const response = await fixture.owner.agent
      .post(`${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'failed-1',
          conclusion: 'failure',
          status: undefined,
          completedAt: '2026-08-23T01:02:00.000Z',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.build.status).toBe('FAILED');
  });

  it('keeps matrix builds separate by platform and architecture', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const path = `${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`;

    await fixture.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'matrix-1',
          platform: 'WINDOWS',
          architecture: 'X64',
        }),
      )
      .expect(201);

    await fixture.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'matrix-1',
          platform: 'MACOS',
          architecture: 'ARM64',
        }),
      )
      .expect(201);

    expect(
      await prisma.desktopBuild.count({
        where: {
          workflowRunId: 'matrix-1',
        },
      }),
    ).toBe(2);
  });

  it('ignores an unrelated repository', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const unrelated = await createRepository(prisma, fixture.owner.workspaceId, null);

    const response = await fixture.owner.agent
      .post(`${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(payload(unrelated.id));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      ignored: true,
      reason: expect.any(String),
      build: null,
    });
  });

  it('filters builds by platform, architecture and status', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const ingest = `${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`;

    await fixture.owner.agent
      .post(ingest)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'filter-1',
          platform: 'WINDOWS',
          architecture: 'X64',
          status: 'SUCCESS',
        }),
      )
      .expect(201);

    await fixture.owner.agent
      .post(ingest)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'filter-2',
          platform: 'MACOS',
          architecture: 'ARM64',
          status: 'FAILED',
        }),
      )
      .expect(201);

    const response = await fixture.owner.agent
      .get(buildPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .query({
        platform: 'MACOS',
        architecture: 'ARM64',
        status: 'FAILED',
      })
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      workflowRunId: 'filter-2',
      platform: 'MACOS',
      architecture: 'ARM64',
      status: 'FAILED',
    });
  });

  it('rejects cross-workspace build reads', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const outsider = await registerWorkspaceTestUser(app, prisma);

    const response = await outsider.agent
      .get(buildPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${outsider.accessToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

# PHASE 9 — DESKTOP BUILD ARTIFACT TRACKING

Artifact records store metadata/provider references only. Installer binaries remain in GitHub Actions or another artifact provider.

## 9.1 Prisma artifact model

Create:

```text
apps/api/prisma/models/desktop-build-artifact.prisma
```

```prisma
enum DesktopBuildArtifactType {
  EXE
  MSI
  MSIX
  DMG
  PKG
  APP
  APPIMAGE
  DEB
  RPM
  ZIP
  OTHER
}

model DesktopBuildArtifact {
  id       String @id @default(uuid()) @db.Uuid
  buildId  String @map("build_id") @db.Uuid

  providerArtifactId String @map("provider_artifact_id") @db.VarChar(255)

  platform     DesktopPlatform
  architecture DesktopArchitecture
  type         DesktopBuildArtifactType

  fileName    String  @map("file_name") @db.VarChar(1024)
  sizeBytes   BigInt? @map("size_bytes")
  checksum    String? @db.VarChar(255)
  externalUrl String? @map("external_url") @db.Text

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  build DesktopBuild @relation(fields: [buildId], references: [id], onDelete: Cascade)

  @@unique([buildId, providerArtifactId])
  @@index([buildId])
  @@index([platform, architecture])
  @@index([type])
  @@map("desktop_build_artifacts")
}
```

Update `DesktopBuild` in `desktop-build.prisma`:

```prisma
artifacts DesktopBuildArtifact[]
```

Then create/apply the Phase-9 migration.

## 9.2 Artifact DTO

Create:

```text
apps/api/src/modules/desktop-apps/dto/desktop-build-artifact.dto.ts
```

```ts
import { DesktopArchitecture, DesktopBuildArtifactType, DesktopPlatform } from 'src/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Length, MaxLength, Min } from 'class-validator';

export class IngestDesktopBuildArtifactDto {
  @ApiProperty({
    example: 'github-artifact-812933',
  })
  @IsString()
  @Length(1, 255)
  providerArtifactId!: string;

  @ApiProperty({
    enum: DesktopPlatform,
  })
  @IsEnum(DesktopPlatform)
  platform!: DesktopPlatform;

  @ApiProperty({
    enum: DesktopArchitecture,
  })
  @IsEnum(DesktopArchitecture)
  architecture!: DesktopArchitecture;

  @ApiProperty({
    enum: DesktopBuildArtifactType,
  })
  @IsEnum(DesktopBuildArtifactType)
  type!: DesktopBuildArtifactType;

  @ApiProperty({
    example: 'CommandCenter-2.0.0-x64.msi',
  })
  @IsString()
  @Length(1, 1024)
  fileName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  checksum?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({
    require_protocol: true,
    protocols: ['https'],
  })
  externalUrl?: string | null;
}
```

## 9.3 Artifact service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-build-artifacts.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import { DesktopBuildsService } from './desktop-builds.service';
import { IngestDesktopBuildArtifactDto } from '../dto/desktop-build-artifact.dto';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class DesktopBuildArtifactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly builds: DesktopBuildsService,
  ) {}

  async list(workspaceId: string, desktopAppId: string, buildId: string) {
    await this.builds.findOne(workspaceId, desktopAppId, buildId);

    const rows = await this.prisma.desktopBuildArtifact.findMany({
      where: {
        buildId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return rows.map((row) => this.serialize(row));
  }

  async ingest(workspaceId: string, desktopAppId: string, buildId: string, dto: IngestDesktopBuildArtifactDto) {
    const build = await this.builds.findOne(workspaceId, desktopAppId, buildId);

    if (dto.platform !== build.platform || dto.architecture !== build.architecture) {
      throw new BadRequestException('Artifact platform and architecture must match the build matrix entry.');
    }

    const artifact = await this.prisma.desktopBuildArtifact.upsert({
      where: {
        buildId_providerArtifactId: {
          buildId,
          providerArtifactId: dto.providerArtifactId.trim(),
        },
      },
      create: {
        buildId,
        providerArtifactId: dto.providerArtifactId.trim(),
        platform: dto.platform,
        architecture: dto.architecture,
        type: dto.type,
        fileName: dto.fileName.trim(),
        sizeBytes: dto.sizeBytes === undefined || dto.sizeBytes === null ? null : BigInt(dto.sizeBytes),
        checksum: dto.checksum?.trim() || null,
        externalUrl: dto.externalUrl?.trim() || null,
      },
      update: {
        type: dto.type,
        fileName: dto.fileName.trim(),
        sizeBytes: dto.sizeBytes === undefined || dto.sizeBytes === null ? null : BigInt(dto.sizeBytes),
        checksum: dto.checksum?.trim() || null,
        externalUrl: dto.externalUrl?.trim() || null,
      },
    });

    return this.serialize(artifact);
  }

  private serialize<
    T extends {
      sizeBytes: bigint | null;
    },
  >(row: T) {
    return {
      ...row,
      sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
    };
  }
}
```

## 9.4 Artifact controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-build-artifacts.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { IngestDesktopBuildArtifactDto } from '../dto/desktop-build-artifact.dto';
import { DesktopBuildArtifactsService } from '../services/desktop-build-artifacts.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Build Artifacts')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/builds/:buildId/artifacts')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopBuildArtifactsController {
  constructor(private readonly service: DesktopBuildArtifactsService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,
  ) {
    return this.service.list(workspaceId, desktopAppId, buildId);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  ingest(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,

    @Body()
    dto: IngestDesktopBuildArtifactDto,
  ) {
    return this.service.ingest(workspaceId, desktopAppId, buildId, dto);
  }
}
```

## 9.5 Frontend artifact API

Append to `desktop-apps-api.ts`:

```ts
import type { DesktopBuildArtifact, IngestDesktopBuildArtifactInput } from '@command-center/shared-types';

export function listDesktopBuildArtifacts(workspaceId: string, desktopAppId: string, buildId: string) {
  return apiRequest<DesktopBuildArtifact[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`);
}

export function ingestDesktopBuildArtifact(workspaceId: string, desktopAppId: string, buildId: string, input: IngestDesktopBuildArtifactInput) {
  return apiRequest<DesktopBuildArtifact>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
```

## 9.6 Phase 9 API E2E

Create:

```text
packages/test-code/api/e2e/desktop-build-artifacts.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { createLinkedDesktopFixture, ingestSuccessfulBuild } from './helpers/desktop-test-fixtures';

describe('Desktop Build Artifacts E2E', () => {
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

  function path(workspaceId: string, desktopAppId: string, buildId: string) {
    return `/api/v1/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`;
  }

  it('stores multiple artifact types for a build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const endpoint = path(fixture.owner.workspaceId, fixture.desktopApp.id, build.id);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'msi-1',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'CommandCenter-1.0.0-x64.msi',
        sizeBytes: 1000000,
        checksum: 'sha256:abc',
        externalUrl: 'https://github.com/example/actions/artifacts/1',
      })
      .expect(201);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'zip-1',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'ZIP',
        fileName: 'CommandCenter-portable.zip',
        sizeBytes: 2000000,
      })
      .expect(201);

    const response = await fixture.owner.agent.get(endpoint).set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((artifact: { type: string }) => artifact.type)).toEqual(expect.arrayContaining(['MSI', 'ZIP']));
  });

  it('is idempotent for duplicate provider artifact ID', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const endpoint = path(fixture.owner.workspaceId, fixture.desktopApp.id, build.id);

    const payload = {
      providerArtifactId: 'duplicate-1',
      platform: 'WINDOWS',
      architecture: 'X64',
      type: 'EXE',
      fileName: 'old.exe',
    };

    await fixture.owner.agent.post(endpoint).set('Authorization', `Bearer ${fixture.owner.accessToken}`).send(payload).expect(201);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        ...payload,
        fileName: 'new.exe',
      })
      .expect(201);

    expect(
      await prisma.desktopBuildArtifact.count({
        where: {
          buildId: build.id,
          providerArtifactId: 'duplicate-1',
        },
      }),
    ).toBe(1);

    expect(
      (
        await prisma.desktopBuildArtifact.findFirstOrThrow({
          where: {
            buildId: build.id,
            providerArtifactId: 'duplicate-1',
          },
        })
      ).fileName,
    ).toBe('new.exe');
  });

  it('rejects artifact matrix metadata that does not match the build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const response = await fixture.owner.agent
      .post(path(fixture.owner.workspaceId, fixture.desktopApp.id, build.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'bad-matrix',
        platform: 'MACOS',
        architecture: 'ARM64',
        type: 'DMG',
        fileName: 'wrong.dmg',
      });

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const { randomUUID } = await import('node:crypto');

    const response = await fixture.owner.agent
      .post(path(fixture.owner.workspaceId, fixture.desktopApp.id, randomUUID()))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'missing',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'missing.msi',
      });

    expect(response.status).toBe(404);
  });

  it('allows artifact metadata without a remote URL', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const response = await fixture.owner.agent
      .post(path(fixture.owner.workspaceId, fixture.desktopApp.id, build.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'expired-provider-artifact',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'metadata-only.msi',
        externalUrl: null,
      });

    expect(response.status).toBe(201);
    expect(response.body.externalUrl).toBeNull();
  });
});
```

---

# PHASE 10 — DESKTOP TEST TRACKING

## 10.1 Prisma tests

Create:

```text
apps/api/prisma/models/desktop-test.prisma
```

```prisma
enum DesktopTestType {
  UNIT
  INTEGRATION
  UI
  E2E
  INSTALLER
  OTHER
}

enum DesktopTestStatus {
  PENDING
  RUNNING
  PASSED
  FAILED
  SKIPPED
  CANCELLED
}

model DesktopTestRun {
  id      String            @id @default(uuid()) @db.Uuid
  buildId String            @map("build_id") @db.Uuid
  type    DesktopTestType
  status  DesktopTestStatus @default(PENDING)

  passed  Int @default(0)
  failed  Int @default(0)
  skipped Int @default(0)
  total   Int @default(0)

  durationMs  Int?      @map("duration_ms")
  startedAt   DateTime? @map("started_at") @db.Timestamptz(6)
  completedAt DateTime? @map("completed_at") @db.Timestamptz(6)

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  build    DesktopBuild         @relation(fields: [buildId], references: [id], onDelete: Cascade)
  failures DesktopTestFailure[]

  @@unique([buildId, type])
  @@index([buildId])
  @@index([status])
  @@map("desktop_test_runs")
}

model DesktopTestFailure {
  id        String @id @default(uuid()) @db.Uuid
  testRunId String @map("test_run_id") @db.Uuid

  suite      String? @db.VarChar(500)
  testName   String? @map("test_name") @db.VarChar(500)
  message    String? @db.Text
  file       String? @db.VarChar(2048)
  line       Int?
  stackTrace String? @map("stack_trace") @db.Text

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  testRun DesktopTestRun @relation(fields: [testRunId], references: [id], onDelete: Cascade)

  @@index([testRunId])
  @@map("desktop_test_failures")
}
```

Update `DesktopBuild` in `desktop-build.prisma`:

```prisma
testRuns DesktopTestRun[]
```

After Phase 9 and 10 the final relation section of `DesktopBuild` should be:

```prisma
desktopApp DesktopApplication     @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)
repository RepositoryConnection  @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
artifacts  DesktopBuildArtifact[]
testRuns   DesktopTestRun[]
```

## 10.2 Test DTO

Create:

```text
apps/api/src/modules/desktop-apps/dto/desktop-test.dto.ts
```

```ts
import { DesktopTestStatus, DesktopTestType } from 'src/generated/prisma/enums';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class DesktopTestFailureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  suite?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  testName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  message?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  file?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  line?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  stackTrace?: string | null;
}

export class IngestDesktopTestRunDto {
  @ApiProperty({
    enum: DesktopTestType,
  })
  @IsEnum(DesktopTestType)
  type!: DesktopTestType;

  @ApiProperty({
    enum: DesktopTestStatus,
  })
  @IsEnum(DesktopTestStatus)
  status!: DesktopTestStatus;

  @ApiProperty()
  @IsInt()
  @Min(0)
  passed!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  failed!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  skipped!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string | null;

  @ApiPropertyOptional({
    type: [DesktopTestFailureDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => DesktopTestFailureDto)
  failures?: DesktopTestFailureDto[];
}
```

## 10.3 Test service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-tests.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import { DesktopBuildsService } from './desktop-builds.service';
import { IngestDesktopTestRunDto } from '../dto/desktop-test.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DesktopTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly builds: DesktopBuildsService,
  ) {}

  async listForBuild(workspaceId: string, desktopAppId: string, buildId: string) {
    await this.builds.findOne(workspaceId, desktopAppId, buildId);

    return this.prisma.desktopTestRun.findMany({
      where: {
        buildId,
      },
      include: {
        failures: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async listForApp(workspaceId: string, desktopAppId: string) {
    await this.builds.getLatest(workspaceId, desktopAppId);

    return this.prisma.desktopTestRun.findMany({
      where: {
        build: {
          workspaceId,
          desktopAppId,
        },
      },
      include: {
        build: {
          select: {
            id: true,
            version: true,
            buildNumber: true,
            platform: true,
            architecture: true,
            branch: true,
            commitSha: true,
            createdAt: true,
          },
        },
        failures: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async ingest(workspaceId: string, desktopAppId: string, buildId: string, dto: IngestDesktopTestRunDto) {
    await this.builds.findOne(workspaceId, desktopAppId, buildId);

    const passed = dto.passed;
    const failed = dto.failed;
    const skipped = dto.skipped;
    const total = passed + failed + skipped;

    return this.prisma.$transaction(async (transaction) => {
      const testRun = await transaction.desktopTestRun.upsert({
        where: {
          buildId_type: {
            buildId,
            type: dto.type,
          },
        },
        create: {
          buildId,
          type: dto.type,
          status: dto.status,
          passed,
          failed,
          skipped,
          total,
          durationMs: dto.durationMs ?? null,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        },
        update: {
          status: dto.status,
          passed,
          failed,
          skipped,
          total,
          durationMs: dto.durationMs ?? null,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        },
      });

      await transaction.desktopTestFailure.deleteMany({
        where: {
          testRunId: testRun.id,
        },
      });

      if (dto.failures?.length) {
        await transaction.desktopTestFailure.createMany({
          data: dto.failures.map((failure) => ({
            testRunId: testRun.id,
            suite: failure.suite?.trim() || null,
            testName: failure.testName?.trim() || null,
            message: failure.message?.trim() || null,
            file: failure.file?.trim() || null,
            line: failure.line ?? null,
            stackTrace: failure.stackTrace?.trim() || null,
          })),
        });
      }

      return transaction.desktopTestRun.findUniqueOrThrow({
        where: {
          id: testRun.id,
        },
        include: {
          failures: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    });
  }

  async summary(workspaceId: string, desktopAppId: string) {
    await this.builds.getLatest(workspaceId, desktopAppId);

    const runs = await this.prisma.desktopTestRun.findMany({
      where: {
        build: {
          workspaceId,
          desktopAppId,
        },
      },
      select: {
        status: true,
        passed: true,
        failed: true,
        skipped: true,
      },
    });

    return {
      totalRuns: runs.length,
      passedRuns: runs.filter((run) => run.status === 'PASSED').length,
      failedRuns: runs.filter((run) => run.status === 'FAILED').length,
      passedTests: runs.reduce((total, run) => total + run.passed, 0),
      failedTests: runs.reduce((total, run) => total + run.failed, 0),
      skippedTests: runs.reduce((total, run) => total + run.skipped, 0),
    };
  }
}
```

### Important fix to the `listForApp`/`summary` app guard

`getLatest()` legitimately returns `null` when a desktop app has no builds. It still validates the app first, so it is safe. Do not treat `null` latest build as an error.

## 10.4 Test controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-tests.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { IngestDesktopTestRunDto } from '../dto/desktop-test.dto';
import { DesktopTestsService } from '../services/desktop-tests.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Tests')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopTestsController {
  constructor(private readonly service: DesktopTestsService) {}

  @Get('tests')
  listForApp(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.service.listForApp(workspaceId, desktopAppId);
  }

  @Get('tests/summary')
  summary(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.service.summary(workspaceId, desktopAppId);
  }

  @Get('builds/:buildId/tests')
  listForBuild(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,
  ) {
    return this.service.listForBuild(workspaceId, desktopAppId, buildId);
  }

  @Post('builds/:buildId/tests')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  ingest(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,

    @Body()
    dto: IngestDesktopTestRunDto,
  ) {
    return this.service.ingest(workspaceId, desktopAppId, buildId, dto);
  }
}
```

## 10.5 Final build detail service

Now that Phases 9 and 10 exist, update `DesktopBuildsService.findOne()` to return the final build detail:

```ts
async findOne(
  workspaceId: string,
  desktopAppId: string,
  buildId: string,
) {
  await this.requireApp(workspaceId, desktopAppId);

  const build = await this.prisma.desktopBuild.findFirst({
    where: {
      id: buildId,
      workspaceId,
      desktopAppId,
    },
    include: {
      artifacts: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      testRuns: {
        include: {
          failures: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!build) {
    throw new NotFoundException('Desktop build not found.');
  }

  const artifacts = build.artifacts.map((artifact) => ({
    ...artifact,
    sizeBytes:
      artifact.sizeBytes === null
        ? null
        : Number(artifact.sizeBytes),
  }));

  const testSummary = {
    totalRuns: build.testRuns.length,
    passedRuns: build.testRuns.filter(
      (run) => run.status === 'PASSED',
    ).length,
    failedRuns: build.testRuns.filter(
      (run) => run.status === 'FAILED',
    ).length,
    passedTests: build.testRuns.reduce(
      (total, run) => total + run.passed,
      0,
    ),
    failedTests: build.testRuns.reduce(
      (total, run) => total + run.failed,
      0,
    ),
    skippedTests: build.testRuns.reduce(
      (total, run) => total + run.skipped,
      0,
    ),
  };

  return {
    ...build,
    artifacts,
    testSummary,
  };
}
```

Update the frontend `getDesktopBuild()` return type to the final type:

```ts
import type { DesktopBuildDetails } from '@command-center/shared-types';

export function getDesktopBuild(workspaceId: string, desktopAppId: string, buildId: string) {
  return apiRequest<DesktopBuildDetails>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}`);
}
```

## 10.6 Frontend test APIs

Append to `desktop-apps-api.ts`:

```ts
import type { DesktopTestRun, DesktopTestSummary, IngestDesktopTestRunInput } from '@command-center/shared-types';

export function listDesktopBuildTests(workspaceId: string, desktopAppId: string, buildId: string) {
  return apiRequest<DesktopTestRun[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`);
}

export function listDesktopAppTests(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopTestRun[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests`);
}

export function getDesktopTestSummary(workspaceId: string, desktopAppId: string) {
  return apiRequest<DesktopTestSummary>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests/summary`);
}

export function ingestDesktopTestRun(workspaceId: string, desktopAppId: string, buildId: string, input: IngestDesktopTestRunInput) {
  return apiRequest<DesktopTestRun>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
```

## 10.7 Tests UI

Create:

```text
apps/web/src/features/desktop-apps/desktop-tests.tsx
```

```tsx
'use client';

import { getDesktopTestSummary, listDesktopAppTests } from './desktop-apps-api';
import { DESKTOP_TEST_TYPE_LABELS, formatDuration } from './desktop-build-utils';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopTestRun, DesktopTestSummary } from '@command-center/shared-types';
import { useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function DesktopTests({ workspaceId, desktopAppId }: Props) {
  const [runs, setRuns] = useState<DesktopTestRun[]>([]);

  const [summary, setSummary] = useState<DesktopTestSummary | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([listDesktopAppTests(workspaceId, desktopAppId), getDesktopTestSummary(workspaceId, desktopAppId)])
      .then(([runResult, summaryResult]) => {
        if (!active) return;

        setRuns(runResult);
        setSummary(summaryResult);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId, desktopAppId]);

  if (loading) {
    return <div className='rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500'>Loading test results...</div>;
  }

  if (error) {
    return (
      <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700'>
        {error}
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      {summary ? (
        <section className='grid gap-3 sm:grid-cols-3 lg:grid-cols-6'>
          {[
            ['Runs', summary.totalRuns],
            ['Passed runs', summary.passedRuns],
            ['Failed runs', summary.failedRuns],
            ['Passed tests', summary.passedTests],
            ['Failed tests', summary.failedTests],
            ['Skipped tests', summary.skippedTests],
          ].map(([label, value]) => (
            <div key={String(label)} className='rounded-xl border border-slate-200 bg-white p-4'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>{label}</p>
              <p className='mt-2 text-xl font-bold text-slate-950'>{value}</p>
            </div>
          ))}
        </section>
      ) : null}

      {runs.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>
          No desktop test results have been recorded yet.
        </div>
      ) : (
        <div className='space-y-4'>
          {runs.map((run) => (
            <article key={run.id} className='rounded-2xl border border-slate-200 bg-white p-5'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='font-semibold text-slate-950'>{DESKTOP_TEST_TYPE_LABELS[run.type]}</p>
                  <p className='mt-1 text-sm text-slate-500'>
                    {run.passed} passed · {run.failed} failed · {run.skipped} skipped · {formatDuration(run.durationMs)}
                  </p>
                </div>

                <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>{run.status}</span>
              </div>

              {run.failures.length > 0 ? (
                <div className='mt-4 space-y-3 border-t border-slate-100 pt-4'>
                  {run.failures.map((failure) => (
                    <div key={failure.id} className='rounded-xl bg-red-50 p-4'>
                      <p className='font-semibold text-red-900'>{failure.testName ?? failure.suite ?? 'Failed test'}</p>

                      {failure.message ? <p className='mt-1 whitespace-pre-wrap text-sm text-red-800'>{failure.message}</p> : null}

                      {failure.file ? (
                        <p className='mt-2 break-all font-mono text-xs text-red-700'>
                          {failure.file}
                          {failure.line ? `:${failure.line}` : ''}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 10.8 Tests route

Create:

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/tests/page.tsx
```

```tsx
'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopTests } from '@/features/desktop-apps/desktop-tests';
import { useParams } from 'next/navigation';

export default function DesktopTestsPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  return (
    <main className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <header>
        <p className='text-sm font-medium text-slate-500'>Desktop App</p>
        <h1 className='mt-1 text-2xl font-bold text-slate-950'>Tests</h1>
      </header>

      <DesktopAppSubNav workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />

      <DesktopTests workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />
    </main>
  );
}
```

## 10.9 Final Build Details page — artifacts + tests

Create:

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/builds/[buildId]/page.tsx
```

```tsx
'use client';

import { getDesktopBuild } from '@/features/desktop-apps/desktop-apps-api';
import { DESKTOP_ARTIFACT_TYPE_LABELS, DESKTOP_TEST_TYPE_LABELS, formatDuration, shortSha } from '@/features/desktop-apps/desktop-build-utils';
import { BuildStatus } from '@/features/desktop-apps/desktop-builds';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopBuildDetails } from '@command-center/shared-types';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DesktopBuildDetailsPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
    buildId: string;
  }>();

  const [build, setBuild] = useState<DesktopBuildDetails | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getDesktopBuild(params.workspaceId, params.desktopAppId, params.buildId)
      .then((result) => {
        if (active) setBuild(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.workspaceId, params.desktopAppId, params.buildId]);

  const buildsHref = `/workspaces/${params.workspaceId}` + `/desktop-apps/${params.desktopAppId}/builds`;

  if (loading) {
    return <main className='p-8'>Loading build...</main>;
  }

  if (error || !build) {
    return (
      <main className='p-8'>
        <div role='alert'>{error ?? 'Desktop build was not found.'}</div>
      </main>
    );
  }

  return (
    <main className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <Link href={buildsHref} className='inline-flex items-center gap-2 text-sm font-semibold text-slate-600'>
        <ArrowLeft className='size-4' aria-hidden='true' />
        Back to builds
      </Link>

      <header>
        <div className='flex flex-wrap items-center gap-3'>
          <h1 className='text-2xl font-bold text-slate-950'>Build {build.version ?? build.buildNumber ?? build.workflowRunId}</h1>
          <BuildStatus status={build.status} />
        </div>

        <p className='mt-2 text-sm text-slate-500'>
          {build.platform} · {build.architecture} · {build.branch} · {shortSha(build.commitSha)} · {formatDuration(build.durationMs)}
        </p>
      </header>

      <section className='rounded-2xl border border-slate-200 bg-white p-5'>
        <h2 className='font-semibold text-slate-950'>Artifacts</h2>

        {build.artifacts.length === 0 ? (
          <p className='mt-3 text-sm text-slate-500'>No artifact metadata is available for this build.</p>
        ) : (
          <div className='mt-4 space-y-3'>
            {build.artifacts.map((artifact) => (
              <div key={artifact.id} className='flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='font-semibold text-slate-900'>{artifact.fileName}</p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {DESKTOP_ARTIFACT_TYPE_LABELS[artifact.type]} · {artifact.platform} · {artifact.architecture}
                    {artifact.sizeBytes !== null ? ` · ${artifact.sizeBytes.toLocaleString()} bytes` : ''}
                  </p>
                </div>

                {artifact.externalUrl ? (
                  <a
                    href={artifact.externalUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-2 text-sm font-semibold text-brand-600'
                  >
                    <Download className='size-4' aria-hidden='true' />
                    Open artifact
                  </a>
                ) : (
                  <span className='text-xs text-slate-400'>Remote artifact unavailable</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5'>
        <h2 className='font-semibold text-slate-950'>Tests</h2>

        <p className='mt-2 text-sm text-slate-500'>
          {build.testSummary.passedTests} passed · {build.testSummary.failedTests} failed · {build.testSummary.skippedTests} skipped
        </p>

        {build.testRuns.length === 0 ? (
          <p className='mt-4 text-sm text-slate-500'>No tests are attached to this build.</p>
        ) : (
          <div className='mt-4 space-y-4'>
            {build.testRuns.map((run) => (
              <article key={run.id} className='rounded-xl border border-slate-100 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='font-semibold text-slate-900'>{DESKTOP_TEST_TYPE_LABELS[run.type]}</p>
                  <span className='text-xs font-semibold text-slate-500'>{run.status}</span>
                </div>

                <p className='mt-1 text-sm text-slate-500'>
                  {run.passed} passed · {run.failed} failed · {run.skipped} skipped
                </p>

                {run.failures.map((failure) => (
                  <div key={failure.id} className='mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800'>
                    <p className='font-semibold'>{failure.testName ?? failure.suite ?? 'Failure'}</p>
                    {failure.message ? <p className='mt-1 whitespace-pre-wrap'>{failure.message}</p> : null}
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
```

## 10.10 Phase 10 API E2E

Create:

```text
packages/test-code/api/e2e/desktop-tests.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { createLinkedDesktopFixture, ingestSuccessfulBuild } from './helpers/desktop-test-fixtures';

describe('Desktop Tests E2E', () => {
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

  function buildTestsPath(workspaceId: string, desktopAppId: string, buildId: string) {
    return `/api/v1/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`;
  }

  it('stores counts and failure details', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const response = await fixture.owner.agent
      .post(buildTestsPath(fixture.owner.workspaceId, fixture.desktopApp.id, build.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'E2E',
        status: 'FAILED',
        passed: 18,
        failed: 1,
        skipped: 2,
        durationMs: 55000,
        failures: [
          {
            suite: 'Installer',
            testName: 'installs cleanly',
            message: 'Installer exited with code 1603',
            file: 'tests/installer.spec.ts',
            line: 42,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      type: 'E2E',
      status: 'FAILED',
      passed: 18,
      failed: 1,
      skipped: 2,
      total: 21,
    });

    expect(response.body.failures).toHaveLength(1);
    expect(response.body.failures[0].testName).toBe('installs cleanly');
  });

  it('re-ingestion replaces duplicate run/failures instead of duplicating them', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const endpoint = buildTestsPath(fixture.owner.workspaceId, fixture.desktopApp.id, build.id);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'UNIT',
        status: 'FAILED',
        passed: 10,
        failed: 1,
        skipped: 0,
        failures: [
          {
            testName: 'old failure',
          },
        ],
      })
      .expect(201);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'UNIT',
        status: 'PASSED',
        passed: 11,
        failed: 0,
        skipped: 0,
        failures: [],
      })
      .expect(201);

    expect(
      await prisma.desktopTestRun.count({
        where: {
          buildId: build.id,
          type: 'UNIT',
        },
      }),
    ).toBe(1);

    const run = await prisma.desktopTestRun.findFirstOrThrow({
      where: {
        buildId: build.id,
        type: 'UNIT',
      },
    });

    expect(run.status).toBe('PASSED');

    expect(
      await prisma.desktopTestFailure.count({
        where: {
          testRunId: run.id,
        },
      }),
    ).toBe(0);
  });

  it('returns aggregate app test summary', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const endpoint = buildTestsPath(fixture.owner.workspaceId, fixture.desktopApp.id, build.id);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'UNIT',
        status: 'PASSED',
        passed: 20,
        failed: 0,
        skipped: 1,
      })
      .expect(201);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'E2E',
        status: 'FAILED',
        passed: 4,
        failed: 2,
        skipped: 0,
      })
      .expect(201);

    const response = await fixture.owner.agent
      .get(`/api/v1/workspaces/${fixture.owner.workspaceId}/desktop-apps/${fixture.desktopApp.id}/tests/summary`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalRuns: 2,
      passedRuns: 1,
      failedRuns: 1,
      passedTests: 24,
      failedTests: 2,
      skippedTests: 1,
    });
  });

  it('cannot attach tests to a build from another desktop app', async () => {
    const fixtureA = await createLinkedDesktopFixture(app, prisma);
    const fixtureB = await createLinkedDesktopFixture(app, prisma);

    const buildA = await ingestSuccessfulBuild(fixtureA.owner, fixtureA.desktopApp.id, fixtureA.repository.id);

    const response = await fixtureB.owner.agent
      .post(buildTestsPath(fixtureB.owner.workspaceId, fixtureB.desktopApp.id, buildA.id))
      .set('Authorization', `Bearer ${fixtureB.owner.accessToken}`)
      .send({
        type: 'UNIT',
        status: 'PASSED',
        passed: 1,
        failed: 0,
        skipped: 0,
      });

    expect([403, 404]).toContain(response.status);
  });
});
```

---

# 11. DesktopAppsModule — Final Registration for Phases 5–10

Update:

```text
apps/api/src/modules/desktop-apps/desktop-apps.module.ts
```

Keep all Phase 1–4 imports/providers/controllers and add the following imports:

```ts
import { DesktopBuildArtifactsController } from './controllers/desktop-build-artifacts.controller';
import { DesktopBuildsController } from './controllers/desktop-builds.controller';
import { DesktopOverviewController } from './controllers/desktop-overview.controller';
import { DesktopProjectDetectionController } from './controllers/desktop-project-detection.controller';
import { DesktopTestsController } from './controllers/desktop-tests.controller';

import { DesktopBuildArtifactsService } from './services/desktop-build-artifacts.service';
import { DesktopBuildsService } from './services/desktop-builds.service';
import { DesktopOverviewService } from './services/desktop-overview.service';
import { DesktopProjectDetectionService } from './services/desktop-project-detection.service';
import { DesktopTestsService } from './services/desktop-tests.service';
```

The final module registration must contain these additions:

```ts
@Module({
  imports: [
    // KEEP Phase 1–4 imports:
    DatabaseModule,
    WorkspaceMembersModule,
    ActivityModule,
    RepositoriesModule,
  ],

  controllers: [
    // KEEP Phase 1–4 controllers:
    DesktopAppsController,
    DesktopRepositoriesController,

    DesktopProjectDetectionController,
    DesktopOverviewController,
    DesktopBuildsController,
    DesktopBuildArtifactsController,
    DesktopTestsController,
  ],

  providers: [
    // KEEP Phase 1–4 services:
    DesktopAppsService,
    DesktopRepositoryService,

    DesktopProjectDetectionService,
    DesktopOverviewService,
    DesktopBuildsService,
    DesktopBuildArtifactsService,
    DesktopTestsService,
  ],

  exports: [DesktopAppsService, DesktopRepositoryService, DesktopBuildsService, DesktopTestsService],
})
export class DesktopAppsModule {}
```

Do not replace valid imports added by your earlier phases.

---

# 12. Frontend Feature Exports

Update:

```text
apps/web/src/features/desktop-apps/index.ts
```

Keep Phase 1–4 exports and add:

```ts
export * from './desktop-app-sub-nav';
export * from './desktop-project-detection-panel';
export * from './desktop-overview';
export * from './desktop-builds';
export * from './desktop-tests';
export * from './desktop-build-utils';
```

---

# 13. Frontend Unit Tests

All React Testing Library tests below explicitly request JSDOM so they do not fail with `document is not defined`.

## 13.1 Sub-nav test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-app-sub-nav.test.tsx
```

```tsx
// @vitest-environment jsdom

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const usePathnameMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('DesktopAppSubNav', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/workspaces/workspace-1/desktop-apps/desktop-1');
  });

  it('renders Phase 5-10 live tabs', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Builds')).toBeInTheDocument();
    expect(screen.getByText('Tests')).toBeInTheDocument();
  });

  it('links Code to the desktop code route', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(
      screen.getByRole('link', {
        name: 'Code',
      }),
    ).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/code');
  });

  it('keeps future phases disabled instead of linking to 404 routes', () => {
    render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

    for (const label of ['Releases', 'Performance', 'Crashes', 'Dependencies', 'Security']) {
      expect(screen.getByText(label)).toHaveAttribute('aria-disabled', 'true');
    }
  });
});
```

## 13.2 Detection panel test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-project-detection-panel.test.tsx
```

```tsx
// @vitest-environment jsdom

import { applyDetectedDesktopConfiguration, detectDesktopProject } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopProjectDetectionPanel } from '@/features/desktop-apps/desktop-project-detection-panel';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  detectDesktopProject: vi.fn(),
  applyDetectedDesktopConfiguration: vi.fn(),
}));

const detectMock = vi.mocked(detectDesktopProject);

const updateMock = vi.mocked(applyDetectedDesktopConfiguration);

const desktopApp = {
  id: 'desktop-1',
  applicationId: 'application-1',
  platform: 'CROSS_PLATFORM',
  framework: 'OTHER',
  architecture: 'X64',
  packageName: null,
  currentVersion: null,
  currentBuildNumber: null,
  minimumOsVersion: null,
  updateChannel: 'stable',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  application: {
    id: 'application-1',
    workspaceId: 'workspace-1',
    name: 'Desktop Test',
    slug: 'desktop-test',
    type: 'DESKTOP',
    archivedAt: null,
    createdAt: '2026-08-23T00:00:00.000Z',
    updatedAt: '2026-08-23T00:00:00.000Z',
  },
} as never;

describe('DesktopProjectDetectionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    detectMock.mockResolvedValue({
      repositoryId: 'repository-1',
      repositoryFullName: 'command-center/desktop',
      branch: 'main',
      truncated: false,
      candidates: [
        {
          applicationType: 'DESKTOP',
          projectRoot: '',
          platform: 'CROSS_PLATFORM',
          framework: 'ELECTRON',
          architecture: 'X64',
          packageName: 'command-center-desktop',
          version: '1.2.0',
          buildNumber: null,
          minimumOsVersion: null,
          confidence: 'HIGH',
          score: 96,
          evidence: ['package.json', 'package.json:electron'],
          warnings: [],
        },
      ],
      primary: {
        applicationType: 'DESKTOP',
        projectRoot: '',
        platform: 'CROSS_PLATFORM',
        framework: 'ELECTRON',
        architecture: 'X64',
        packageName: 'command-center-desktop',
        version: '1.2.0',
        buildNumber: null,
        minimumOsVersion: null,
        confidence: 'HIGH',
        score: 96,
        evidence: ['package.json', 'package.json:electron'],
        warnings: [],
      },
    });

    updateMock.mockResolvedValue({
      ...desktopApp,
      framework: 'ELECTRON',
      packageName: 'command-center-desktop',
      currentVersion: '1.2.0',
    } as never);
  });

  it('runs detection and renders normalized result', async () => {
    const user = userEvent.setup();

    render(<DesktopProjectDetectionPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Repository',
      }),
    );

    expect(await screen.findByDisplayValue('command-center-desktop')).toBeInTheDocument();

    expect(screen.getByDisplayValue('1.2.0')).toBeInTheDocument();

    expect(screen.getByText('HIGH · 96%')).toBeInTheDocument();
  });

  it('allows manual correction before saving detected config', async () => {
    const user = userEvent.setup();

    render(<DesktopProjectDetectionPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Repository',
      }),
    );

    await user.selectOptions(await screen.findByLabelText('Detected architecture'), 'ARM64');

    await user.click(
      screen.getByRole('button', {
        name: 'Use Detected Configuration',
      }),
    );

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'workspace-1',
        'desktop-1',
        expect.objectContaining({
          framework: 'ELECTRON',
          architecture: 'ARM64',
          packageName: 'command-center-desktop',
        }),
      );
    });
  });

  it('renders safe no-match state', async () => {
    detectMock.mockResolvedValue({
      repositoryId: 'repository-1',
      repositoryFullName: 'command-center/web-only',
      branch: 'main',
      truncated: false,
      candidates: [],
      primary: null,
    });

    const user = userEvent.setup();

    render(<DesktopProjectDetectionPanel workspaceId='workspace-1' desktopApp={desktopApp} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Repository',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('No supported desktop project was detected');
  });
});
```

## 13.3 Builds UI test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-builds.test.tsx
```

```tsx
// @vitest-environment jsdom

import { listDesktopBuilds } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopBuilds } from '@/features/desktop-apps/desktop-builds';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  listDesktopBuilds: vi.fn(),
}));

const listMock = vi.mocked(listDesktopBuilds);

const build = {
  id: 'build-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  repositoryId: 'repository-1',
  workflowRunId: '901',
  source: 'GITHUB_ACTIONS',
  commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
  branch: 'main',
  version: '2.0.0',
  buildNumber: '200',
  platform: 'WINDOWS',
  architecture: 'X64',
  status: 'SUCCESS',
  startedAt: '2026-08-23T01:00:00.000Z',
  completedAt: '2026-08-23T01:05:00.000Z',
  durationMs: 300000,
  createdAt: '2026-08-23T01:00:00.000Z',
  updatedAt: '2026-08-23T01:05:00.000Z',
} as never;

describe('DesktopBuilds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([build]);
  });

  it('renders build lifecycle data', async () => {
    render(<DesktopBuilds workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('Success')).toBeInTheDocument();

    expect(screen.getByText('WINDOWS')).toBeInTheDocument();

    expect(screen.getByText('X64')).toBeInTheDocument();

    expect(screen.getByText('a93f1425')).toBeInTheDocument();

    expect(screen.getByText('5m 0s')).toBeInTheDocument();
  });

  it('passes filters to API', async () => {
    const user = userEvent.setup();

    render(<DesktopBuilds workspaceId='workspace-1' desktopAppId='desktop-1' />);

    await screen.findByText('Success');

    await user.selectOptions(screen.getByLabelText('Build status filter'), 'SUCCESS');

    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith(
        'workspace-1',
        'desktop-1',
        expect.objectContaining({
          status: 'SUCCESS',
        }),
      );
    });
  });
});
```

## 13.4 Tests UI test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-tests.test.tsx
```

```tsx
// @vitest-environment jsdom

import { getDesktopTestSummary, listDesktopAppTests } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopTests } from '@/features/desktop-apps/desktop-tests';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  getDesktopTestSummary: vi.fn(),
  listDesktopAppTests: vi.fn(),
}));

const summaryMock = vi.mocked(getDesktopTestSummary);

const runsMock = vi.mocked(listDesktopAppTests);

describe('DesktopTests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    summaryMock.mockResolvedValue({
      totalRuns: 1,
      passedRuns: 0,
      failedRuns: 1,
      passedTests: 18,
      failedTests: 1,
      skippedTests: 2,
    });

    runsMock.mockResolvedValue([
      {
        id: 'run-1',
        buildId: 'build-1',
        type: 'E2E',
        status: 'FAILED',
        passed: 18,
        failed: 1,
        skipped: 2,
        total: 21,
        durationMs: 55000,
        startedAt: null,
        completedAt: null,
        createdAt: '2026-08-23T00:00:00.000Z',
        updatedAt: '2026-08-23T00:00:00.000Z',
        failures: [
          {
            id: 'failure-1',
            testRunId: 'run-1',
            suite: 'Installer',
            testName: 'installs cleanly',
            message: 'Installer exited with code 1603',
            file: 'tests/installer.spec.ts',
            line: 42,
            stackTrace: null,
            createdAt: '2026-08-23T00:00:00.000Z',
          },
        ],
      },
    ] as never);
  });

  it('renders aggregate counts and failed test drilldown', async () => {
    render(<DesktopTests workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('installs cleanly')).toBeInTheDocument();

    expect(screen.getByText('Installer exited with code 1603')).toBeInTheDocument();

    expect(screen.getByText('tests/installer.spec.ts:42')).toBeInTheDocument();
  });
});
```

---

# 14. Frontend API Contract Test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-apps-api.phase5-10.test.ts
```

```ts
import {
  detectDesktopProject,
  getDesktopAppOverview,
  getDesktopBuild,
  getDesktopTestSummary,
  ingestDesktopBuildArtifact,
  ingestDesktopTestRun,
  ingestGithubDesktopBuild,
  listDesktopAppTests,
  listDesktopBuildArtifacts,
  listDesktopBuildTests,
  listDesktopBuilds,
} from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const requestMock = vi.mocked(apiRequest);

const workspaceId = 'workspace-1';
const desktopAppId = 'desktop-1';
const buildId = 'build-1';

describe('desktop phases 5-10 API client', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue(undefined);
  });

  it('uses desktop detection endpoint', async () => {
    await detectDesktopProject(workspaceId, desktopAppId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/detect`, {
      method: 'POST',
    });
  });

  it('uses desktop overview endpoint', async () => {
    await getDesktopAppOverview(workspaceId, desktopAppId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/overview`);
  });

  it('serializes build filters', async () => {
    await listDesktopBuilds(workspaceId, desktopAppId, {
      status: 'FAILED',
      platform: 'WINDOWS',
      architecture: 'X64',
      branch: 'main',
      version: '2.0.0',
    });

    expect(requestMock).toHaveBeenCalledWith(expect.stringContaining(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds?`));

    const url = requestMock.mock.calls[0]?.[0] as string;

    expect(url).toContain('status=FAILED');
    expect(url).toContain('platform=WINDOWS');
    expect(url).toContain('architecture=X64');
    expect(url).toContain('branch=main');
    expect(url).toContain('version=2.0.0');
  });

  it('gets build detail', async () => {
    await getDesktopBuild(workspaceId, desktopAppId, buildId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}`);
  });

  it('ingests GitHub build', async () => {
    const payload = {
      repositoryId: 'repository-1',
      workflowRunId: '901',
      commitSha: 'abcdef1234567',
      branch: 'main',
    } as never;

    await ingestGithubDesktopBuild(workspaceId, desktopAppId, payload);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/ingest/github`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('uses artifact endpoints', async () => {
    await listDesktopBuildArtifacts(workspaceId, desktopAppId, buildId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`);

    const input = {
      providerArtifactId: 'artifact-1',
      platform: 'WINDOWS',
      architecture: 'X64',
      type: 'MSI',
      fileName: 'app.msi',
    } as never;

    await ingestDesktopBuildArtifact(workspaceId, desktopAppId, buildId, input);

    expect(requestMock).toHaveBeenLastCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('uses test endpoints', async () => {
    await listDesktopBuildTests(workspaceId, desktopAppId, buildId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`);

    await listDesktopAppTests(workspaceId, desktopAppId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests`);

    await getDesktopTestSummary(workspaceId, desktopAppId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests/summary`);

    const input = {
      type: 'UNIT',
      status: 'PASSED',
      passed: 10,
      failed: 0,
      skipped: 0,
    } as never;

    await ingestDesktopTestRun(workspaceId, desktopAppId, buildId, input);

    expect(requestMock).toHaveBeenLastCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });
});
```

---

# 15. Full-Stack Browser E2E for Phases 5–10

This Playwright spec uses the real frontend and real Desktop CRUD API, while deterministic route fixtures are used for GitHub-dependent detection/build metadata. Backend persistence and authorization are independently covered by the API E2E suites above.

Create:

```text
packages/test-code/web/e2e/full-stack/fullstack-desktop-phases-5-10.spec.ts
```

```ts
import { authorizedApiRequest, loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type APIRequestContext } from '@playwright/test';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

async function createDesktopApplication(request: APIRequestContext) {
  const response = await authorizedApiRequest(request, state, state.owner.accessToken, `/workspaces/${state.owner.workspaceId}/desktop-apps`, {
    method: 'POST',
    data: {
      name: uniqueValue('Desktop Phases 5-10', state.runId),
      platform: 'CROSS_PLATFORM',
      framework: 'OTHER',
      architecture: 'X64',
      packageName: `com.commandcenter.desktop.${Date.now()}`,
    },
  });

  expect(response.status()).toBe(201);

  return (await response.json()) as {
    id: string;
    applicationId: string;
    application: {
      name: string;
    };
  };
}

test.describe('Desktop phases 5-10 frontend', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('renders overview, code empty state, builds and tests', async ({ page, request }) => {
    await loginThroughUi(page, state.owner);

    const desktopApp = await createDesktopApplication(request);

    const base = `/api/v1/workspaces/${state.owner.workspaceId}` + `/desktop-apps/${desktopApp.id}`;

    const frontendBase = `/workspaces/${state.owner.workspaceId}` + `/desktop-apps/${desktopApp.id}`;

    const build = {
      id: '11111111-1111-4111-8111-111111111111',
      workspaceId: state.owner.workspaceId,
      desktopAppId: desktopApp.id,
      repositoryId: '22222222-2222-4222-8222-222222222222',
      workflowRunId: '901',
      source: 'GITHUB_ACTIONS',
      commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
      branch: 'main',
      version: '2.0.0',
      buildNumber: '200',
      platform: 'WINDOWS',
      architecture: 'X64',
      status: 'SUCCESS',
      startedAt: '2026-08-23T01:00:00.000Z',
      completedAt: '2026-08-23T01:05:00.000Z',
      durationMs: 300000,
      createdAt: '2026-08-23T01:00:00.000Z',
      updatedAt: '2026-08-23T01:05:00.000Z',
    };

    const desktopDetails = {
      id: desktopApp.id,
      applicationId: desktopApp.applicationId,
      platform: 'CROSS_PLATFORM',
      framework: 'OTHER',
      architecture: 'X64',
      packageName: 'com.commandcenter.desktop',
      currentVersion: null,
      currentBuildNumber: null,
      minimumOsVersion: null,
      updateChannel: 'stable',
      createdAt: '2026-08-23T00:00:00.000Z',
      updatedAt: '2026-08-23T00:00:00.000Z',
      application: {
        id: desktopApp.applicationId,
        workspaceId: state.owner.workspaceId,
        name: desktopApp.application.name,
        slug: 'desktop-phases',
        type: 'DESKTOP',
        archivedAt: null,
        createdAt: '2026-08-23T00:00:00.000Z',
        updatedAt: '2026-08-23T00:00:00.000Z',
      },
    };

    await page.route(`**${base}/overview`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          desktopApp: desktopDetails,
          repository: null,
          latestBuild: build,
          latestRelease: null,
          latestPerformance: null,
        }),
      });
    });

    await page.route(`**${base}/detect`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          repositoryId: '22222222-2222-4222-8222-222222222222',
          repositoryFullName: 'command-center/desktop',
          branch: 'main',
          truncated: false,
          candidates: [],
          primary: {
            applicationType: 'DESKTOP',
            projectRoot: '',
            platform: 'CROSS_PLATFORM',
            framework: 'ELECTRON',
            architecture: 'X64',
            packageName: 'command-center-desktop',
            version: '2.0.0',
            buildNumber: '200',
            minimumOsVersion: null,
            confidence: 'HIGH',
            score: 96,
            evidence: ['package.json'],
            warnings: [],
          },
        }),
      });
    });

    await page.route(`**${base}/builds**`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const url = new URL(route.request().url());

      if (url.pathname.endsWith(`/builds/${build.id}`)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...build,
            artifacts: [
              {
                id: 'artifact-1',
                buildId: build.id,
                providerArtifactId: 'github-artifact-1',
                platform: 'WINDOWS',
                architecture: 'X64',
                type: 'MSI',
                fileName: 'CommandCenter-2.0.0.msi',
                sizeBytes: 1000000,
                checksum: null,
                externalUrl: null,
                createdAt: '2026-08-23T01:05:00.000Z',
              },
            ],
            testRuns: [],
            testSummary: {
              totalRuns: 0,
              passedRuns: 0,
              failedRuns: 0,
              passedTests: 0,
              failedTests: 0,
              skippedTests: 0,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([build]),
      });
    });

    await page.route(`**${base}/tests`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'run-1',
            buildId: build.id,
            type: 'E2E',
            status: 'FAILED',
            passed: 18,
            failed: 1,
            skipped: 0,
            total: 19,
            durationMs: 45000,
            startedAt: null,
            completedAt: null,
            createdAt: '2026-08-23T01:05:00.000Z',
            updatedAt: '2026-08-23T01:05:00.000Z',
            failures: [
              {
                id: 'failure-1',
                testRunId: 'run-1',
                suite: 'Installer',
                testName: 'installs cleanly',
                message: 'Installer failed',
                file: 'installer.spec.ts',
                line: 42,
                stackTrace: null,
                createdAt: '2026-08-23T01:05:00.000Z',
              },
            ],
          },
        ]),
      });
    });

    await page.route(`**${base}/tests/summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalRuns: 1,
          passedRuns: 0,
          failedRuns: 1,
          passedTests: 18,
          failedTests: 1,
          skippedTests: 0,
        }),
      });
    });

    await page.goto(frontendBase);

    await expect(
      page.getByRole('heading', {
        name: desktopApp.application.name,
      }),
    ).toBeVisible();

    await expect(page.getByText('Latest build')).toBeVisible();

    await page
      .getByRole('button', {
        name: 'Analyze Repository',
      })
      .click();

    await expect(page.getByDisplayValue('command-center-desktop')).toBeVisible();

    await page.goto(`${frontendBase}/code`);

    await expect(
      page.getByRole('heading', {
        name: 'Connect a repository first',
      }),
    ).toBeVisible();

    await page.goto(`${frontendBase}/builds`);

    await expect(page.getByText('Success')).toBeVisible();

    await page
      .getByRole('link', {
        name: '2.0.0',
      })
      .click();

    await expect(page.getByText('CommandCenter-2.0.0.msi')).toBeVisible();

    await expect(page.getByText('Remote artifact unavailable')).toBeVisible();

    await page.goto(`${frontendBase}/tests`);

    await expect(page.getByText('installs cleanly')).toBeVisible();

    await expect(page.getByText('Installer failed')).toBeVisible();
  });
});
```

---

# 16. Prisma Migration Order

Your repository uses Prisma schema files under `apps/api/prisma/models`, so keep each database phase isolated.

## Phase 8

After adding `desktop-build.prisma` and relation fields:

```powershell
pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate
pnpm --filter @command-center/api exec prisma migrate dev --name desktop_build_tracking
pnpm --filter @command-center/api exec prisma generate
```

## Phase 9

After adding `desktop-build-artifact.prisma` and `DesktopBuild.artifacts`:

```powershell
pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate
pnpm --filter @command-center/api exec prisma migrate dev --name desktop_build_artifacts
pnpm --filter @command-center/api exec prisma generate
```

## Phase 10

After adding `desktop-test.prisma` and `DesktopBuild.testRuns`:

```powershell
pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate
pnpm --filter @command-center/api exec prisma migrate dev --name desktop_test_tracking
pnpm --filter @command-center/api exec prisma generate
```

**Do not combine all three schema changes and then try to claim the individual phase migrations passed.** Apply and verify them in order.

---

# 17. Verification Commands — Exact Phase Order

## Phase 5

```powershell
pnpm --filter @command-center/shared-types build
pnpm --filter @command-center/api typecheck
pnpm --filter @command-center/api exec jest --runInBand ../../packages/test-code/api/unit/desktop-project-detector.spec.ts
pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-project-detection.e2e-spec.ts
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web-tests exec vitest run unit/features/desktop-apps/desktop-project-detection-panel.test.tsx
```

## Phase 6

```powershell
pnpm --filter @command-center/api typecheck
pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-overview.e2e-spec.ts
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web-tests exec vitest run unit/features/desktop-apps/desktop-app-sub-nav.test.tsx
```

## Phase 7

Run the existing Code Explorer API regression plus desktop frontend typecheck:

```powershell
pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/code-explorer.e2e-spec.ts
pnpm --filter @command-center/web typecheck
```

If your existing Code Explorer E2E filename differs, run the repository/code-explorer spec already present in `packages/test-code/api/e2e`.

## Phase 8

```powershell
pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate
pnpm --filter @command-center/api exec prisma generate
pnpm --filter @command-center/api typecheck
pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-builds.e2e-spec.ts
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web-tests exec vitest run unit/features/desktop-apps/desktop-builds.test.tsx
```

## Phase 9

```powershell
pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate
pnpm --filter @command-center/api exec prisma generate
pnpm --filter @command-center/api typecheck
pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-build-artifacts.e2e-spec.ts
pnpm --filter @command-center/web typecheck
```

## Phase 10

```powershell
pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate
pnpm --filter @command-center/api exec prisma generate
pnpm --filter @command-center/shared-types build
pnpm --filter @command-center/api typecheck
pnpm --dir apps/api exec jest --config ../../packages/test-code/api/jest-e2e.config.cjs --runInBand --runTestsByPath ../../packages/test-code/api/e2e/desktop-tests.e2e-spec.ts
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web-tests typecheck
pnpm --filter @command-center/web-tests exec vitest run unit/features/desktop-apps
```

## Full browser verification

```powershell
pnpm --filter @command-center/web-tests exec playwright test e2e/full-stack/fullstack-desktop-phases-5-10.spec.ts --project=chrome-fullstack
```

## Regression

After all targeted suites are green:

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm run test:api
pnpm run test:web
```

Also rerun the already-working Desktop Phase 1–4 suites, Mobile repository/build/test suites, and existing Code Explorer suite.

---

# 18. Required Phase Status Reporting

Do not mark a phase PASS from this document alone.

Use:

```text
PHASE 5 — AUTOMATIC PROJECT DETECTION
Backend:       NOT EXECUTED
Frontend:      NOT EXECUTED
Database:      NO CHANGE
Tests:         NOT EXECUTED
Security:      NOT VERIFIED
Typecheck:     NOT EXECUTED
Build:         NOT EXECUTED
Lint:          NOT EXECUTED
STATUS:        UNVERIFIED

PHASE 6 — DESKTOP OVERVIEW
Backend:       NOT EXECUTED
Frontend:      NOT EXECUTED
Database:      NO CHANGE
Tests:         NOT EXECUTED
Security:      NOT VERIFIED
Typecheck:     NOT EXECUTED
Build:         NOT EXECUTED
Lint:          NOT EXECUTED
STATUS:        UNVERIFIED

PHASE 7 — CODE EXPLORER INTEGRATION
Backend:       EXISTING SYSTEM REUSED / NOT RETESTED
Frontend:      NOT EXECUTED
Database:      NO CHANGE
Tests:         NOT EXECUTED
Security:      NOT RETESTED
Typecheck:     NOT EXECUTED
Build:         NOT EXECUTED
Lint:          NOT EXECUTED
STATUS:        UNVERIFIED

PHASE 8 — BUILD TRACKING
Backend:       NOT EXECUTED
Frontend:      NOT EXECUTED
Database:      MIGRATION REQUIRED / NOT EXECUTED
Tests:         NOT EXECUTED
Security:      NOT VERIFIED
Typecheck:     NOT EXECUTED
Build:         NOT EXECUTED
Lint:          NOT EXECUTED
STATUS:        UNVERIFIED

PHASE 9 — ARTIFACT TRACKING
Backend:       NOT EXECUTED
Frontend:      BUILD DETAIL UI / NOT EXECUTED
Database:      MIGRATION REQUIRED / NOT EXECUTED
Tests:         NOT EXECUTED
Security:      NOT VERIFIED
Typecheck:     NOT EXECUTED
Build:         NOT EXECUTED
Lint:          NOT EXECUTED
STATUS:        UNVERIFIED

PHASE 10 — TEST TRACKING
Backend:       NOT EXECUTED
Frontend:      NOT EXECUTED
Database:      MIGRATION REQUIRED / NOT EXECUTED
Tests:         NOT EXECUTED
Security:      NOT VERIFIED
Typecheck:     NOT EXECUTED
Build:         NOT EXECUTED
Lint:          NOT EXECUTED
STATUS:        UNVERIFIED
```

---

# 19. What Phases 5–10 Now Deliver

```text
Desktop App
   │
   ├── Phase 5
   │      Linked repository
   │          ↓
   │      Project detection
   │          ├── Electron
   │          ├── Tauri
   │          ├── .NET / WPF / WinUI / Avalonia
   │          ├── Qt
   │          ├── JavaFX / Swing
   │          └── native macOS
   │
   ├── Phase 6
   │      Overview
   │          ├── desktop metadata
   │          ├── repository
   │          └── latest build
   │
   ├── Phase 7
   │      Existing Code Explorer
   │          ├── branches
   │          ├── tree
   │          ├── files
   │          ├── search
   │          └── diff
   │
   ├── Phase 8
   │      DesktopBuild
   │          ├── GitHub Actions run
   │          ├── commit / branch
   │          ├── platform
   │          ├── architecture
   │          └── lifecycle status
   │
   ├── Phase 9
   │      Build artifacts
   │          ├── MSI / MSIX / EXE
   │          ├── DMG / PKG / APP
   │          ├── AppImage / DEB / RPM
   │          └── ZIP / OTHER
   │
   └── Phase 10
          Test runs
              ├── Unit
              ├── Integration
              ├── UI
              ├── E2E
              ├── Installer
              └── failure drill-down
```

After Phase 10 is verified, the next implementation boundary is **Phase 11 — Releases & Update Channels**. Do not introduce release, telemetry, performance, crash, security, alert, or AI tables into Phases 5–10.
