import { DesktopAppsService } from './desktop-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import { RepositoriesService } from '../../repositories/services/repositories.service';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class DesktopRepositoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopAppsService: DesktopAppsService,
    private readonly repositoriesService: RepositoriesService,
  ) {}

  /**
   * Return the repository currently linked to this desktop application.
   *
   * RepositoryConnection is linked to the parent SaasApplication,
   * not directly to DesktopApplication.
   */
  async getLinkedRepository(workspaceId: string, desktopAppId: string) {
    const desktopApp = await this.desktopAppsService.findOne(workspaceId, desktopAppId);
    const linkedRepository = await this.prisma.repositoryConnection.findFirst({
      where: {
        workspaceId,

        applicationId: desktopApp.applicationId,

        isAvailable: true,
      },

      select: {
        id: true,
      },

      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!linkedRepository) {
      return null;
    }

    return this.repositoriesService.findOne(workspaceId, linkedRepository.id);
  }

  /**
   * Link or change the repository used by this desktop application.
   *
   * A desktop app has one primary repository in this feature.
   * Changing the repository therefore removes an older link belonging
   * to the same SaasApplication inside the same transaction.
   */
  async link(workspaceId: string, desktopAppId: string, repositoryId: string) {
    const desktopApp = await this.desktopAppsService.findOne(workspaceId, desktopAppId);

    if (desktopApp.application.archivedAt) {
      throw new BadRequestException('Archived desktop applications cannot link repositories.');
    }

    /*
     * findOne is workspace-scoped.
     *
     * A repository ID belonging to another workspace therefore
     * cannot be used to escape workspace isolation.
     */
    const repository = await this.repositoriesService.findOne(workspaceId, repositoryId);

    if (repository.archived) {
      throw new BadRequestException('Archived repositories cannot be linked.');
    }

    if (!repository.isAvailable) {
      throw new BadRequestException('Unavailable repositories cannot be linked.');
    }

    /*
     * Do not silently steal a repository from another application.
     */
    if (repository.applicationId && repository.applicationId !== desktopApp.applicationId) {
      throw new ConflictException('Repository is already linked to another application.');
    }

    await this.prisma.$transaction(async (transaction) => {
      /*
       * Remove any previous primary repository from this
       * desktop application's parent SaasApplication.
       */
      await transaction.repositoryConnection.updateMany({
        where: {
          workspaceId,

          applicationId: desktopApp.applicationId,

          id: {
            not: repositoryId,
          },
        },

        data: {
          applicationId: null,
        },
      });

      /*
       * Link the selected repository.
       */
      await transaction.repositoryConnection.update({
        where: {
          id: repositoryId,
        },

        data: {
          applicationId: desktopApp.applicationId,
        },
      });
    });

    return this.repositoriesService.findOne(workspaceId, repositoryId);
  }

  /**
   * Remove the repository relationship.
   */
  async unlink(workspaceId: string, desktopAppId: string) {
    const desktopApp = await this.desktopAppsService.findOne(workspaceId, desktopAppId);

    await this.prisma.repositoryConnection.updateMany({
      where: {
        workspaceId,

        applicationId: desktopApp.applicationId,
      },

      data: {
        applicationId: null,
      },
    });

    return {
      success: true as const,
    };
  }
}
