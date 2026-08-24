import { ActivityWriterService } from '../../activity/services/activity-writer.service';
import { CreateDesktopAppDto, UpdateDesktopAppDto } from '../dto/desktop-app.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ActivityActorType, ActivityEntityType, ApplicationActivityType, ApplicationType } from 'src/generated/prisma/enums';

const desktopApplicationInclude = {
  application: true,
} satisfies Prisma.DesktopApplicationInclude;

export type DesktopApplicationDetails = Prisma.DesktopApplicationGetPayload<{
  include: typeof desktopApplicationInclude;
}>;

@Injectable()
export class DesktopAppsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly activityWriter: ActivityWriterService,
  ) {}

  async create(workspaceId: string, dto: CreateDesktopAppDto, actorUserId: string): Promise<DesktopApplicationDetails> {
    const name = this.normalizeRequiredText(dto.name, 'Desktop application name');
    const requestedSlug = this.normalizeSlug(name);
    const slug = await this.generateUniqueSlug(workspaceId, requestedSlug);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const application = await transaction.saasApplication.create({
          data: {
            workspaceId,

            name,

            slug,

            type: ApplicationType.DESKTOP,
          },
        });
        const desktopApplication = await transaction.desktopApplication.create({
          data: {
            applicationId: application.id,

            platform: dto.platform,

            framework: dto.framework,

            architecture: dto.architecture,

            packageName: this.normalizeOptionalText(dto.packageName),

            currentVersion: this.normalizeOptionalText(dto.currentVersion),

            currentBuildNumber: this.normalizeOptionalText(dto.currentBuildNumber),

            minimumOsVersion: this.normalizeOptionalText(dto.minimumOsVersion),

            updateChannel: this.normalizeOptionalText(dto.updateChannel),
          },

          include: desktopApplicationInclude,
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

          title: 'Desktop application created',

          description: `${application.name} was added as a desktop application.`,

          metadata: {
            applicationType: 'DESKTOP',

            desktopAppId: desktopApplication.id,

            platform: desktopApplication.platform,

            framework: desktopApplication.framework,

            architecture: desktopApplication.architecture,

            packageName: desktopApplication.packageName,
          },
        });

        return desktopApplication;
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async list(workspaceId: string): Promise<DesktopApplicationDetails[]> {
    return this.prisma.desktopApplication.findMany({
      where: {
        application: {
          is: {
            workspaceId,

            archivedAt: null,

            type: ApplicationType.DESKTOP,
          },
        },
      },

      include: desktopApplicationInclude,

      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(workspaceId: string, desktopAppId: string): Promise<DesktopApplicationDetails> {
    const desktopApplication = await this.prisma.desktopApplication.findFirst({
      where: {
        id: desktopAppId,

        application: {
          is: {
            workspaceId,

            type: ApplicationType.DESKTOP,
          },
        },
      },

      include: desktopApplicationInclude,
    });

    if (!desktopApplication) {
      throw new NotFoundException('Desktop application not found');
    }

    return desktopApplication;
  }

  async update(workspaceId: string, desktopAppId: string, dto: UpdateDesktopAppDto, actorUserId: string): Promise<DesktopApplicationDetails> {
    const existing = await this.findOne(workspaceId, desktopAppId);

    if (existing.application.archivedAt) {
      throw new ConflictException('Restore the application before modifying it');
    }

    const applicationData: Prisma.SaasApplicationUpdateInput = {};
    const desktopData: Prisma.DesktopApplicationUpdateInput = {};
    const changedFields: string[] = [];

    if (dto.name !== undefined) {
      const name = this.normalizeRequiredText(dto.name, 'Desktop application name');

      if (name !== existing.application.name) {
        applicationData.name = name;

        changedFields.push('name');
      }
    }

    if (dto.platform !== undefined && dto.platform !== existing.platform) {
      desktopData.platform = dto.platform;

      changedFields.push('platform');
    }

    if (dto.framework !== undefined && dto.framework !== existing.framework) {
      desktopData.framework = dto.framework;

      changedFields.push('framework');
    }

    if (dto.architecture !== undefined && dto.architecture !== existing.architecture) {
      desktopData.architecture = dto.architecture;

      changedFields.push('architecture');
    }

    if (dto.packageName !== undefined) {
      const value = this.normalizeOptionalText(dto.packageName);

      if (value !== existing.packageName) {
        desktopData.packageName = value;

        changedFields.push('packageName');
      }
    }

    if (dto.currentVersion !== undefined) {
      const value = this.normalizeOptionalText(dto.currentVersion);

      if (value !== existing.currentVersion) {
        desktopData.currentVersion = value;

        changedFields.push('currentVersion');
      }
    }

    if (dto.currentBuildNumber !== undefined) {
      const value = this.normalizeOptionalText(dto.currentBuildNumber);

      if (value !== existing.currentBuildNumber) {
        desktopData.currentBuildNumber = value;

        changedFields.push('currentBuildNumber');
      }
    }

    if (dto.minimumOsVersion !== undefined) {
      const value = this.normalizeOptionalText(dto.minimumOsVersion);

      if (value !== existing.minimumOsVersion) {
        desktopData.minimumOsVersion = value;

        changedFields.push('minimumOsVersion');
      }
    }

    if (dto.updateChannel !== undefined) {
      const value = this.normalizeOptionalText(dto.updateChannel);

      if (value !== existing.updateChannel) {
        desktopData.updateChannel = value;

        changedFields.push('updateChannel');
      }
    }

    if (changedFields.length === 0) {
      return existing;
    }

    return this.prisma.$transaction(async (transaction) => {
      if (Object.keys(applicationData).length > 0) {
        await transaction.saasApplication.update({
          where: {
            id: existing.applicationId,
          },

          data: applicationData,
        });
      }

      if (Object.keys(desktopData).length > 0) {
        await transaction.desktopApplication.update({
          where: {
            id: desktopAppId,
          },

          data: desktopData,
        });
      }

      const updated = await transaction.desktopApplication.findUniqueOrThrow({
        where: {
          id: desktopAppId,
        },

        include: desktopApplicationInclude,
      });

      await this.activityWriter.writeWithTransaction(transaction, {
        workspaceId,

        applicationId: updated.applicationId,

        applicationName: updated.application.name,

        actorType: ActivityActorType.USER,

        actorUserId,

        activityType: ApplicationActivityType.APPLICATION_UPDATED,

        entityType: ActivityEntityType.APPLICATION,

        entityId: updated.applicationId,

        title: 'Desktop application updated',

        description: `${updated.application.name} desktop application information was updated.`,

        metadata: {
          desktopAppId: updated.id,

          changedFields,
        },
      });

      return updated;
    });
  }

  async archive(workspaceId: string, desktopAppId: string, actorUserId: string): Promise<DesktopApplicationDetails> {
    const existing = await this.findOne(workspaceId, desktopAppId);

    if (existing.application.archivedAt) {
      return existing;
    }

    return this.prisma.$transaction(async (transaction) => {
      const application = await transaction.saasApplication.update({
        where: {
          id: existing.applicationId,
        },

        data: {
          archivedAt: new Date(),
        },
      });

      await this.activityWriter.writeWithTransaction(transaction, {
        workspaceId,

        applicationId: application.id,

        applicationName: application.name,

        actorType: ActivityActorType.USER,

        actorUserId,

        activityType: ApplicationActivityType.APPLICATION_ARCHIVED,

        entityType: ActivityEntityType.APPLICATION,

        entityId: application.id,

        title: 'Desktop application archived',

        description: `${application.name} was moved to the archive.`,

        metadata: {
          desktopAppId,
        },
      });

      return transaction.desktopApplication.findUniqueOrThrow({
        where: {
          id: desktopAppId,
        },

        include: desktopApplicationInclude,
      });
    });
  }

  private async generateUniqueSlug(workspaceId: string, requestedSlug: string): Promise<string> {
    let slug = requestedSlug;
    let suffix = 1;

    while (
      await this.prisma.saasApplication.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,

            slug,
          },
        },

        select: {
          id: true,
        },
      })
    ) {
      suffix += 1;

      const suffixText = `-${suffix}`;

      slug = requestedSlug.slice(0, 160 - suffixText.length) + suffixText;
    }

    return slug;
  }

  private normalizeSlug(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (slug.length < 2) {
      throw new BadRequestException('Desktop application slug is invalid');
    }

    if (slug.length > 160) {
      throw new BadRequestException('Desktop application slug cannot exceed 160 characters');
    }

    return slug;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private normalizeOptionalText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }

  private handleUniqueConstraint(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Desktop application already exists');
    }
  }
}
