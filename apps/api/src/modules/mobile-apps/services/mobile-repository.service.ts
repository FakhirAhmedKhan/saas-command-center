import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { RepositoriesService } from '../../repositories/services/repositories.service';

import { MobileAppsService } from './mobile-apps.service';

@Injectable()
export class MobileRepositoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mobileAppsService: MobileAppsService,
    private readonly repositoriesService: RepositoriesService,
  ) {}

  async getLinkedRepository(workspaceId: string, mobileAppId: string) {
    const mobileApp = await this.mobileAppsService.findOne(workspaceId, mobileAppId);

    const linked = await this.prisma.repositoryConnection.findFirst({
      where: {
        workspaceId,
        applicationId: mobileApp.applicationId,
        isAvailable: true,
      },

      select: {
        id: true,
      },

      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!linked) {
      return null;
    }

    return this.repositoriesService.findOne(workspaceId, linked.id);
  }

  async link(workspaceId: string, mobileAppId: string, repositoryId: string) {
    const mobileApp = await this.mobileAppsService.findOne(workspaceId, mobileAppId);

    if (mobileApp.application.archivedAt) {
      throw new BadRequestException('Archived mobile applications cannot link repositories.');
    }

    const repository = await this.repositoriesService.findOne(workspaceId, repositoryId);

    if (repository.archived) {
      throw new BadRequestException('Archived repositories cannot be linked.');
    }

    if (repository.applicationId && repository.applicationId !== mobileApp.applicationId) {
      throw new ConflictException('Repository is already linked to another application.');
    }

    await this.prisma.$transaction(async (transaction) => {
      /*
       * Mobile applications use one primary repository.
       *
       * Remove any previous repository association for
       * this mobile application's parent SaasApplication.
       */
      await transaction.repositoryConnection.updateMany({
        where: {
          workspaceId,
          applicationId: mobileApp.applicationId,

          id: {
            not: repositoryId,
          },
        },

        data: {
          applicationId: null,
        },
      });

      await transaction.repositoryConnection.update({
        where: {
          id: repositoryId,
        },

        data: {
          applicationId: mobileApp.applicationId,
        },
      });
    });

    return this.repositoriesService.findOne(workspaceId, repositoryId);
  }

  async unlink(workspaceId: string, mobileAppId: string) {
    const mobileApp = await this.mobileAppsService.findOne(workspaceId, mobileAppId);

    await this.prisma.repositoryConnection.updateMany({
      where: {
        workspaceId,
        applicationId: mobileApp.applicationId,
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
