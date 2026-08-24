import { DesktopAppsService } from './desktop-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import type { DesktopBuildQueryDto, IngestGithubDesktopBuildDto } from '../dto/desktop-build.dto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DesktopBuildSource, DesktopBuildStatus } from 'src/generated/prisma/enums';

@Injectable()
export class DesktopBuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
  ) {}

  async list(workspaceId: string, desktopAppId: string, query: DesktopBuildQueryDto) {
    await this.requireApp(workspaceId, desktopAppId);

    return this.prisma.desktopBuild.findMany({
      where: {
        workspaceId,
        desktopAppId,
        ...(query.status
          ? {
              status: query.status,
            }
          : {}),
        ...(query.platform
          ? {
              platform: query.platform,
            }
          : {}),
        ...(query.architecture
          ? {
              architecture: query.architecture,
            }
          : {}),
        ...(query.branch
          ? {
              branch: query.branch,
            }
          : {}),
        ...(query.version
          ? {
              version: query.version,
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(workspaceId: string, desktopAppId: string, buildId: string) {
    await this.requireApp(workspaceId, desktopAppId);

    const build = await this.prisma.desktopBuild.findFirst({
      where: {
        id: buildId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!build) {
      throw new NotFoundException('Desktop build not found.');
    }

    return build;
  }

  async getLatest(workspaceId: string, desktopAppId: string) {
    await this.requireApp(workspaceId, desktopAppId);

    return this.prisma.desktopBuild.findFirst({
      where: {
        workspaceId,
        desktopAppId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async ingestGithubBuild(workspaceId: string, desktopAppId: string, dto: IngestGithubDesktopBuildDto) {
    const app = await this.requireApp(workspaceId, desktopAppId);

    if (app.application.archivedAt) {
      throw new BadRequestException('Archived desktop applications cannot receive build updates.');
    }

    const repository = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: dto.repositoryId,
        workspaceId,
        applicationId: app.applicationId,
        archived: false,
        isAvailable: true,
      },
      select: {
        id: true,
      },
    });

    if (!repository) {
      return {
        ignored: true,
        reason: 'Repository is not the active repository linked to this desktop application.',
        build: null,
      };
    }

    const platform = dto.platform ?? app.platform;
    const architecture = dto.architecture ?? app.architecture;
    const status = this.resolveStatus(dto.status, dto.conclusion);
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : null;
    const completedAt = dto.completedAt ? new Date(dto.completedAt) : null;
    const durationMs = dto.durationMs ?? (startedAt && completedAt ? Math.max(0, completedAt.getTime() - startedAt.getTime()) : null);
    const build = await this.prisma.desktopBuild.upsert({
      where: {
        repositoryId_workflowRunId_platform_architecture: {
          repositoryId: dto.repositoryId,
          workflowRunId: dto.workflowRunId.trim(),
          platform,
          architecture,
        },
      },
      create: {
        workspaceId,
        desktopAppId,
        repositoryId: dto.repositoryId,
        workflowRunId: dto.workflowRunId.trim(),
        source: DesktopBuildSource.GITHUB_ACTIONS,
        commitSha: dto.commitSha.trim(),
        branch: dto.branch.trim(),
        version: this.optional(dto.version),
        buildNumber: this.optional(dto.buildNumber),
        platform,
        architecture,
        status,
        startedAt,
        completedAt,
        durationMs,
      },
      update: {
        commitSha: dto.commitSha.trim(),
        branch: dto.branch.trim(),
        version: this.optional(dto.version),
        buildNumber: this.optional(dto.buildNumber),
        status,
        startedAt,
        completedAt,
        durationMs,
      },
    });

    return {
      ignored: false,
      reason: null,
      build,
    };
  }

  private async requireApp(workspaceId: string, desktopAppId: string) {
    return this.desktopApps.findOne(workspaceId, desktopAppId);
  }

  private optional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private resolveStatus(explicit: DesktopBuildStatus | undefined, conclusion: string | null | undefined): DesktopBuildStatus {
    if (explicit) {
      return explicit;
    }

    switch (conclusion?.trim().toLowerCase()) {
      case 'success':
        return DesktopBuildStatus.SUCCESS;

      case 'failure':
      case 'timed_out':
      case 'action_required':
      case 'startup_failure':
        return DesktopBuildStatus.FAILED;

      case 'cancelled':
      case 'skipped':
      case 'stale':
        return DesktopBuildStatus.CANCELLED;

      case 'in_progress':
        return DesktopBuildStatus.BUILDING;

      default:
        return DesktopBuildStatus.QUEUED;
    }
  }
}
