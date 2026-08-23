import { MobileAppsService } from './mobile-apps.service';
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
      mobileApp,

      repository,

      latestBuild: null,

      latestRelease: null,

      latestPerformance: null,
    };
  }
}
