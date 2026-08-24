import { ActivityWriterService } from '../../activity/services/activity-writer.service';
import { CreateMobileAppDto, UpdateMobileAppDto } from '../dto/mobile-app.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ActivityActorType, ActivityEntityType, ApplicationActivityType, ApplicationCategory, ApplicationType } from 'src/generated/prisma/enums';

const mobileApplicationInclude = {
  application: {
    select: {
      id: true,
      workspaceId: true,
      name: true,
      slug: true,
      type: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.MobileApplicationInclude;

export type MobileApplicationDetails = Prisma.MobileApplicationGetPayload<{
  include: typeof mobileApplicationInclude;
}>;

@Injectable()
export class MobileAppsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityWriter: ActivityWriterService,
  ) {}

  async create(workspaceId: string, dto: CreateMobileAppDto, actorUserId: string): Promise<MobileApplicationDetails> {
    const name = this.normalizeRequiredText(dto.name, 'Mobile application name');
    const baseSlug = this.normalizeSlug(name);
    const slug = await this.generateUniqueSlug(workspaceId, baseSlug);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const application = await transaction.saasApplication.create({
          data: {
            workspaceId,

            name,
            slug,

            category: ApplicationCategory.MOBILE,
            type: ApplicationType.MOBILE,

            mobileApplication: {
              create: {
                platform: dto.platform,
                framework: dto.framework,

                packageId: this.normalizeOptionalText(dto.packageId),
                bundleId: this.normalizeOptionalText(dto.bundleId),

                minOsVersion: this.normalizeOptionalText(dto.minOsVersion),

                targetOsVersion: this.normalizeOptionalText(dto.targetOsVersion),

                currentVersion: this.normalizeOptionalText(dto.currentVersion),

                currentBuildNumber: this.normalizeOptionalText(dto.currentBuildNumber),
              },
            },
          },
        });

        await this.activityWriter.writeWithTransaction(transaction, {
          workspaceId,

          applicationId: application.id,
          applicationName: application.name,

          actorType: ActivityActorType.USER,
          actorUserId,

          activityType: ApplicationActivityType.APPLICATION_CREATED,

          entityType: ActivityEntityType.APPLICATION,
          entityId: application.id,

          title: 'Mobile application created',

          description: `${application.name} was added as a mobile application.`,

          metadata: {
            type: ApplicationType.MOBILE,
            platform: dto.platform,
            framework: dto.framework,
            slug: application.slug,
          },
        });

        return transaction.mobileApplication.findUniqueOrThrow({
          where: {
            applicationId: application.id,
          },

          include: mobileApplicationInclude,
        });
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async list(workspaceId: string): Promise<MobileApplicationDetails[]> {
    return this.prisma.mobileApplication.findMany({
      where: {
        application: {
          workspaceId,
          type: ApplicationType.MOBILE,
          archivedAt: null,
        },
      },

      include: mobileApplicationInclude,

      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async findOne(workspaceId: string, mobileAppId: string): Promise<MobileApplicationDetails> {
    const mobileApplication = await this.prisma.mobileApplication.findFirst({
      where: {
        id: mobileAppId,

        application: {
          workspaceId,
          type: ApplicationType.MOBILE,
        },
      },

      include: mobileApplicationInclude,
    });

    if (!mobileApplication) {
      throw new NotFoundException('Mobile application not found');
    }

    return mobileApplication;
  }

  async update(workspaceId: string, mobileAppId: string, dto: UpdateMobileAppDto, actorUserId: string): Promise<MobileApplicationDetails> {
    const existing = await this.findOne(workspaceId, mobileAppId);

    if (existing.application.archivedAt) {
      throw new BadRequestException('Archived mobile applications cannot be changed');
    }

    const changedFields = Object.entries(dto)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);

    if (changedFields.length === 0) {
      return existing;
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        let applicationName = existing.application.name;

        if (dto.name !== undefined) {
          applicationName = this.normalizeRequiredText(dto.name, 'Mobile application name');

          await transaction.saasApplication.update({
            where: {
              id: existing.applicationId,
            },

            data: {
              name: applicationName,
            },
          });
        }

        const mobileApplication = await transaction.mobileApplication.update({
          where: {
            id: mobileAppId,
          },

          data: {
            ...(dto.platform !== undefined
              ? {
                  platform: dto.platform,
                }
              : {}),

            ...(dto.framework !== undefined
              ? {
                  framework: dto.framework,
                }
              : {}),

            ...(dto.packageId !== undefined
              ? {
                  packageId: this.normalizeOptionalText(dto.packageId),
                }
              : {}),

            ...(dto.bundleId !== undefined
              ? {
                  bundleId: this.normalizeOptionalText(dto.bundleId),
                }
              : {}),

            ...(dto.minOsVersion !== undefined
              ? {
                  minOsVersion: this.normalizeOptionalText(dto.minOsVersion),
                }
              : {}),

            ...(dto.targetOsVersion !== undefined
              ? {
                  targetOsVersion: this.normalizeOptionalText(dto.targetOsVersion),
                }
              : {}),

            ...(dto.currentVersion !== undefined
              ? {
                  currentVersion: this.normalizeOptionalText(dto.currentVersion),
                }
              : {}),

            ...(dto.currentBuildNumber !== undefined
              ? {
                  currentBuildNumber: this.normalizeOptionalText(dto.currentBuildNumber),
                }
              : {}),
          },

          include: mobileApplicationInclude,
        });

        await this.activityWriter.writeWithTransaction(transaction, {
          workspaceId,

          applicationId: existing.applicationId,
          applicationName,

          actorType: ActivityActorType.USER,
          actorUserId,

          activityType: ApplicationActivityType.APPLICATION_UPDATED,

          entityType: ActivityEntityType.APPLICATION,
          entityId: existing.applicationId,

          title: 'Mobile application updated',

          description: `${applicationName} mobile application settings were updated.`,

          metadata: {
            mobileAppId,
            changedFields,
          },
        });

        return mobileApplication;
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async archive(workspaceId: string, mobileAppId: string, actorUserId: string): Promise<MobileApplicationDetails> {
    const existing = await this.findOne(workspaceId, mobileAppId);

    if (existing.application.archivedAt) {
      return existing;
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.saasApplication.update({
        where: {
          id: existing.applicationId,
        },

        data: {
          archivedAt: new Date(),
        },
      });

      await this.activityWriter.writeWithTransaction(transaction, {
        workspaceId,

        applicationId: existing.applicationId,
        applicationName: existing.application.name,

        actorType: ActivityActorType.USER,
        actorUserId,

        activityType: ApplicationActivityType.APPLICATION_ARCHIVED,

        entityType: ActivityEntityType.APPLICATION,
        entityId: existing.applicationId,

        title: 'Mobile application archived',

        description: `${existing.application.name} was archived.`,

        metadata: {
          mobileAppId,
          platform: existing.platform,
          framework: existing.framework,
        },
      });

      return transaction.mobileApplication.findUniqueOrThrow({
        where: {
          id: mobileAppId,
        },

        include: mobileApplicationInclude,
      });
    });
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }

  private normalizeSlug(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160)
      .replace(/-+$/g, '');

    if (!slug) {
      throw new BadRequestException('Mobile application name must contain letters or numbers');
    }

    return slug;
  }

  private async generateUniqueSlug(workspaceId: string, baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await this.prisma.saasApplication.findFirst({
        where: {
          workspaceId,
          slug: candidate,
        },

        select: {
          id: true,
        },
      })
    ) {
      const suffixText = `-${suffix}`;
      const maxBaseLength = 160 - suffixText.length;
      const truncatedBase = baseSlug.slice(0, maxBaseLength).replace(/-+$/g, '');

      candidate = `${truncatedBase}${suffixText}`;

      suffix += 1;
    }

    return candidate;
  }

  private handleUniqueConstraint(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A mobile application with conflicting unique data already exists');
    }
  }
}
