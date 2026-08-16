import type { ParsedPackageJson } from './package-json.types';

/**
 * Extracts the `packages:` glob list from a pnpm-workspace.yaml file
 * without pulling in a full YAML parser. Only the shape pnpm itself
 * generates is supported: a top-level `packages:` key followed by a
 * simple list of single- or double-quoted (or bare) glob strings.
 */
export function parsePnpmWorkspaceGlobs(yamlContent: string): string[] {
  const lines = yamlContent.split(/\r?\n/);

  const globs: string[] = [];

  let inPackagesList = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '');

    if (/^packages:\s*$/.test(line.trim())) {
      inPackagesList = true;

      continue;
    }

    if (inPackagesList) {
      const itemMatch = /^\s*-\s*(.+)\s*$/.exec(line);

      if (itemMatch) {
        const value = (itemMatch[1] ?? '').trim().replace(/^['"]|['"]$/g, '');

        if (value) {
          globs.push(value);
        }

        continue;
      }

      if (line.trim().length === 0) {
        continue;
      }

      inPackagesList = false;
    }
  }

  return globs;
}

export function parsePackageJsonWorkspaceGlobs(packageJson: ParsedPackageJson): string[] {
  if (!packageJson.workspaces) {
    return [];
  }

  if (Array.isArray(packageJson.workspaces)) {
    return packageJson.workspaces;
  }

  return packageJson.workspaces.packages ?? [];
}
