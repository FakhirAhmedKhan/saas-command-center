import { detectApplication, type ApplicationCandidate } from './analyzer/application-detector';
import type { ParsedPackageJson } from './analyzer/package-json.types';
import { detectPackageManager } from './analyzer/package-manager-detector';
import { directoryFileNamesFromTree, directoryOf, findPackageJsonPaths, rootFileNamesFromTree } from './analyzer/repository-tree-analyzer';
import { parsePackageJsonWorkspaceGlobs, parsePnpmWorkspaceGlobs } from './analyzer/workspace-manifest-parser';
import { suggestWorkspace } from './analyzer/workspace-suggestion';
import { GithubCodeService } from './github-code.service';
import { PersonalRepositoriesService } from './personal-repositories.service';
import type { DetectedApplication, RepositoryAnalysisResult, RepositoryType } from '@command-center/shared-types';
import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';

const MAX_FILE_READS = 25;
const MAX_ANALYZED_FILE_BYTES = 1_000_000;
const TYPESCRIPT_CONFIG_FILES = ['tsconfig.json'];

@Injectable()
export class RepositoryAnalyzerService {
  constructor(
    private readonly personalRepositories: PersonalRepositoriesService,
    private readonly githubCode: GithubCodeService,
  ) {}

  async analyze(userId: string, repositoryId: number): Promise<RepositoryAnalysisResult> {
    const { installationId, repository } = await this.personalRepositories.findRepository(userId, repositoryId);
    const branch = this.cleanBranch(repository.defaultBranch);
    const tree = await this.githubCode.getTree(installationId, repository.owner.login, repository.name, branch);
    const rootFileNames = rootFileNamesFromTree(tree.entries);
    const packageJsonPaths = findPackageJsonPaths(tree.entries);

    if (packageJsonPaths.length === 0) {
      throw new UnprocessableEntityException('No package.json was found in this repository. Only Node.js-based projects can be imported automatically.');
    }

    if (packageJsonPaths.length > MAX_FILE_READS) {
      packageJsonPaths.length = MAX_FILE_READS;
    }

    const packageJsonByPath = new Map<string, ParsedPackageJson>();

    for (const path of packageJsonPaths) {
      const parsed = await this.readPackageJson(installationId, repository.owner.login, repository.name, branch, path);

      if (parsed) {
        packageJsonByPath.set(path, parsed);
      }
    }

    const rootPackageJson = packageJsonByPath.get('package.json') ?? null;
    const packageManager = detectPackageManager(rootFileNames, rootPackageJson?.packageManager);
    const workspaceGlobs = await this.resolveWorkspaceGlobs(installationId, repository.owner.login, repository.name, branch, rootFileNames, rootPackageJson);
    const repositoryType: RepositoryType = workspaceGlobs.length > 0 || packageJsonByPath.size > 1 ? 'monorepo' : 'single-app';
    const applications: DetectedApplication[] = [];

    for (const [path, packageJson] of packageJsonByPath) {
      const rootDirectory = directoryOf(path);
      const directoryFileNames = rootDirectory === '.' ? rootFileNames : directoryFileNamesFromTree(tree.entries, rootDirectory);
      const hasTypescriptConfig = TYPESCRIPT_CONFIG_FILES.some((fileName) => directoryFileNames.has(fileName));
      const candidate: ApplicationCandidate = {
        rootDirectory,
        packageJson,
        hasTypescriptConfig,
        rootFileNames: directoryFileNames,
      };

      applications.push(detectApplication(candidate, packageManager));
    }

    applications.sort((left, right) => right.confidence - left.confidence || left.rootDirectory.localeCompare(right.rootDirectory));

    if (repositoryType === 'single-app' && applications.every((application) => !application.runnable)) {
      throw new UnprocessableEntityException('This repository does not appear to contain a runnable Node.js application.');
    }

    const suggestedWorkspace = suggestWorkspace(repository.name, repository.description, rootPackageJson?.description ?? null);

    return {
      repository: {
        id: repository.id,
        installationId,
        owner: repository.owner.login,
        name: repository.name,
        fullName: repository.fullName,
        defaultBranch: branch,
        htmlUrl: repository.htmlUrl,
        private: repository.private,
      },

      repositoryType,
      suggestedWorkspace,
      packageManager,
      applications,
      analyzedAt: new Date().toISOString(),
    };
  }

  private async resolveWorkspaceGlobs(installationId: string, owner: string, name: string, branch: string, rootFileNames: ReadonlySet<string>, rootPackageJson: ParsedPackageJson | null): Promise<string[]> {
    if (rootFileNames.has('pnpm-workspace.yaml')) {
      const file = await this.githubCode.getFile(installationId, owner, name, 'pnpm-workspace.yaml', branch);
      const content = file && file.size <= MAX_ANALYZED_FILE_BYTES ? this.decodeTextFile(file) : null;

      if (content) {
        const globs = parsePnpmWorkspaceGlobs(content);

        if (globs.length > 0) {
          return globs;
        }
      }
    }

    if (rootPackageJson) {
      const globs = parsePackageJsonWorkspaceGlobs(rootPackageJson);

      if (globs.length > 0) {
        return globs;
      }
    }

    if (rootFileNames.has('turbo.json') || rootFileNames.has('nx.json')) {
      return ['apps/*', 'packages/*'];
    }

    return [];
  }

  private async readPackageJson(installationId: string, owner: string, name: string, branch: string, path: string): Promise<ParsedPackageJson | null> {
    const file = await this.githubCode.getFile(installationId, owner, name, path, branch);

    if (!file || file.size > MAX_ANALYZED_FILE_BYTES) {
      return null;
    }

    const content = this.decodeTextFile(file);

    if (!content) {
      return null;
    }

    return this.parsePackageJsonSafely(content);
  }

  private decodeTextFile(file: Awaited<ReturnType<GithubCodeService['getFile']>>): string | null {
    if (!file || file.encoding !== 'base64' || !file.content) {
      return null;
    }

    try {
      return Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8');
    } catch {
      return null;
    }
  }

  /**
   * package.json content comes from an untrusted repository. It is
   * parsed for static field inspection only -- never evaluated,
   * required, or used to drive any shell/build command.
   */
  private parsePackageJsonSafely(content: string): ParsedPackageJson | null {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  }

  private cleanBranch(branch: string): string {
    const value = branch.trim();

    if (!value || value.length > 255 || value.includes('\0')) {
      throw new BadRequestException('Invalid branch name.');
    }

    return value;
  }
}
