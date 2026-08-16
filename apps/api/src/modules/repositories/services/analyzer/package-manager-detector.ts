import type { PackageManager } from '@command-center/shared-types';

const LOCKFILE_MANAGERS: Array<{
  fileName: string;
  packageManager: PackageManager;
}> = [
  {
    fileName: 'pnpm-lock.yaml',
    packageManager: 'pnpm',
  },
  {
    fileName: 'bun.lock',
    packageManager: 'bun',
  },
  {
    fileName: 'bun.lockb',
    packageManager: 'bun',
  },
  {
    fileName: 'yarn.lock',
    packageManager: 'yarn',
  },
  {
    fileName: 'package-lock.json',
    packageManager: 'npm',
  },
];

/**
 * Detects the package manager from lockfile presence at the repository
 * root. Order matters: pnpm/bun are checked before yarn/npm because a
 * stale package-lock.json can coexist with the lockfile that is
 * actually authoritative.
 */
export function detectPackageManager(rootFileNames: ReadonlySet<string>, packageManagerField?: string | null): PackageManager {
  const fromField = detectFromPackageJsonField(packageManagerField);

  if (fromField) {
    return fromField;
  }

  for (const candidate of LOCKFILE_MANAGERS) {
    if (rootFileNames.has(candidate.fileName)) {
      return candidate.packageManager;
    }
  }

  return 'unknown';
}

function detectFromPackageJsonField(value?: string | null): PackageManager | null {
  if (!value) {
    return null;
  }

  const name = value.split('@')[0]?.trim().toLowerCase();

  if (name === 'pnpm' || name === 'npm' || name === 'yarn' || name === 'bun') {
    return name;
  }

  return null;
}
