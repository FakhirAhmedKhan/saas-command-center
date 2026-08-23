import { MobileAppsService } from './mobile-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMobileReleaseDto, MobileReleaseQueryDto, UpdateMobileReleaseStatusDto } from '../dto/mobile-release.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MobileBuildStatus, MobileReleaseStatus } from 'src/generated/prisma/enums';

@Injectable()
export class MobileReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mobileApps: MobileAppsService,
  ) {}

  async create(workspaceId: string, mobileAppId: string, dto: CreateMobileReleaseDto) {
    const mobileApp = await this.mobileApps.findOne(workspaceId, mobileAppId);

    if (mobileApp.application.archivedAt) {
      throw new BadRequestException('Archived mobile applications cannot create releases.');
    }

    const build = await this.prisma.mobileBuild.findFirst({
      where: {
        id: dto.buildId,
        workspaceId,
        mobileAppId,
      },
    });

    if (!build) {
      throw new NotFoundException('Mobile build not found.');
    }

    if (build.status !== MobileBuildStatus.SUCCESS) {
      throw new BadRequestException('Only successful builds can be released.');
    }

    const version = dto.version?.trim() || build.version?.trim();

    const buildNumber = dto.buildNumber?.trim() || build.buildNumber?.trim();

    if (!version) {
      throw new BadRequestException('Release version is required.');
    }

    if (!buildNumber) {
      throw new BadRequestException('Release build number is required.');
    }

    const existing = await this.prisma.mobileRelease.findFirst({
      where: {
        buildId: build.id,
        environment: dto.environment,
      },
    });

    if (existing) {
      throw new ConflictException('This build already has a release for the selected environment.');
    }

    return this.prisma.mobileRelease.create({
      data: {
        workspaceId,
        mobileAppId,

        buildId: build.id,

        version,
        buildNumber,

        environment: dto.environment,

        status: MobileReleaseStatus.DRAFT,

        commitSha: build.commitSha,

        releaseNotes: this.optionalText(dto.releaseNotes),
      },

      include: {
        build: {
          select: {
            id: true,
            branch: true,
            commitSha: true,
            workflowRunId: true,
          },
        },
      },
    });
  }

  async list(workspaceId: string, mobileAppId: string, query: MobileReleaseQueryDto) {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    return this.prisma.mobileRelease.findMany({
      where: {
        workspaceId,
        mobileAppId,

        ...(query.environment
          ? {
              environment: query.environment,
            }
          : {}),

        ...(query.status
          ? {
              status: query.status,
            }
          : {}),
      },

      include: {
        build: {
          select: {
            id: true,
            branch: true,
            commitSha: true,
            workflowRunId: true,
          },
        },
      },

      orderBy: [
        {
          releasedAt: 'desc',
        },

        {
          createdAt: 'desc',
        },
      ],

      take: 100,
    });
  }

  async findOne(workspaceId: string, mobileAppId: string, releaseId: string) {
    const release = await this.prisma.mobileRelease.findFirst({
      where: {
        id: releaseId,
        workspaceId,
        mobileAppId,
      },

      include: {
        build: {
          select: {
            id: true,
            branch: true,
            commitSha: true,
            workflowRunId: true,
          },
        },
      },
    });

    if (!release) {
      throw new NotFoundException('Mobile release not found.');
    }

    return release;
  }

  async updateStatus(workspaceId: string, mobileAppId: string, releaseId: string, dto: UpdateMobileReleaseStatusDto) {
    const release = await this.findOne(workspaceId, mobileAppId, releaseId);

    this.assertTransition(release.status, dto.status);

    return this.prisma.mobileRelease.update({
      where: {
        id: release.id,
      },

      data: {
        status: dto.status,

        releasedAt: dto.status === MobileReleaseStatus.RELEASED ? new Date() : release.releasedAt,
      },

      include: {
        build: {
          select: {
            id: true,
            branch: true,
            commitSha: true,
            workflowRunId: true,
          },
        },
      },
    });
  }

  async getLatest(workspaceId: string, mobileAppId: string) {
    return this.prisma.mobileRelease.findFirst({
      where: {
        workspaceId,
        mobileAppId,

        status: MobileReleaseStatus.RELEASED,
      },

      include: {
        build: {
          select: {
            id: true,
            branch: true,
            commitSha: true,
            workflowRunId: true,
          },
        },
      },

      orderBy: [
        {
          releasedAt: 'desc',
        },

        {
          createdAt: 'desc',
        },
      ],
    });
  }

  private assertTransition(current: MobileReleaseStatus, next: MobileReleaseStatus): void {
    if (current === next) {
      return;
    }

    const allowed: Record<MobileReleaseStatus, MobileReleaseStatus[]> = {
      DRAFT: [MobileReleaseStatus.READY, MobileReleaseStatus.FAILED],

      READY: [MobileReleaseStatus.RELEASED, MobileReleaseStatus.FAILED],

      RELEASED: [MobileReleaseStatus.ROLLED_BACK],

      FAILED: [],
      ROLLED_BACK: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Invalid release transition: ${current} → ${next}`);
    }
  }

  private optionalText(value: string | null | undefined): string | null {
    const normalized = value?.trim();

    return normalized || null;
  }
}
