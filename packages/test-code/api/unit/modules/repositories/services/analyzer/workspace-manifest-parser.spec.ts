import { parsePackageJsonWorkspaceGlobs, parsePnpmWorkspaceGlobs } from 'src/modules/repositories/services/analyzer/workspace-manifest-parser';

describe('parsePnpmWorkspaceGlobs', () => {
  it('extracts quoted globs from a standard pnpm-workspace.yaml', () => {
    const yaml = ["packages:", "  - 'apps/*'", "  - 'packages/*'", '', 'nodeLinker: hoisted'].join('\n');

    expect(parsePnpmWorkspaceGlobs(yaml)).toEqual(['apps/*', 'packages/*']);
  });

  it('handles double-quoted and unquoted entries', () => {
    const yaml = ['packages:', '  - "apps/*"', '  - packages/*'].join('\n');

    expect(parsePnpmWorkspaceGlobs(yaml)).toEqual(['apps/*', 'packages/*']);
  });

  it('stops collecting once the list ends', () => {
    const yaml = ['packages:', "  - 'apps/*'", 'allowBuilds:', "  '@prisma/engines': true"].join('\n');

    expect(parsePnpmWorkspaceGlobs(yaml)).toEqual(['apps/*']);
  });

  it('returns an empty array when there is no packages key', () => {
    expect(parsePnpmWorkspaceGlobs('nodeLinker: hoisted')).toEqual([]);
  });
});

describe('parsePackageJsonWorkspaceGlobs', () => {
  it('reads a plain array workspaces field', () => {
    expect(parsePackageJsonWorkspaceGlobs({ workspaces: ['apps/*', 'packages/*'] })).toEqual(['apps/*', 'packages/*']);
  });

  it('reads an object-shaped workspaces field', () => {
    expect(
      parsePackageJsonWorkspaceGlobs({
        workspaces: {
          packages: ['apps/*'],
        },
      }),
    ).toEqual(['apps/*']);
  });

  it('returns an empty array when workspaces is absent', () => {
    expect(parsePackageJsonWorkspaceGlobs({})).toEqual([]);
  });
});
