import { PrismaService } from '../../../database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class DesktopResourceScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async application(workspaceId: string, desktopAppId: string) {
    const value = await this.prisma.desktopApplication.findFirst({
      where: {
        id: desktopAppId,
        application: {
          workspaceId,
        },
      },
      include: {
        application: true,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop application not found.');
    }

    return value;
  }

  async build(workspaceId: string, desktopAppId: string, buildId: string) {
    const value = await this.prisma.desktopBuild.findFirst({
      where: {
        id: buildId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop build not found.');
    }

    return value;
  }

  async artifact(workspaceId: string, desktopAppId: string, artifactId: string) {
    const value = await this.prisma.desktopBuildArtifact.findFirst({
      where: {
        id: artifactId,
        build: {
          workspaceId,
          desktopAppId,
        },
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop artifact not found.');
    }

    return value;
  }

  async testRun(workspaceId: string, desktopAppId: string, testRunId: string) {
    const value = await this.prisma.desktopTestRun.findFirst({
      where: {
        id: testRunId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop test run not found.');
    }

    return value;
  }

  async release(workspaceId: string, desktopAppId: string, releaseId: string) {
    const value = await this.prisma.desktopRelease.findFirst({
      where: {
        id: releaseId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop release not found.');
    }

    return value;
  }

  async telemetryIntegration(workspaceId: string, desktopAppId: string, integrationId: string) {
    const value = await this.prisma.desktopTelemetryIntegration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop telemetry integration not found.');
    }

    return value;
  }

  async crash(workspaceId: string, desktopAppId: string, crashId: string) {
    const value = await this.prisma.desktopCrash.findFirst({
      where: {
        id: crashId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop crash not found.');
    }

    return value;
  }

  async dependency(workspaceId: string, desktopAppId: string, dependencyId: string) {
    const value = await this.prisma.desktopDependency.findFirst({
      where: {
        id: dependencyId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop dependency not found.');
    }

    return value;
  }

  async securityFinding(workspaceId: string, desktopAppId: string, findingId: string) {
    const value = await this.prisma.desktopSecurityFinding.findFirst({
      where: {
        id: findingId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop security finding not found.');
    }

    return value;
  }

  async alertRule(workspaceId: string, desktopAppId: string, ruleId: string) {
    const value = await this.prisma.desktopAlertRule.findFirst({
      where: {
        id: ruleId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop alert rule not found.');
    }

    return value;
  }

  async alertIncident(workspaceId: string, desktopAppId: string, incidentId: string) {
    const value = await this.prisma.desktopAlertIncident.findFirst({
      where: {
        id: incidentId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop alert incident not found.');
    }

    return value;
  }

  async analysis(workspaceId: string, desktopAppId: string, analysisId: string) {
    const value = await this.prisma.desktopAiAnalysis.findFirst({
      where: {
        id: analysisId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!value) {
      throw new NotFoundException('Desktop AI analysis not found.');
    }

    return value;
  }
}