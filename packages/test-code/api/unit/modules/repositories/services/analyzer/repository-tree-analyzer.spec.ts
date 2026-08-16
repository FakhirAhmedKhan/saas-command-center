import { directoryFileNamesFromTree, directoryOf, findPackageJsonPaths, rootFileNamesFromTree } from 'src/modules/repositories/services/analyzer/repository-tree-analyzer';
import type { GithubTreeEntry } from 'src/modules/repositories/services/github-code.service';

function file(path: string): GithubTreeEntry {
  return {
    path,
    type: 'file',
    sha: 'abc',
    size: 100,
  };
}

function directory(path: string): GithubTreeEntry {
  return {
    path,
    type: 'directory',
    sha: 'abc',
    size: null,
  };
}

describe('findPackageJsonPaths', () => {
  it('finds the root package.json for a single-app repository', () => {
    const entries = [file('package.json'), file('README.md'), file('src/index.ts')];

    expect(findPackageJsonPaths(entries)).toEqual(['package.json']);
  });

  it('finds nested package.json files for a monorepo', () => {
    const entries = [file('package.json'), file('apps/web/package.json'), file('apps/api/package.json'), file('packages/shared/package.json')];

    const result = findPackageJsonPaths(entries);

    expect(result).toEqual(expect.arrayContaining(['package.json', 'apps/web/package.json', 'apps/api/package.json', 'packages/shared/package.json']));
  });

  it('ignores package.json inside node_modules', () => {
    const entries = [file('package.json'), file('node_modules/some-lib/package.json')];

    expect(findPackageJsonPaths(entries)).toEqual(['package.json']);
  });

  it('ignores deeply nested package.json files beyond the depth cap', () => {
    const entries = [file('package.json'), file('a/b/c/d/e/package.json')];

    expect(findPackageJsonPaths(entries)).toEqual(['package.json']);
  });

  it('returns an empty array when there is no package.json', () => {
    const entries = [file('README.md'), directory('src')];

    expect(findPackageJsonPaths(entries)).toEqual([]);
  });
});

describe('rootFileNamesFromTree', () => {
  it('collects only top-level files', () => {
    const entries = [file('package.json'), file('README.md'), file('apps/web/package.json'), directory('apps')];

    expect(rootFileNamesFromTree(entries)).toEqual(new Set(['package.json', 'README.md']));
  });
});

describe('directoryFileNamesFromTree', () => {
  it('collects file names directly inside a given directory', () => {
    const entries = [file('apps/web/package.json'), file('apps/web/tsconfig.json'), file('apps/web/src/index.ts')];

    expect(directoryFileNamesFromTree(entries, 'apps/web')).toEqual(new Set(['package.json', 'tsconfig.json']));
  });
});

describe('directoryOf', () => {
  it('returns "." for a root-level file', () => {
    expect(directoryOf('package.json')).toBe('.');
  });

  it('returns the parent directory for a nested file', () => {
    expect(directoryOf('apps/web/package.json')).toBe('apps/web');
  });
});
