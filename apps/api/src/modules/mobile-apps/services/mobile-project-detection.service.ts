import { detectMobileProjects, type MobileRepositorySnapshot } from './mobile-project-detector';
import { MobileRepositoryService } from './mobile-repository.service';
import { GithubCodeService, type GithubRepositoryContent } from '../../repositories/services/github-code.service';
import type { MobileProjectDetectionResponse } from '@command-center/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';

const MAX_METADATA_FILE_SIZE = 300_000;

const MAX_METADATA_FILES = 80;

@Injectable()
export class MobileProjectDetectionService {
  constructor(
    private readonly mobileRepositories: MobileRepositoryService,

    private readonly githubCode: GithubCodeService,
  ) {}

  async detect(workspaceId: string, mobileAppId: string): Promise<MobileProjectDetectionResponse> {
    const repository = await this.mobileRepositories.getLinkedRepository(workspaceId, mobileAppId);

    if (!repository) {
      throw new BadRequestException('Connect a repository before running mobile project detection.');
    }

    if (repository.archived) {
      throw new BadRequestException('Archived repositories cannot be analyzed.');
    }

    const tree = await this.githubCode.getTree(
      repository.installation.externalInstallationId,

      repository.owner,

      repository.name,

      repository.defaultBranch,
    );

    const paths = tree.entries.filter((entry) => entry.type === 'file').map((entry) => entry.path);

    const candidateEntries = tree.entries.filter((entry) => entry.type === 'file' && this.isDetectionFile(entry.path));

    const warnings: string[] = [];

    const selectedEntries = candidateEntries.slice(0, MAX_METADATA_FILES);

    if (candidateEntries.length > MAX_METADATA_FILES) {
      warnings.push(`Repository contains more than ${MAX_METADATA_FILES} relevant metadata files. Detection was limited.`);
    }

    const files: Record<string, string> = {};

    for (const entry of selectedEntries) {
      if (entry.size !== null && entry.size !== undefined && entry.size > MAX_METADATA_FILE_SIZE) {
        warnings.push(`${entry.path} was skipped because it exceeds the metadata file size limit.`);

        continue;
      }

      try {
        const file = await this.githubCode.getFile(
          repository.installation.externalInstallationId,

          repository.owner,

          repository.name,

          entry.path,

          repository.defaultBranch,
        );

        if (!file) {
          continue;
        }

        if (file.size > MAX_METADATA_FILE_SIZE) {
          warnings.push(`${entry.path} was skipped because it exceeds the metadata file size limit.`);

          continue;
        }

        const text = this.decodeFile(file);

        if (text !== null) {
          files[entry.path] = text;
        }
      } catch {
        warnings.push(`${entry.path} could not be read.`);
      }
    }

    const snapshot: MobileRepositorySnapshot = {
      paths,

      files,

      truncated: tree.truncated || candidateEntries.length > MAX_METADATA_FILES,
    };

    const projects = detectMobileProjects(snapshot);

    const sorted = [...projects].sort((a, b) => {
      const confidenceScore = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      const difference = confidenceScore[b.confidence] - confidenceScore[a.confidence];

      if (difference !== 0) {
        return difference;
      }

      return a.projectRoot.length - b.projectRoot.length;
    });

    return {
      repository: {
        id: repository.id,

        fullName: repository.fullName,

        defaultBranch: repository.defaultBranch,
      },

      mobileDetected: sorted.length > 0,

      primaryProject: sorted[0] ?? null,

      projects: sorted,

      truncated: snapshot.truncated,

      warnings,
    };
  }

  private isDetectionFile(path: string): boolean {
    const normalized = path.toLowerCase();

    return (
      normalized.endsWith('pubspec.yaml') ||
      normalized.endsWith('package.json') ||
      /metro\.config\.(?:js|cjs|mjs)$/.test(normalized) ||
      /settings\.gradle(?:\.kts)?$/.test(normalized) ||
      /build\.gradle(?:\.kts)?$/.test(normalized) ||
      normalized.endsWith('androidmanifest.xml') ||
      normalized.endsWith('info.plist') ||
      normalized.endsWith('podfile') ||
      normalized.endsWith('package.swift') ||
      normalized.endsWith('project.pbxproj')
    );
  }

  private decodeFile(file: GithubRepositoryContent): string | null {
    if (!file.content) {
      return null;
    }

    if (file.encoding === 'base64') {
      try {
        return Buffer.from(
          file.content.replace(/\s+/g, ''),

          'base64',
        ).toString('utf8');
      } catch {
        return null;
      }
    }

    return file.content;
  }
}
