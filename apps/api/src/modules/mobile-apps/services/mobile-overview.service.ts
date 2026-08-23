import { MobileAppsService } from './mobile-apps.service';
import { MobileBuildsService } from './mobile-builds.service';
import { MobileReleasesService } from './mobile-releases.service';
import { PrismaService } from '../../../database/prisma.service';
import type { MobileAppOverview } from '@command-center/shared-types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MobileOverviewService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly mobileAppsService: MobileAppsService,

    private readonly mobileBuildsService: MobileBuildsService,

    private readonly mobileReleasesService: MobileReleasesService,
  ) {}

  async getOverview(workspaceId: string, mobileAppId: string): Promise<MobileAppOverview> {
    const mobileApp = await this.mobileAppsService.findOne(workspaceId, mobileAppId);

    const repository = await this.prisma.repositoryConnection.findFirst({
      where: {
        workspaceId,

        applicationId: mobileApp.applicationId,
      },

      select: {
        id: true,

        owner: true,

        name: true,

        fullName: true,

        defaultBranch: true,

        archived: true,

        isAvailable: true,
      },

      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      mobileApp: {
        ...mobileApp,
        createdAt: mobileApp.createdAt.toISOString(),
        updatedAt: mobileApp.updatedAt.toISOString(),
        application: {
          ...mobileApp.application,
          type: 'MOBILE' as const,
          createdAt: mobileApp.application.createdAt.toISOString(),
          updatedAt: mobileApp.application.updatedAt.toISOString(),
          archivedAt: mobileApp.application.archivedAt?.toISOString() ?? null,
        },
      },
      repository,

      latestBuild: null,

      latestRelease: null,

      latestPerformance: null,
    };
  }
}
