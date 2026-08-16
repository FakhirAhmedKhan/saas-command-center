import { GithubAppService } from './github-app.service';
import { PersonalGithubConnectService } from './personal-github-connect.service';
import type { ImportableGithubInstallation, ImportableGithubRepository, ImportableRepositoryListResponse } from '@command-center/shared-types';
import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class PersonalRepositoriesService {
  constructor(
    private readonly personalGithubConnect: PersonalGithubConnectService,
    private readonly githubApp: GithubAppService,
  ) {}

  async list(userId: string): Promise<ImportableRepositoryListResponse> {
    const installationIds = await this.personalGithubConnect.listAccessibleInstallationIds(userId);

    const installations: ImportableGithubInstallation[] = [];

    const repositories: ImportableGithubRepository[] = [];

    for (const installationId of installationIds) {
      const [installation, installationRepositories] = await Promise.all([
        this.githubApp.getInstallation(installationId),
        this.githubApp.listImportableInstallationRepositories(installationId),
      ]);

      installations.push(installation);

      for (const repository of installationRepositories) {
        repositories.push({
          id: repository.id,
          name: repository.name,
          fullName: repository.fullName,
          description: repository.description,
          private: repository.isPrivate,
          defaultBranch: repository.defaultBranch,
          htmlUrl: repository.htmlUrl,
          updatedAt: repository.updatedAt,
          owner: repository.owner,
        });
      }
    }

    repositories.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return {
      installations,
      repositories,
    };
  }

  async findRepository(
    userId: string,
    repositoryId: number,
  ): Promise<{
    installationId: string;
    repository: ImportableGithubRepository;
  }> {
    const installationIds = await this.personalGithubConnect.listAccessibleInstallationIds(userId);

    for (const installationId of installationIds) {
      const repositories = await this.githubApp.listImportableInstallationRepositories(installationId);

      const match = repositories.find((repository) => repository.id === repositoryId);

      if (match) {
        return {
          installationId,
          repository: {
            id: match.id,
            name: match.name,
            fullName: match.fullName,
            description: match.description,
            private: match.isPrivate,
            defaultBranch: match.defaultBranch,
            htmlUrl: match.htmlUrl,
            updatedAt: match.updatedAt,
            owner: match.owner,
          },
        };
      }
    }

    throw new ForbiddenException('Repository is not accessible through any connected GitHub installation.');
  }
}
