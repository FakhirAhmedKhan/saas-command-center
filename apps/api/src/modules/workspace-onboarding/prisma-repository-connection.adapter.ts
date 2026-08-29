import { type RepositoryConnectionPort, type VerifiedRepositorySelection } from './repository-connection.port';
import type { Prisma } from '../../generated/prisma/client';
import { ApplicationLinkType, RepositoryProvider } from '../../generated/prisma/enums';
import { PersonalRepositoriesService } from '../repositories/services/personal-repositories.service';
import type { WorkspaceApplicationType, WorkspaceBlueprintRepository } from '@command-center/shared-types';
import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';

@Injectable()
export class PrismaRepositoryConnectionAdapter implements RepositoryConnectionPort {
  constructor(private readonly personalRepositories: PersonalRepositoriesService) {}

  async verifySelection(userId: string, repositories: WorkspaceBlueprintRepository[]): Promise<VerifiedRepositorySelection[]> {
    const selections = repositories.filter(({ strategy }) => strategy === 'CONNECT_NOW');
    const repositoryIds = new Set<string>();
    const applicationTypes = new Set<WorkspaceApplicationType>();

    for (const selection of selections) {
      if (!selection.repositoryId || !/^[1-9]\d{0,15}$/.test(selection.repositoryId)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_REPOSITORY_SELECTION',
          message: 'CONNECT_NOW requires a valid GitHub repository ID',
        });
      }

      if (repositoryIds.has(selection.repositoryId)) {
        throw new UnprocessableEntityException({
          code: 'DUPLICATE_REPOSITORY_SELECTION',
          message: 'A GitHub repository may only be connected once',
        });
      }

      if (applicationTypes.has(selection.applicationType)) {
        throw new UnprocessableEntityException({
          code: 'DUPLICATE_APPLICATION_REPOSITORY',
          message: 'Each application may have only one selected repository',
        });
      }

      repositoryIds.add(selection.repositoryId);
      applicationTypes.add(selection.applicationType);
    }

    return Promise.all(
      selections.map(async (selection) => {
        const numericRepositoryId = Number(selection.repositoryId);

        if (!Number.isSafeInteger(numericRepositoryId) || numericRepositoryId < 1) {
          throw new UnprocessableEntityException({
            code: 'INVALID_REPOSITORY_SELECTION',
            message: 'The selected GitHub repository ID is invalid',
          });
        }

        /*
         * This call verifies that the repository belongs to a GitHub
         * installation currently accessible by this exact user.
         * Client-supplied names, URLs and installation IDs are ignored.
         */
        const verified = await this.personalRepositories.findRepository(userId, numericRepositoryId);

        return {
          repositoryId: String(verified.repository.id),
          applicationType: selection.applicationType,
          installationId: verified.installationId,
          owner: verified.repository.owner.login,
          name: verified.repository.name,
          fullName: verified.repository.fullName,
          defaultBranch: verified.repository.defaultBranch,
          isPrivate: verified.repository.private,
          htmlUrl: verified.repository.htmlUrl,
        };
      }),
    );
  }

  async connectVerified(input: {
    transaction: Prisma.TransactionClient;
    userId: string;
    workspaceId: string;
    applicationIds: Partial<Record<WorkspaceApplicationType, string>>;
    repositories: VerifiedRepositorySelection[];
  }): Promise<void> {
    const synchronizedAt = new Date();

    for (const repository of input.repositories) {
      const applicationId = input.applicationIds[repository.applicationType];

      if (!applicationId) {
        throw new ConflictException(`Application ${repository.applicationType} was not created`);
      }

      const installation = await input.transaction.repositoryInstallation.upsert({
        where: {
          workspaceId_provider_externalInstallationId: {
            workspaceId: input.workspaceId,
            provider: RepositoryProvider.GITHUB,
            externalInstallationId: repository.installationId,
          },
        },
        create: {
          workspaceId: input.workspaceId,
          provider: RepositoryProvider.GITHUB,
          externalInstallationId: repository.installationId,
          accountLogin: repository.owner,
          accountType: 'Unknown',
          connectedById: input.userId,
          connectedAt: synchronizedAt,
          lastSyncedAt: synchronizedAt,
        },
        update: {
          accountLogin: repository.owner,
          connectedById: input.userId,
          lastSyncedAt: synchronizedAt,
        },
      });

      await input.transaction.repositoryConnection.create({
        data: {
          workspaceId: input.workspaceId,
          installationId: installation.id,
          applicationId,
          provider: RepositoryProvider.GITHUB,
          externalRepoId: repository.repositoryId,
          owner: repository.owner,
          name: repository.name,
          fullName: repository.fullName,
          defaultBranch: repository.defaultBranch,
          isPrivate: repository.isPrivate,
          htmlUrl: repository.htmlUrl,
          lastSyncedAt: synchronizedAt,
        },
      });

      await input.transaction.applicationLink.create({
        data: {
          applicationId,
          label: 'Repository',
          type: ApplicationLinkType.REPOSITORY,
          url: repository.htmlUrl,
        },
      });
    }
  }
}
