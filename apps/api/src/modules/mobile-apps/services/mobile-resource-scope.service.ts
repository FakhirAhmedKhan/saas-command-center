import { PrismaService } from '../../../database/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class MobileResourceScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMobileApp(
    workspaceId: string,
    mobileAppId: string,
    options: {
      allowArchived?: boolean;
    } = {},
  ) {
    const mobileApp = await this.prisma.mobileApplication.findFirst({
      where: {
        id: mobileAppId,

        application: {
          workspaceId,
        },
      },

      include: {
        application: true,
      },
    });

    if (!mobileApp) {
      throw new NotFoundException('Mobile application not found.');
    }

    if (!options.allowArchived && mobileApp.application.archivedAt) {
      throw new BadRequestException('Archived mobile application cannot be modified.');
    }

    return mobileApp;
  }

  async requireRepositoryForMobileApp(workspaceId: string, mobileAppId: string, repositoryId: string) {
    const mobileApp = await this.requireMobileApp(workspaceId, mobileAppId);
    const repository = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: repositoryId,

        workspaceId,

        applicationId: mobileApp.applicationId,

        archived: false,

        isAvailable: true,
      },
    });

    if (!repository) {
      throw new NotFoundException('Repository is not linked to this mobile application.');
    }

    return {
      mobileApp,
      repository,
    };
  }

  async requireRepositoryCandidate(workspaceId: string, repositoryId: string) {
    const repository = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: repositoryId,
        workspaceId,

        archived: false,
        isAvailable: true,
      },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found.');
    }

    return repository;
  }

  async requireBuild(workspaceId: string, mobileAppId: string, buildId: string) {
    await this.requireMobileApp(workspaceId, mobileAppId, {
      allowArchived: true,
    });

    const build = await this.prisma.mobileBuild.findFirst({
      where: {
        id: buildId,
        workspaceId,
        mobileAppId,
      },
    });

    if (!build) {
      throw new NotFoundException('Mobile build not found.');
    }

    return build;
  }

  async requireRelease(workspaceId: string, mobileAppId: string, releaseId: string) {
    await this.requireMobileApp(workspaceId, mobileAppId, {
      allowArchived: true,
    });

    const release = await this.prisma.mobileRelease.findFirst({
      where: {
        id: releaseId,
        workspaceId,
        mobileAppId,
      },
    });

    if (!release) {
      throw new NotFoundException('Mobile release not found.');
    }

    return release;
  }

  async requireAlertRule(workspaceId: string, mobileAppId: string, ruleId: string) {
    await this.requireMobileApp(workspaceId, mobileAppId, {
      allowArchived: true,
    });

    const rule = await this.prisma.mobileAlertRule.findFirst({
      where: {
        id: ruleId,
        workspaceId,
        mobileAppId,
      },
    });

    if (!rule) {
      throw new NotFoundException('Mobile alert rule not found.');
    }

    return rule;
  }

  async requireTelemetryIntegration(workspaceId: string, mobileAppId: string) {
    await this.requireMobileApp(workspaceId, mobileAppId, {
      allowArchived: true,
    });

    const integration = await this.prisma.mobileTelemetryIntegration.findFirst({
      where: {
        workspaceId,
        mobileAppId,
      },
    });

    if (!integration) {
      throw new NotFoundException('Telemetry integration not found.');
    }

    return integration;
  }
}
