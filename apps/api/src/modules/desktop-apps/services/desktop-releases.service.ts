import { DesktopAppsService } from './desktop-apps.service';
import { DesktopBuildsService } from './desktop-builds.service';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateDesktopReleaseDto, DesktopReleaseQueryDto, UpdateDesktopReleaseStatusDto } from '../dto/desktop-release.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DesktopBuildStatus, DesktopReleaseStatus } from 'src/generated/prisma/enums';

@Injectable()
export class DesktopReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly desktopBuilds: DesktopBuildsService,
  ) {}

  async create(workspaceId: string, desktopAppId: string, dto: CreateDesktopReleaseDto) {
    const desktopApp = await this.desktopApps.findOne(workspaceId, desktopAppId);

    if (desktopApp.application.archivedAt) {
      throw new BadRequestException('Archived desktop applications cannot create releases.');
    }

    const build = await this.desktopBuilds.findOne(workspaceId, desktopAppId, dto.buildId);

    if (build.status !== DesktopBuildStatus.SUCCESS) {
      throw new BadRequestException('Only successful desktop builds can be released.');
    }

    const version = this.requiredText(dto.version) ?? this.requiredText(build.version);

    if (!version) {
      throw new BadRequestException('Release version is required. Add a version to the build or provide one when creating the release.');
    }

    const buildNumber = this.requiredText(dto.buildNumber) ?? this.requiredText(build.buildNumber);

    if (!buildNumber) {
      throw new BadRequestException('Release build number is required. Add a build number to the build or provide one when creating the release.');
    }

    const existing = await this.prisma.desktopRelease.findFirst({
      where: {
        buildId: build.id,
        channel: dto.channel,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('This desktop build already has a release for the selected update channel.');
    }

    const release = await this.prisma.desktopRelease.create({
      data: {
        workspaceId,
        desktopAppId,
        buildId: build.id,
        version,
        buildNumber,
        channel: dto.channel,
        platform: build.platform,
        architecture: build.architecture,
        status: DesktopReleaseStatus.DRAFT,
        releaseNotes: this.optionalText(dto.releaseNotes),
      },
      include: this.releaseInclude(),
    });

    return this.serialize(release);
  }

  async list(workspaceId: string, desktopAppId: string, query: DesktopReleaseQueryDto) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const releases = await this.prisma.desktopRelease.findMany({
      where: {
        workspaceId,
        desktopAppId,
        ...(query.channel
          ? {
              channel: query.channel,
            }
          : {}),
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
      },
      include: this.releaseInclude(),
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: 200,
    });

    return releases.map((release) => this.serialize(release));
  }

  async findOne(workspaceId: string, desktopAppId: string, releaseId: string) {
    const release = await this.prisma.desktopRelease.findFirst({
      where: {
        id: releaseId,
        workspaceId,
        desktopAppId,
      },
      include: this.releaseInclude(),
    });

    if (!release) {
      throw new NotFoundException('Desktop release not found.');
    }

    return this.serialize(release);
  }

  async updateStatus(workspaceId: string, desktopAppId: string, releaseId: string, dto: UpdateDesktopReleaseStatusDto) {
    const current = await this.prisma.desktopRelease.findFirst({
      where: {
        id: releaseId,
        workspaceId,
        desktopAppId,
      },
      select: {
        id: true,
        status: true,
        releasedAt: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Desktop release not found.');
    }

    if (current.status === dto.status) {
      return this.findOne(workspaceId, desktopAppId, releaseId);
    }

    this.assertTransition(current.status, dto.status);

    const updated = await this.prisma.desktopRelease.update({
      where: {
        id: current.id,
      },
      data: {
        status: dto.status,
        releasedAt: dto.status === DesktopReleaseStatus.PUBLISHED ? (current.releasedAt ?? new Date()) : current.releasedAt,
      },
      include: this.releaseInclude(),
    });

    return this.serialize(updated);
  }

  async getLatestPublished(workspaceId: string, desktopAppId: string) {
    const release = await this.prisma.desktopRelease.findFirst({
      where: {
        workspaceId,
        desktopAppId,
        status: DesktopReleaseStatus.PUBLISHED,
      },
      include: this.releaseInclude(),
      orderBy: [
        {
          releasedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    return release ? this.serialize(release) : null;
  }

  private assertTransition(current: DesktopReleaseStatus, next: DesktopReleaseStatus): void {
    const allowed: Record<DesktopReleaseStatus, DesktopReleaseStatus[]> = {
      DRAFT: [DesktopReleaseStatus.READY, DesktopReleaseStatus.FAILED],
      READY: [DesktopReleaseStatus.PUBLISHED, DesktopReleaseStatus.FAILED],
      PUBLISHED: [DesktopReleaseStatus.ROLLED_BACK],
      FAILED: [],
      ROLLED_BACK: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Invalid desktop release transition: ${current} -> ${next}`);
    }
  }

  private requiredText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private optionalText(value: string | null | undefined): string | null {
    return this.requiredText(value);
  }

  private releaseInclude() {
    return {
      build: {
        include: {
          artifacts: {
            orderBy: {
              createdAt: 'asc' as const,
            },
          },
        },
      },
    };
  }

  private serialize<
    T extends {
      build: {
        artifacts: Array<{
          sizeBytes: bigint | null;
        }>;
      };
    },
  >(release: T) {
    return {
      ...release,
      build: {
        ...release.build,
        artifacts: release.build.artifacts.map((artifact) => ({
          ...artifact,
          sizeBytes: artifact.sizeBytes === null ? null : Number(artifact.sizeBytes),
        })),
      },
    };
  }
}
