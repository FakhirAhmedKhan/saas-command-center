import type { MobileFramework, MobilePlatform, MobileProjectDetection } from '@command-center/shared-types';

export interface MobileRepositorySnapshot {
  paths: string[];

  files: Record<string, string>;

  truncated: boolean;
}

interface AndroidMetadata {
  packageId: string | null;

  minSdk: string | null;

  targetSdk: string | null;

  versionName: string | null;

  versionCode: string | null;
}

interface IosMetadata {
  bundleId: string | null;

  minOsVersion: string | null;

  version: string | null;

  buildNumber: string | null;
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
}

function parentPath(path: string): string {
  const normalized = normalizePath(path);

  const index = normalized.lastIndexOf('/');

  if (index < 0) {
    return '.';
  }

  return normalized.slice(0, index) || '.';
}

function joinPath(root: string, path: string): string {
  if (root === '.') {
    return normalizePath(path);
  }

  return normalizePath(`${root}/${path}`);
}

function fileName(path: string): string {
  return normalizePath(path).split('/').at(-1) ?? '';
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function matchFirst(text: string | undefined, patterns: RegExp[]): string | null {
  if (!text) {
    return null;
  }

  for (const pattern of patterns) {
    const match = text.match(pattern);

    const value = match?.[1]?.trim();

    if (value) {
      return value.replace(/^["']|["']$/g, '').trim();
    }
  }

  return null;
}

function fileAt(snapshot: MobileRepositorySnapshot, path: string): string | undefined {
  return snapshot.files[normalizePath(path)];
}

function firstExistingPath(snapshot: MobileRepositorySnapshot, candidates: string[]): string | null {
  const pathSet = new Set(snapshot.paths.map(normalizePath));

  return candidates.map(normalizePath).find((path) => pathSet.has(path)) ?? null;
}

function firstPathMatching(snapshot: MobileRepositorySnapshot, predicate: (path: string) => boolean): string | null {
  return snapshot.paths.map(normalizePath).find(predicate) ?? null;
}

function parseAndroid(snapshot: MobileRepositorySnapshot, root: string): AndroidMetadata {
  const gradlePaths = [
    joinPath(root, 'app/build.gradle.kts'),

    joinPath(root, 'app/build.gradle'),

    joinPath(root, 'build.gradle.kts'),

    joinPath(root, 'build.gradle'),
  ];

  const gradleText = gradlePaths
    .map((path) => fileAt(snapshot, path))
    .filter((value): value is string => Boolean(value))
    .join('\n');

  const manifestPath = firstPathMatching(snapshot, (path) => path.startsWith(root === '.' ? '' : `${root}/`) && path.endsWith('AndroidManifest.xml'));

  const manifestText = manifestPath ? fileAt(snapshot, manifestPath) : undefined;

  return {
    packageId:
      matchFirst(gradleText, [/\bapplicationId\s*(?:=)?\s*["']([^"']+)["']/i, /\bnamespace\s*(?:=)?\s*["']([^"']+)["']/i]) ??
      matchFirst(manifestText, [/<manifest[^>]*\bpackage=["']([^"']+)["']/i]),

    minSdk: matchFirst(gradleText, [/\bminSdk(?:Version)?\s*(?:=)?\s*(\d+)/i]),

    targetSdk: matchFirst(gradleText, [/\btargetSdk(?:Version)?\s*(?:=)?\s*(\d+)/i]),

    versionName: matchFirst(gradleText, [/\bversionName\s*(?:=)?\s*["']([^"']+)["']/i]),

    versionCode: matchFirst(gradleText, [/\bversionCode\s*(?:=)?\s*(\d+)/i]),
  };
}

function parseIos(snapshot: MobileRepositorySnapshot, root: string): IosMetadata {
  const pbxprojPath = firstPathMatching(snapshot, (path) => {
    const prefix = root === '.' ? '' : `${root}/`;

    return path.startsWith(prefix) && path.endsWith('.xcodeproj/project.pbxproj');
  });

  const pbxproj = pbxprojPath ? fileAt(snapshot, pbxprojPath) : undefined;

  return {
    bundleId: matchFirst(pbxproj, [/\bPRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/i]),

    minOsVersion: matchFirst(pbxproj, [/\bIPHONEOS_DEPLOYMENT_TARGET\s*=\s*([^;]+);/i]),

    version: matchFirst(pbxproj, [/\bMARKETING_VERSION\s*=\s*([^;]+);/i]),

    buildNumber: matchFirst(pbxproj, [/\bCURRENT_PROJECT_VERSION\s*=\s*([^;]+);/i]),
  };
}

function parsePubspecVersion(text: string | undefined): {
  version: string | null;

  build: string | null;
} {
  const raw = matchFirst(text, [/^\s*version:\s*([^\s#]+).*$/im]);

  if (!raw) {
    return {
      version: null,
      build: null,
    };
  }

  const [version, build] = raw.split('+');

  return {
    version: version?.trim() || null,

    build: build?.trim() || null,
  };
}

function parsePackageVersion(text: string | undefined): string | null {
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as {
      version?: unknown;
    };

    return typeof parsed.version === 'string' ? parsed.version : null;
  } catch {
    return null;
  }
}

function isReactNativePackage(text: string | undefined): boolean {
  if (!text) {
    return false;
  }

  try {
    const parsed = JSON.parse(text) as {
      dependencies?: Record<string, unknown>;

      devDependencies?: Record<string, unknown>;
    };

    return Boolean(parsed.dependencies?.['react-native'] ?? parsed.devDependencies?.['react-native']);
  } catch {
    return /["']react-native["']/.test(text);
  }
}

function confidence(evidence: string[]): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (evidence.length >= 3) {
    return 'HIGH';
  }

  if (evidence.length === 2) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function isInsideCrossPlatformRoot(root: string, crossRoots: string[]): boolean {
  return crossRoots.some((crossRoot) => {
    if (crossRoot === '.') {
      return root === 'android' || root === 'ios';
    }

    return root.startsWith(`${crossRoot}/android`) || root.startsWith(`${crossRoot}/ios`);
  });
}

function buildProject(input: {
  projectRoot: string;

  platform: MobilePlatform;

  framework: MobileFramework;

  packageId?: string | null;

  bundleId?: string | null;

  minOsVersion?: string | null;

  targetOsVersion?: string | null;

  currentVersion?: string | null;

  currentBuildNumber?: string | null;

  buildSystem: 'GRADLE' | 'XCODE' | 'FLUTTER' | 'NODE' | 'SWIFT_PACKAGE' | 'OTHER';

  evidence: string[];

  warnings?: string[];
}): MobileProjectDetection {
  return {
    applicationType: 'MOBILE',

    projectRoot: input.projectRoot,

    platform: input.platform,

    framework: input.framework,

    packageId: input.packageId ?? null,

    bundleId: input.bundleId ?? null,

    minOsVersion: input.minOsVersion ?? null,

    targetOsVersion: input.targetOsVersion ?? null,

    currentVersion: input.currentVersion ?? null,

    currentBuildNumber: input.currentBuildNumber ?? null,

    buildSystem: input.buildSystem,

    confidence: confidence(input.evidence),

    evidence: unique(input.evidence),

    warnings: input.warnings ?? [],
  };
}

export function detectMobileProjects(snapshot: MobileRepositorySnapshot): MobileProjectDetection[] {
  const paths = snapshot.paths.map(normalizePath);

  const projects: MobileProjectDetection[] = [];

  /*
   * Flutter
   */
  const flutterRoots = unique(paths.filter((path) => fileName(path) === 'pubspec.yaml').map(parentPath));

  for (const root of flutterRoots) {
    const pubspecPath = joinPath(root, 'pubspec.yaml');

    const androidRoot = joinPath(root, 'android');

    const iosRoot = joinPath(root, 'ios');

    const android = parseAndroid(snapshot, androidRoot);

    const ios = parseIos(snapshot, iosRoot);

    const version = parsePubspecVersion(fileAt(snapshot, pubspecPath));

    const evidence = [
      pubspecPath,

      ...(paths.filter((path) => path.startsWith(`${androidRoot}/`)).length ? [androidRoot] : []),

      ...(paths.filter((path) => path.startsWith(`${iosRoot}/`)).length ? [iosRoot] : []),
    ];

    projects.push(
      buildProject({
        projectRoot: root,

        platform: 'CROSS_PLATFORM',

        framework: 'FLUTTER',

        packageId: android.packageId,

        bundleId: ios.bundleId,

        minOsVersion: android.minSdk ?? ios.minOsVersion,

        targetOsVersion: android.targetSdk,

        currentVersion: version.version ?? android.versionName ?? ios.version,

        currentBuildNumber: version.build ?? android.versionCode ?? ios.buildNumber,

        buildSystem: 'FLUTTER',

        evidence,

        warnings: [
          ...(!android.packageId ? ['Android package ID could not be determined.'] : []),

          ...(!ios.bundleId ? ['iOS Bundle ID could not be determined.'] : []),
        ],
      }),
    );
  }

  /*
   * React Native
   */
  const reactNativeRoots = unique(
    Object.entries(snapshot.files)
      .filter(([path, text]) => fileName(path) === 'package.json' && isReactNativePackage(text))
      .map(([path]) => parentPath(path)),
  );

  for (const root of reactNativeRoots) {
    if (flutterRoots.includes(root)) {
      continue;
    }

    const packagePath = joinPath(root, 'package.json');

    const android = parseAndroid(snapshot, joinPath(root, 'android'));

    const ios = parseIos(snapshot, joinPath(root, 'ios'));

    const metroPath = firstExistingPath(snapshot, [joinPath(root, 'metro.config.js'), joinPath(root, 'metro.config.cjs'), joinPath(root, 'metro.config.mjs')]);

    projects.push(
      buildProject({
        projectRoot: root,

        platform: 'CROSS_PLATFORM',

        framework: 'REACT_NATIVE',

        packageId: android.packageId,

        bundleId: ios.bundleId,

        minOsVersion: android.minSdk ?? ios.minOsVersion,

        targetOsVersion: android.targetSdk,

        currentVersion: parsePackageVersion(fileAt(snapshot, packagePath)) ?? android.versionName ?? ios.version,

        currentBuildNumber: android.versionCode ?? ios.buildNumber,

        buildSystem: 'NODE',

        evidence: [
          packagePath,

          ...(metroPath ? [metroPath] : []),

          ...(android.packageId ? [joinPath(root, 'android')] : []),

          ...(ios.bundleId ? [joinPath(root, 'ios')] : []),
        ],
      }),
    );
  }

  /*
   * Kotlin Multiplatform
   */
  const kmpRoots = unique(
    Object.entries(snapshot.files)
      .filter(
        ([path, text]) =>
          /build\.gradle(?:\.kts)?$/.test(path) &&
          (/org\.jetbrains\.kotlin\.multiplatform/i.test(text) || /kotlin\s*\(\s*["']multiplatform["']\s*\)/i.test(text)),
      )
      .map(([path]) => parentPath(path)),
  );

  for (const root of kmpRoots) {
    if (flutterRoots.includes(root) || reactNativeRoots.includes(root)) {
      continue;
    }

    const gradlePath = firstExistingPath(snapshot, [joinPath(root, 'build.gradle.kts'), joinPath(root, 'build.gradle')]);

    const android = parseAndroid(snapshot, root);

    const ios = parseIos(snapshot, root);

    projects.push(
      buildProject({
        projectRoot: root,

        platform: 'CROSS_PLATFORM',

        framework: 'KMP',

        packageId: android.packageId,

        bundleId: ios.bundleId,

        minOsVersion: android.minSdk ?? ios.minOsVersion,

        targetOsVersion: android.targetSdk,

        currentVersion: android.versionName ?? ios.version,

        currentBuildNumber: android.versionCode ?? ios.buildNumber,

        buildSystem: 'GRADLE',

        evidence: gradlePath ? [gradlePath] : [],
      }),
    );
  }

  const crossRoots = unique([...flutterRoots, ...reactNativeRoots, ...kmpRoots]);

  /*
   * Native Android
   */
  const androidRoots = unique(paths.filter((path) => /(^|\/)settings\.gradle(?:\.kts)?$/.test(path)).map(parentPath));

  for (const root of androidRoots) {
    if (isInsideCrossPlatformRoot(root, crossRoots)) {
      continue;
    }

    if (kmpRoots.includes(root)) {
      continue;
    }

    const settingsPath = firstExistingPath(snapshot, [joinPath(root, 'settings.gradle.kts'), joinPath(root, 'settings.gradle')]);

    const gradlePath = firstExistingPath(snapshot, [
      joinPath(root, 'app/build.gradle.kts'),

      joinPath(root, 'app/build.gradle'),

      joinPath(root, 'build.gradle.kts'),

      joinPath(root, 'build.gradle'),
    ]);

    const manifest = firstPathMatching(snapshot, (path) => path.startsWith(root === '.' ? '' : `${root}/`) && path.endsWith('AndroidManifest.xml'));

    const metadata = parseAndroid(snapshot, root);

    projects.push(
      buildProject({
        projectRoot: root,

        platform: 'ANDROID',

        framework: 'ANDROID_NATIVE',

        packageId: metadata.packageId,

        minOsVersion: metadata.minSdk,

        targetOsVersion: metadata.targetSdk,

        currentVersion: metadata.versionName,

        currentBuildNumber: metadata.versionCode,

        buildSystem: 'GRADLE',

        evidence: [...(settingsPath ? [settingsPath] : []), ...(gradlePath ? [gradlePath] : []), ...(manifest ? [manifest] : [])],
      }),
    );
  }

  /*
   * Native iOS
   */
  const iosPbxProjects = paths.filter((path) => path.endsWith('.xcodeproj/project.pbxproj'));

  for (const pbxPath of iosPbxProjects) {
    const projectComponent = pbxPath.match(/^(.*?)(?:\/)?[^/]+\.xcodeproj\/project\.pbxproj$/);

    const root = projectComponent?.[1]?.replace(/\/$/, '') || '.';

    if (isInsideCrossPlatformRoot(root, crossRoots)) {
      continue;
    }

    const infoPlist = firstPathMatching(snapshot, (path) => path.startsWith(root === '.' ? '' : `${root}/`) && path.endsWith('Info.plist'));

    const podfile = firstExistingPath(snapshot, [joinPath(root, 'Podfile')]);

    const packageSwift = firstExistingPath(snapshot, [joinPath(root, 'Package.swift')]);

    const metadata = parseIos(snapshot, root);

    projects.push(
      buildProject({
        projectRoot: root,

        platform: 'IOS',

        framework: 'IOS_NATIVE',

        bundleId: metadata.bundleId,

        minOsVersion: metadata.minOsVersion,

        currentVersion: metadata.version,

        currentBuildNumber: metadata.buildNumber,

        buildSystem: packageSwift ? 'SWIFT_PACKAGE' : 'XCODE',

        evidence: [pbxPath, ...(infoPlist ? [infoPlist] : []), ...(podfile ? [podfile] : []), ...(packageSwift ? [packageSwift] : [])],
      }),
    );
  }

  /*
   * De-duplicate results.
   */
  const seen = new Set<string>();

  return projects.filter((project) => {
    const key = `${project.projectRoot}:` + `${project.framework}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
