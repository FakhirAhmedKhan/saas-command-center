import type { ActivityWriteInput } from '../../activity/interfaces/activity-writer.interface';
import { ActivityWriterService } from '../../activity/services/activity-writer.service';
import { CreateApplicationLinkDto, UpdateApplicationLinkDto } from '../dto/application-link.dto';
import { CreateApplicationTechnologyDto, UpdateApplicationTechnologyDto } from '../dto/application-technology.dto';
import { ApplicationListQueryDto, ApplicationSortBy, CreateApplicationDto, SortOrder, UpdateApplicationDto } from '../dto/application.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ActivityActorType, ActivityEntityType, ApplicationActivityType } from 'src/generated/prisma/enums';

const applicationInclude = {
  technologies: {
    orderBy: [
      {
        type: 'asc',
      },
      {
        name: 'asc',
      },
    ],
  },

  links: {
    orderBy: [
      {
        type: 'asc',
      },
      {
        label: 'asc',
      },
    ],
  },
  mobileApplication: true,

  _count: {
    select: {
      technologies: true,
      links: true,
      activities: true,
    },
  },
} satisfies Prisma.SaasApplicationInclude;

export type ApplicationDetails = Prisma.SaasApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly activityWriter: ActivityWriterService,
  ) {}

  async create(workspaceId: string, dto: CreateApplicationDto, actorUserId: string): Promise<ApplicationDetails> {
    const name = this.normalizeRequiredText(dto.name, 'Application name');

    const requestedSlug = dto.slug ? this.normalizeSlug(dto.slug) : this.normalizeSlug(name);

    const slug = await this.generateUniqueSlug(workspaceId, requestedSlug);

    const startedAt = this.toNullableDate(dto.startedAt);

    const targetLaunchAt = this.toNullableDate(dto.targetLaunchAt);

    const launchedAt = this.toNullableDate(dto.launchedAt);

    this.validateDates(startedAt, targetLaunchAt, launchedAt);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const application = await transaction.saasApplication.create({
          data: {
            workspaceId,
            name,
            slug,

            shortDescription: this.normalizeOptionalText(dto.shortDescription),
            longDescription: this.normalizeOptionalText(dto.longDescription),

            ...(dto.category
              ? {
                  category: dto.category,
                }
              : {}),

            ...(dto.status
              ? {
                  status: dto.status,
                }
              : {}),

            ...(dto.priority
              ? {
                  priority: dto.priority,
                }
              : {}),

            startedAt,
            targetLaunchAt,
            launchedAt,
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
          title: 'Application created',
          description: `${application.name} was added to the SaaS registry.`,
          metadata: {
            category: application.category,
            status: application.status,
            priority: application.priority,
            slug: application.slug,
          },
        });

        return transaction.saasApplication.findUniqueOrThrow({
          where: {
            id: application.id,
          },

          include: applicationInclude,
        });
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async list(workspaceId: string, query: ApplicationListQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where: Prisma.SaasApplicationWhereInput = {
      workspaceId,

      archivedAt:
        query.archived === true
          ? {
              not: null,
            }
          : null,

      ...(query.status
        ? {
            status: query.status,
          }
        : {}),

      ...(query.priority
        ? {
            priority: query.priority,
          }
        : {}),

      ...(query.category
        ? {
            category: query.category,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                slug: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                shortDescription: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                longDescription: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const orderBy = this.buildOrderBy(query);

    const [applications, total] = await this.prisma.$transaction([
      this.prisma.saasApplication.findMany({
        where,
        include: applicationInclude,
        orderBy,
        skip,
        take: limit,
      }),

      this.prisma.saasApplication.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: applications,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(workspaceId: string, applicationId: string): Promise<ApplicationDetails> {
    const application = await this.prisma.saasApplication.findFirst({
      where: {
        id: applicationId,
        workspaceId,
      },

      include: applicationInclude,
    });

    if (!application) {
      throw new NotFoundException('SaaS application not found');
    }

    return application;
  }

  async update(workspaceId: string, applicationId: string, dto: UpdateApplicationDto, actorUserId: string): Promise<ApplicationDetails> {
    const existing = await this.findOne(workspaceId, applicationId);

    this.ensureNotArchived(existing);

    const data: Prisma.SaasApplicationUpdateInput = {};

    const changedFields: string[] = [];

    if (dto.name !== undefined) {
      const name = this.normalizeRequiredText(dto.name, 'Application name');

      if (name !== existing.name) {
        data.name = name;
        changedFields.push('name');
      }
    }

    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);

      if (slug !== existing.slug) {
        await this.ensureSlugAvailable(workspaceId, applicationId, slug);

        data.slug = slug;
        changedFields.push('slug');
      }
    }

    if (dto.shortDescription !== undefined) {
      const value = this.normalizeOptionalText(dto.shortDescription);

      if (value !== existing.shortDescription) {
        data.shortDescription = value;

        changedFields.push('shortDescription');
      }
    }

    if (dto.longDescription !== undefined) {
      const value = this.normalizeOptionalText(dto.longDescription);

      if (value !== existing.longDescription) {
        data.longDescription = value;

        changedFields.push('longDescription');
      }
    }

    if (dto.category !== undefined && dto.category !== existing.category) {
      data.category = dto.category;

      changedFields.push('category');
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = dto.status;

      changedFields.push('status');
    }

    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      data.priority = dto.priority;

      changedFields.push('priority');
    }

    const startedAt = dto.startedAt !== undefined ? this.toNullableDate(dto.startedAt) : existing.startedAt;

    const targetLaunchAt = dto.targetLaunchAt !== undefined ? this.toNullableDate(dto.targetLaunchAt) : existing.targetLaunchAt;

    const launchedAt = dto.launchedAt !== undefined ? this.toNullableDate(dto.launchedAt) : existing.launchedAt;

    this.validateDates(startedAt, targetLaunchAt, launchedAt);

    if (dto.startedAt !== undefined && !this.sameDate(startedAt, existing.startedAt)) {
      data.startedAt = startedAt;

      changedFields.push('startedAt');
    }

    if (dto.targetLaunchAt !== undefined && !this.sameDate(targetLaunchAt, existing.targetLaunchAt)) {
      data.targetLaunchAt = targetLaunchAt;

      changedFields.push('targetLaunchAt');
    }

    if (dto.launchedAt !== undefined && !this.sameDate(launchedAt, existing.launchedAt)) {
      data.launchedAt = launchedAt;

      changedFields.push('launchedAt');
    }

    if (changedFields.length === 0) {
      return existing;
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.saasApplication.update({
          where: {
            id: applicationId,
          },

          data,
        });

        const events: ActivityWriteInput[] = [];

        const generalFields = changedFields.filter((field) => field !== 'status' && field !== 'priority');

        if (generalFields.length > 0) {
          events.push({
            workspaceId,
            applicationId,
            applicationName: updated.name,
            actorType: ActivityActorType.USER,
            actorUserId,
            activityType: ApplicationActivityType.APPLICATION_UPDATED,
            entityType: ActivityEntityType.APPLICATION,
            entityId: applicationId,
            title: 'Application updated',
            description: `${updated.name} application information was updated.`,
            metadata: {
              changedFields: generalFields,
            },
          });
        }

        if (changedFields.includes('status')) {
          events.push({
            workspaceId,
            applicationId,
            applicationName: updated.name,
            actorType: ActivityActorType.USER,
            actorUserId,
            activityType: ApplicationActivityType.APPLICATION_STATUS_CHANGED,
            entityType: ActivityEntityType.APPLICATION,
            entityId: applicationId,
            title: 'Application status changed',
            description: `${updated.name} moved from ${this.humanizeEnum(existing.status)} to ${this.humanizeEnum(updated.status)}.`,
            metadata: {
              previousStatus: existing.status,
              currentStatus: updated.status,
            },
          });
        }

        if (changedFields.includes('priority')) {
          events.push({
            workspaceId,
            applicationId,
            applicationName: updated.name,
            actorType: ActivityActorType.USER,
            actorUserId,
            activityType: ApplicationActivityType.APPLICATION_PRIORITY_CHANGED,
            entityType: ActivityEntityType.APPLICATION,
            entityId: applicationId,
            title: 'Application priority changed',
            description: `${updated.name} priority changed from ${this.humanizeEnum(existing.priority)} to ${this.humanizeEnum(updated.priority)}.`,
            metadata: {
              previousPriority: existing.priority,
              currentPriority: updated.priority,
            },
          });
        }

        await this.activityWriter.writeManyWithTransaction(transaction, events);

        return transaction.saasApplication.findUniqueOrThrow({
          where: {
            id: applicationId,
          },

          include: applicationInclude,
        });
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);

      throw error;
    }
  }

  async archive(workspaceId: string, applicationId: string, actorUserId: string): Promise<ApplicationDetails> {
    const application = await this.findOne(workspaceId, applicationId);

    if (application.archivedAt) {
      return application;
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.saasApplication.update({
        where: {
          id: applicationId,
        },

        data: {
          archivedAt: new Date(),
        },
      });

      await this.activityWriter.writeWithTransaction(transaction, {
        workspaceId,
        applicationId,
        applicationName: updated.name,
        actorType: ActivityActorType.USER,
        actorUserId,
        activityType: ApplicationActivityType.APPLICATION_ARCHIVED,
        entityType: ActivityEntityType.APPLICATION,
        entityId: applicationId,
        title: 'Application archived',
        description: `${updated.name} was moved to the archive.`,
      });

      return transaction.saasApplication.findUniqueOrThrow({
        where: {
          id: applicationId,
        },

        include: applicationInclude,
      });
    });
  }

  async restore(workspaceId: string, applicationId: string, actorUserId: string): Promise<ApplicationDetails> {
    const application = await this.findOne(workspaceId, applicationId);

    if (!application.archivedAt) {
      return application;
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.saasApplication.update({
        where: {
          id: applicationId,
        },

        data: {
          archivedAt: null,
        },
      });

      await this.activityWriter.writeWithTransaction(transaction, {
        workspaceId,
        applicationId,
        applicationName: updated.name,
        actorType: ActivityActorType.USER,
        actorUserId,
        activityType: ApplicationActivityType.APPLICATION_RESTORED,
        entityType: ActivityEntityType.APPLICATION,
        entityId: applicationId,
        title: 'Application restored',
        description: `${updated.name} was restored from the archive.`,
      });

      return transaction.saasApplication.findUniqueOrThrow({
        where: {
          id: applicationId,
        },

        include: applicationInclude,
      });
    });
  }

  async permanentDelete(workspaceId: string, applicationId: string, actorUserId: string): Promise<void> {
    const application = await this.findOne(workspaceId, applicationId);

    if (!application.archivedAt) {
      throw new ConflictException('Archive the application before permanent deletion');
    }

    await this.prisma.$transaction(async (transaction) => {
      await this.activityWriter.writeWithTransaction(transaction, {
        workspaceId,
        applicationId,
        applicationName: application.name,
        actorType: ActivityActorType.USER,
        actorUserId,
        activityType: ApplicationActivityType.APPLICATION_DELETED,
        entityType: ActivityEntityType.APPLICATION,
        entityId: applicationId,
        title: 'Application permanently deleted',
        description: `${application.name} and its related application records were permanently deleted.`,
      });

      await transaction.saasApplication.delete({
        where: {
          id: applicationId,
        },
      });
    });
  }

  async addTechnology(workspaceId: string, applicationId: string, dto: CreateApplicationTechnologyDto, actorUserId: string) {
    const application = await this.findOne(workspaceId, applicationId);

    this.ensureNotArchived(application);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const technology = await transaction.applicationTechnology.create({
          data: {
            applicationId,

            name: this.normalizeRequiredText(dto.name, 'Technology name'),
            type: dto.type,
            version: this.normalizeOptionalText(dto.version),
          },
        });

        await this.activityWriter.writeWithTransaction(transaction, {
          workspaceId,
          applicationId,
          applicationName: application.name,
          actorType: ActivityActorType.USER,
          actorUserId,
          activityType: ApplicationActivityType.TECHNOLOGY_ADDED,
          entityType: ActivityEntityType.TECHNOLOGY,
          entityId: technology.id,
          title: 'Technology added',
          description: `${technology.name} was added to ${application.name}.`,
          metadata: {
            technologyName: technology.name,
            technologyType: technology.type,
            version: technology.version,
          },
        });

        return technology;
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error, 'This technology already exists on the application');

      throw error;
    }
  }

  async updateTechnology(workspaceId: string, applicationId: string, technologyId: string, dto: UpdateApplicationTechnologyDto, actorUserId: string) {
    const application = await this.findOne(workspaceId, applicationId);

    this.ensureNotArchived(application);

    const technology = await this.prisma.applicationTechnology.findFirst({
      where: {
        id: technologyId,
        applicationId,
      },
    });

    if (!technology) {
      throw new NotFoundException('Application technology not found');
    }

    const data: Prisma.ApplicationTechnologyUpdateInput = {};

    const changedFields: string[] = [];

    if (dto.name !== undefined) {
      const name = this.normalizeRequiredText(dto.name, 'Technology name');

      if (name !== technology.name) {
        data.name = name;
        changedFields.push('name');
      }
    }

    if (dto.type !== undefined && dto.type !== technology.type) {
      data.type = dto.type;
      changedFields.push('type');
    }

    if (dto.version !== undefined) {
      const version = this.normalizeOptionalText(dto.version);

      if (version !== technology.version) {
        data.version = version;
        changedFields.push('version');
      }
    }

    if (changedFields.length === 0) {
      return technology;
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.applicationTechnology.update({
          where: {
            id: technologyId,
          },

          data,
        });

        await this.activityWriter.writeWithTransaction(transaction, {
          workspaceId,
          applicationId,
          applicationName: application.name,
          actorType: ActivityActorType.USER,
          actorUserId,
          activityType: ApplicationActivityType.TECHNOLOGY_UPDATED,
          entityType: ActivityEntityType.TECHNOLOGY,
          entityId: technologyId,
          title: 'Technology updated',
          description: `${updated.name} was updated on ${application.name}.`,
          metadata: {
            changedFields,
            previous: {
              name: technology.name,
              type: technology.type,
              version: technology.version,
            },
            current: {
              name: updated.name,
              type: updated.type,
              version: updated.version,
            },
          },
        });

        return updated;
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error, 'This technology already exists on the application');

      throw error;
    }
  }

  async removeTechnology(workspaceId: string, applicationId: string, technologyId: string, actorUserId: string): Promise<void> {
    const application = await this.findOne(workspaceId, applicationId);

    this.ensureNotArchived(application);

    const technology = await this.prisma.applicationTechnology.findFirst({
      where: {
        id: technologyId,
        applicationId,
      },
    });

    if (!technology) {
      throw new NotFoundException('Application technology not found');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.applicationTechnology.delete({
        where: {
          id: technologyId,
        },
      });

      await this.activityWriter.writeWithTransaction(transaction, {
        workspaceId,
        applicationId,
        applicationName: application.name,
        actorType: ActivityActorType.USER,
        actorUserId,
        activityType: ApplicationActivityType.TECHNOLOGY_REMOVED,
        entityType: ActivityEntityType.TECHNOLOGY,
        entityId: technologyId,
        title: 'Technology removed',
        description: `${technology.name} was removed from ${application.name}.`,
        metadata: {
          technologyName: technology.name,
          technologyType: technology.type,
          version: technology.version,
        },
      });
    });
  }

  async addLink(workspaceId: string, applicationId: string, dto: CreateApplicationLinkDto, actorUserId: string) {
    const application = await this.findOne(workspaceId, applicationId);

    this.ensureNotArchived(application);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const link = await transaction.applicationLink.create({
          data: {
            applicationId,

            label: this.normalizeRequiredText(dto.label, 'Link label'),
            type: dto.type,
            url: dto.url.trim(),
          },
        });

        await this.activityWriter.writeWithTransaction(transaction, {
          workspaceId,
          applicationId,
          applicationName: application.name,
          actorType: ActivityActorType.USER,
          actorUserId,
          activityType: ApplicationActivityType.LINK_ADDED,
          entityType: ActivityEntityType.LINK,
          entityId: link.id,
          title: 'Application link added',
          description: `${link.label} was added to ${application.name}.`,
          metadata: {
            linkLabel: link.label,
            linkType: link.type,
            url: link.url,
          },
        });

        return link;
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error, 'This URL already exists on the application');

      throw error;
    }
  }

  async updateLink(workspaceId: string, applicationId: string, linkId: string, dto: UpdateApplicationLinkDto, actorUserId: string) {
    const application = await this.findOne(workspaceId, applicationId);

    this.ensureNotArchived(application);

    const link = await this.prisma.applicationLink.findFirst({
      where: {
        id: linkId,
        applicationId,
      },
    });

    if (!link) {
      throw new NotFoundException('Application link not found');
    }

    const data: Prisma.ApplicationLinkUpdateInput = {};

    const changedFields: string[] = [];

    if (dto.label !== undefined) {
      const label = this.normalizeRequiredText(dto.label, 'Link label');

      if (label !== link.label) {
        data.label = label;
        changedFields.push('label');
      }
    }

    if (dto.type !== undefined && dto.type !== link.type) {
      data.type = dto.type;
      changedFields.push('type');
    }

    if (dto.url !== undefined) {
      const url = dto.url.trim();

      if (url !== link.url) {
        data.url = url;
        changedFields.push('url');
      }
    }

    if (changedFields.length === 0) {
      return link;
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.applicationLink.update({
          where: {
            id: linkId,
          },

          data,
        });

        await this.activityWriter.writeWithTransaction(transaction, {
          workspaceId,
          applicationId,
          applicationName: application.name,
          actorType: ActivityActorType.USER,
          actorUserId,
          activityType: ApplicationActivityType.LINK_UPDATED,
          entityType: ActivityEntityType.LINK,
          entityId: linkId,
          title: 'Application link updated',
          description: `${updated.label} was updated on ${application.name}.`,
          metadata: {
            changedFields,
            previous: {
              label: link.label,
              type: link.type,
              url: link.url,
            },
            current: {
              label: updated.label,
              type: updated.type,
              url: updated.url,
            },
          },
        });

        return updated;
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error, 'This URL already exists on the application');

      throw error;
    }
  }

  async removeLink(workspaceId: string, applicationId: string, linkId: string, actorUserId: string): Promise<void> {
    const application = await this.findOne(workspaceId, applicationId);

    this.ensureNotArchived(application);

    const link = await this.prisma.applicationLink.findFirst({
      where: {
        id: linkId,
        applicationId,
      },
    });

    if (!link) {
      throw new NotFoundException('Application link not found');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.applicationLink.delete({
        where: {
          id: linkId,
        },
      });

      await this.activityWriter.writeWithTransaction(transaction, {
        workspaceId,
        applicationId,
        applicationName: application.name,
        actorType: ActivityActorType.USER,
        actorUserId,
        activityType: ApplicationActivityType.LINK_REMOVED,
        entityType: ActivityEntityType.LINK,
        entityId: linkId,
        title: 'Application link removed',
        description: `${link.label} was removed from ${application.name}.`,
        metadata: {
          linkLabel: link.label,
          linkType: link.type,
          url: link.url,
        },
      });
    });
  }

  private ensureNotArchived(application: ApplicationDetails): void {
    if (application.archivedAt) {
      throw new ConflictException('Restore the application before modifying it');
    }
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

      slug = `${requestedSlug.slice(0, 160 - suffixText.length)}${suffixText}`;
    }

    return slug;
  }

  private async ensureSlugAvailable(workspaceId: string, applicationId: string, slug: string): Promise<void> {
    const existing = await this.prisma.saasApplication.findFirst({
      where: {
        workspaceId,
        slug,

        id: {
          not: applicationId,
        },
      },

      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Application slug is already in use');
    }
  }

  private buildOrderBy(query: ApplicationListQueryDto): Prisma.SaasApplicationOrderByWithRelationInput {
    const order = query.sortOrder ?? SortOrder.DESC;

    switch (query.sortBy) {
      case ApplicationSortBy.NAME:
        return {
          name: order,
        };

      case ApplicationSortBy.STATUS:
        return {
          status: order,
        };

      case ApplicationSortBy.PRIORITY:
        return {
          priority: order,
        };

      case ApplicationSortBy.CREATED_AT:
        return {
          createdAt: order,
        };

      case ApplicationSortBy.TARGET_LAUNCH_AT:
        return {
          targetLaunchAt: order,
        };

      case ApplicationSortBy.UPDATED_AT:
      default:
        return {
          updatedAt: order,
        };
    }
  }

  private normalizeSlug(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (slug.length < 2) {
      throw new BadRequestException('Application slug is invalid');
    }

    if (slug.length > 160) {
      throw new BadRequestException('Application slug cannot exceed 160 characters');
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

  private toNullableDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value');
    }

    return date;
  }

  private sameDate(first: Date | null, second: Date | null): boolean {
    return (first?.getTime() ?? null) === (second?.getTime() ?? null);
  }

  private validateDates(startedAt: Date | null, targetLaunchAt: Date | null, launchedAt: Date | null): void {
    if (startedAt && targetLaunchAt && targetLaunchAt < startedAt) {
      throw new BadRequestException('Target launch date cannot be before the start date');
    }

    if (startedAt && launchedAt && launchedAt < startedAt) {
      throw new BadRequestException('Launch date cannot be before the start date');
    }
  }

  private humanizeEnum(value: string): string {
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private handleUniqueConstraint(error: unknown, message = 'An application with this value already exists'): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
  }
}
