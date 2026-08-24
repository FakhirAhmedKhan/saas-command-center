import type { DesktopArchitecture, DesktopFramework, DesktopPlatform, DesktopProjectDetectionCandidate, DesktopProjectDetectionResponse } from '@command-center/shared-types';

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
  const isDesktop = lower.includes('<usewpf>true</usewpf>') || lower.includes('<usewindowsforms>true</usewindowsforms>') || lower.includes('microsoft.windowsappsdk') || lower.includes('avalonia');

  if (!isDesktop) return null;

  const evidence = [projectPath];
  const targetFramework = text.match(/<TargetFrameworks?>([^<]+)<\/TargetFrameworks?>/i)?.[1] ?? '';
  const runtimeIdentifiers = text.match(/<RuntimeIdentifiers?>([^<]+)<\/RuntimeIdentifiers?>/i)?.[1] ?? '';
  const combined = `${text}\n${targetFramework}\n${runtimeIdentifiers}`;
  const platform: DesktopPlatform = lower.includes('avalonia') && !/windows/i.test(combined) ? 'CROSS_PLATFORM' : inferPlatforms(combined.includes('windows') ? combined : `${combined} windows`);
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
  const target = text.match(/\bqt_add_executable\s*\(\s*([A-Za-z0-9_.-]+)/i)?.[1] ?? text.match(/\badd_executable\s*\(\s*([A-Za-z0-9_.-]+)/i)?.[1] ?? text.match(/^\s*TARGET\s*=\s*([^\r\n#]+)/im)?.[1]?.trim() ?? null;

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
  const swing = snapshot.paths.some((candidate) => /\.(java|kt)$/i.test(candidate) && /\b(src|app)\b/i.test(candidate) && /swing/i.test(getText(snapshot, candidate) ?? ''));

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
