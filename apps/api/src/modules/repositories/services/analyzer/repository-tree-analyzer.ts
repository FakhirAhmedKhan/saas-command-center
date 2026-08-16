import type { GithubTreeEntry } from '../github-code.service';

const MAX_PACKAGE_JSON_CANDIDATES = 25;

const MAX_PATH_DEPTH = 4;

/**
 * Finds every package.json in the tree up to a bounded depth, so a huge
 * or adversarial repository cannot force unbounded downstream file
 * reads. Root package.json (depth 0) is always included when present.
 */
export function findPackageJsonPaths(entries: readonly GithubTreeEntry[]): string[] {
  const matches = entries.filter((entry) => entry.type === 'file' && entry.path.split('/').pop() === 'package.json' && !isInsideIgnoredDirectory(entry.path) && pathDepth(entry.path) <= MAX_PATH_DEPTH);

  matches.sort((left, right) => pathDepth(left.path) - pathDepth(right.path) || left.path.localeCompare(right.path));

  return matches.slice(0, MAX_PACKAGE_JSON_CANDIDATES).map((entry) => entry.path);
}

export function rootFileNamesFromTree(entries: readonly GithubTreeEntry[]): Set<string> {
  const names = new Set<string>();

  for (const entry of entries) {
    if (entry.type === 'file' && !entry.path.includes('/')) {
      names.add(entry.path);
    }
  }

  return names;
}

export function directoryFileNamesFromTree(entries: readonly GithubTreeEntry[], directory: string): Set<string> {
  const prefix = directory === '.' ? '' : `${directory}/`;

  const names = new Set<string>();

  for (const entry of entries) {
    if (entry.type !== 'file' || !entry.path.startsWith(prefix)) {
      continue;
    }

    const remainder = entry.path.slice(prefix.length);

    if (remainder.length > 0 && !remainder.includes('/')) {
      names.add(remainder);
    }
  }

  return names;
}

export function directoryOf(packageJsonPath: string): string {
  const slash = packageJsonPath.lastIndexOf('/');

  return slash === -1 ? '.' : packageJsonPath.slice(0, slash);
}

function pathDepth(path: string): number {
  return path.split('/').length - 1;
}

function isInsideIgnoredDirectory(path: string): boolean {
  const segments = path.split('/');

  return segments.some((segment) => segment === 'node_modules' || segment === '.git' || segment === 'dist' || segment === 'build' || segment === '.next' || segment === '.turbo');
}
