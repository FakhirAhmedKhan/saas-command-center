import { detectCommands } from './command-detector';
import { detectFramework } from './framework-detector';
import type { ParsedPackageJson } from './package-json.types';
import { detectTechnologies } from './technology-detector';
import type { DetectedApplication, PackageManager } from '@command-center/shared-types';

const LIBRARY_NAME_PATTERNS = [
  /eslint-config/i,
  /^tsconfig/i,
  /^config$/i,
  /^shared-types$/i,
  /^shared$/i,
  /^types$/i,
  /^utils?$/i,
  /^ui$/i,
  /^validation$/i,
  /-config$/i,
  /^tooling$/i,
];

const LIBRARY_DIRECTORY_HINTS = [
  'packages/eslint-config',
  'packages/tsconfig',
  'packages/shared',
  'packages/shared-types',
  'packages/ui',
  'packages/config',
  'packages/utils',
  'packages/validation',
];

export interface ApplicationCandidate {
  rootDirectory: string;
  packageJson: ParsedPackageJson;
  hasTypescriptConfig: boolean;
  rootFileNames: ReadonlySet<string>;
}

export function detectApplication(candidate: ApplicationCandidate, packageManager: PackageManager): DetectedApplication {
  const { framework, language } = detectFramework(candidate.packageJson, candidate.hasTypescriptConfig);

  const commands = detectCommands(candidate.packageJson, packageManager);

  const technologies = detectTechnologies(candidate.packageJson, candidate.rootFileNames);

  const runnable = isRunnable(candidate, framework, commands);

  return {
    name: deriveApplicationName(candidate),
    rootDirectory: candidate.rootDirectory,
    framework,
    language,
    packageName: candidate.packageJson.name ?? null,
    commands,
    technologies,
    runnable,
    confidence: scoreConfidence(candidate, framework, commands, runnable),
  };
}

function deriveApplicationName(candidate: ApplicationCandidate): string {
  if (candidate.rootDirectory === '.') {
    return candidate.packageJson.name?.split('/').pop() ?? 'Application';
  }

  const segments = candidate.rootDirectory.split('/');

  const lastSegment = segments.at(-1) ?? candidate.rootDirectory;

  return titleCase(lastSegment);
}

function titleCase(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isRunnable(
  candidate: ApplicationCandidate,
  framework: string | null,
  commands: {
    dev?: string;
    start?: string;
    build?: string;
  },
): boolean {
  if (looksLikeLibrary(candidate)) {
    return false;
  }

  if (framework) {
    return true;
  }

  return Boolean(commands.dev || commands.start);
}

function looksLikeLibrary(candidate: ApplicationCandidate): boolean {
  const packageName = candidate.packageJson.name ?? '';

  const shortName = packageName.split('/').pop() ?? packageName;

  if (LIBRARY_NAME_PATTERNS.some((pattern) => pattern.test(shortName))) {
    return true;
  }

  const normalizedDirectory = candidate.rootDirectory.toLowerCase();

  if (LIBRARY_DIRECTORY_HINTS.some((hint) => normalizedDirectory === hint || normalizedDirectory.startsWith(`${hint}/`))) {
    return true;
  }

  return false;
}

function scoreConfidence(
  candidate: ApplicationCandidate,
  framework: string | null,
  commands: {
    dev?: string;
    start?: string;
    build?: string;
  },
  runnable: boolean,
): number {
  if (!runnable) {
    return 0.1;
  }

  let score = 0.4;

  if (framework) {
    score += 0.3;
  }

  if (commands.dev || commands.start) {
    score += 0.2;
  }

  if (candidate.rootDirectory.startsWith('apps/')) {
    score += 0.1;
  }

  return Math.min(1, Math.round(score * 100) / 100);
}
