export interface ParsedPackageJson {
  name?: string;
  description?: string;
  version?: string;
  private?: boolean;
  packageManager?: string;
  main?: string;
  bin?: string | Record<string, string>;
  workspaces?: string[] | { packages?: string[] };

  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function collectDependencyNames(packageJson: ParsedPackageJson): Set<string> {
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
  ]);
}
