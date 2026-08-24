import { DesktopRepositoryService } from './desktop-repository.service';
import { DesktopProjectDetector, type DesktopRepositorySnapshot } from './desktop-project-detector';
import { GithubCodeService } from '../../repositories/services/github-code.service';
import { BadRequestException, Injectable } from '@nestjs/common';

const MAX_METADATA_FILES = 80;
const MAX_METADATA_FILE_SIZE = 300_000;

@Injectable()
export class DesktopProjectDetectionService {
  private readonly detector = new DesktopProjectDetector();

  constructor(
    private readonly desktopRepositories: DesktopRepositoryService,
    private readonly githubCode: GithubCodeService,
  ) {}

  async detect(workspaceId: string, desktopAppId: string) {
    const repository = await this.desktopRepositories.getLinkedRepository(workspaceId, desktopAppId);

    if (!repository) {
      throw new BadRequestException('Connect a repository before running desktop project detection.');
    }

    if (repository.archived || !repository.isAvailable) {
      throw new BadRequestException('The linked repository is not available for desktop project detection.');
    }

    const tree = await this.githubCode.getTree(repository.installation.externalInstallationId, repository.owner, repository.name, repository.defaultBranch);

    const paths = tree.entries.filter((entry) => entry.type === 'file').map((entry) => entry.path);

    const candidateEntries = tree.entries.filter(
      (entry) =>
        entry.type === 'file' && this.isDetectionFile(entry.path) && (entry.size === null || entry.size === undefined || entry.size <= MAX_METADATA_FILE_SIZE),
    );

    const selectedEntries = candidateEntries.slice(0, MAX_METADATA_FILES);

    const files: Record<string, string> = {};

    for (const entry of selectedEntries) {
      try {
        const file = await this.githubCode.getFile(
          repository.installation.externalInstallationId,
          repository.owner,
          repository.name,
          entry.path,
          repository.defaultBranch,
        );

        if (file.size > MAX_METADATA_FILE_SIZE) {
          continue;
        }

        files[entry.path] = file.content;
      } catch {
        // Missing/deleted/unreadable metadata must not crash the full detection pass.
      }
    }

    // Xcode project metadata is inside *.xcodeproj/project.pbxproj.
    const xcodeProjectFiles = tree.entries
      .filter((entry) => entry.type === 'file' && /(^|\/)[^/]+\.xcodeproj\/project\.pbxproj$/i.test(entry.path) && !files[entry.path])
      .slice(0, Math.max(0, MAX_METADATA_FILES - Object.keys(files).length));

    for (const entry of xcodeProjectFiles) {
      try {
        const file = await this.githubCode.getFile(
          repository.installation.externalInstallationId,
          repository.owner,
          repository.name,
          entry.path,
          repository.defaultBranch,
        );

        if (file.size <= MAX_METADATA_FILE_SIZE) {
          files[entry.path] = file.content;
        }
      } catch {
        // Safe degradation.
      }
    }

    // Swing does not require a special build dependency, so inspect a small,
    // bounded source sample as well. This lets the pure detector find imports
    // such as javax.swing without downloading the entire repository.
    const javaSourceFiles = tree.entries
      .filter(
        (entry) =>
          entry.type === 'file' &&
          /\.(java|kt)$/i.test(entry.path) &&
          !files[entry.path] &&
          (entry.size === null || entry.size === undefined || entry.size <= MAX_METADATA_FILE_SIZE),
      )
      .slice(0, 20);

    for (const entry of javaSourceFiles) {
      try {
        const file = await this.githubCode.getFile(
          repository.installation.externalInstallationId,
          repository.owner,
          repository.name,
          entry.path,
          repository.defaultBranch,
        );

        if (file.size <= MAX_METADATA_FILE_SIZE) {
          files[entry.path] = file.content;
        }
      } catch {
        // Safe degradation.
      }
    }

    const snapshot: DesktopRepositorySnapshot = {
      repositoryId: repository.id,
      repositoryFullName: repository.fullName,
      branch: repository.defaultBranch,
      truncated: tree.truncated || candidateEntries.length > MAX_METADATA_FILES,
      paths,
      files,
    };

    return this.detector.detect(snapshot);
  }

  private isDetectionFile(path: string): boolean {
    return (
      /(^|\/)package\.json$/i.test(path) ||
      /(^|\/)src-tauri\/tauri\.conf\.(json|json5)$/i.test(path) ||
      /(^|\/)src-tauri\/Cargo\.toml$/i.test(path) ||
      /\.(csproj|fsproj|vbproj|sln)$/i.test(path) ||
      /(^|\/)CMakeLists\.txt$/i.test(path) ||
      /\.pro$/i.test(path) ||
      /(^|\/)(pom\.xml|build\.gradle|build\.gradle\.kts)$/i.test(path) ||
      /(^|\/)[^/]+\.xcodeproj\/project\.pbxproj$/i.test(path)
    );
  }
}
