/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { CreateApplicationLinkDto, UpdateApplicationLinkDto } from '../dto/application-link.dto';
import { CreateApplicationTechnologyDto, UpdateApplicationTechnologyDto } from '../dto/application-technology.dto';
import { CreateApplicationDto, ApplicationListQueryDto, UpdateApplicationDto, SortOrder, ApplicationSortBy } from '../dto/application.dto';



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

  _count: {
    select: {
      technologies: true,
      links: true,
    },
  },
} satisfies Prisma.SaasApplicationInclude;

export type ApplicationDetails =
  Prisma.SaasApplicationGetPayload<{
    include: typeof applicationInclude;
  }>;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateApplicationDto,
  ): Promise<ApplicationDetails> {
    const name = this.normalizeRequiredText(
      dto.name,
      'Application name',
    );

    const requestedSlug = dto.slug
      ? this.normalizeSlug(dto.slug)
      : this.normalizeSlug(name);

    const slug = await this.generateUniqueSlug(
      workspaceId,
      requestedSlug,
    );

    const startedAt = this.toNullableDate(
      dto.startedAt,
    );

    const targetLaunchAt = this.toNullableDate(
      dto.targetLaunchAt,
    );

    const launchedAt = this.toNullableDate(
      dto.launchedAt,
    );

    this.validateDates(
      startedAt,
      targetLaunchAt,
      launchedAt,
    );

    try {
      return await this.prisma.saasApplication.create({
        data: {
          workspaceId,
          name,
          slug,

          shortDescription:
            this.normalizeOptionalText(
              dto.shortDescription,
            ),

          longDescription:
            this.normalizeOptionalText(
              dto.longDescription,
            ),

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

        include: applicationInclude,
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async list(
    workspaceId: string,
    query: ApplicationListQueryDto,
  ) {
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

    const [applications, total] =
      await this.prisma.$transaction([
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

  async findOne(
    workspaceId: string,
    applicationId: string,
  ): Promise<ApplicationDetails> {
    const application =
      await this.prisma.saasApplication.findFirst({
        where: {
          id: applicationId,
          workspaceId,
        },

        include: applicationInclude,
      });

    if (!application) {
      throw new NotFoundException(
        'SaaS application not found',
      );
    }

    return application;
  }

  async update(
    workspaceId: string,
    applicationId: string,
    dto: UpdateApplicationDto,
  ): Promise<ApplicationDetails> {
    const existing = await this.findOne(
      workspaceId,
      applicationId,
    );

    this.ensureNotArchived(existing);

    const data: Prisma.SaasApplicationUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredText(
        dto.name,
        'Application name',
      );
    }

    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);

      await this.ensureSlugAvailable(
        workspaceId,
        applicationId,
        slug,
      );

      data.slug = slug;
    }

    if (dto.shortDescription !== undefined) {
      data.shortDescription =
        this.normalizeOptionalText(
          dto.shortDescription,
        );
    }

    if (dto.longDescription !== undefined) {
      data.longDescription =
        this.normalizeOptionalText(
          dto.longDescription,
        );
    }

    if (dto.category !== undefined) {
      data.category = dto.category;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }

    const startedAt =
      dto.startedAt !== undefined
        ? this.toNullableDate(dto.startedAt)
        : existing.startedAt;

    const targetLaunchAt =
      dto.targetLaunchAt !== undefined
        ? this.toNullableDate(dto.targetLaunchAt)
        : existing.targetLaunchAt;

    const launchedAt =
      dto.launchedAt !== undefined
        ? this.toNullableDate(dto.launchedAt)
        : existing.launchedAt;

    this.validateDates(
      startedAt,
      targetLaunchAt,
      launchedAt,
    );

    if (dto.startedAt !== undefined) {
      data.startedAt = startedAt;
    }

    if (dto.targetLaunchAt !== undefined) {
      data.targetLaunchAt = targetLaunchAt;
    }

    if (dto.launchedAt !== undefined) {
      data.launchedAt = launchedAt;
    }

    try {
      return await this.prisma.saasApplication.update({
        where: {
          id: applicationId,
        },

        data,

        include: applicationInclude,
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async archive(
    workspaceId: string,
    applicationId: string,
  ): Promise<ApplicationDetails> {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    if (application.archivedAt) {
      return application;
    }

    return this.prisma.saasApplication.update({
      where: {
        id: applicationId,
      },

      data: {
        archivedAt: new Date(),
      },

      include: applicationInclude,
    });
  }

  async restore(
    workspaceId: string,
    applicationId: string,
  ): Promise<ApplicationDetails> {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    if (!application.archivedAt) {
      return application;
    }

    return this.prisma.saasApplication.update({
      where: {
        id: applicationId,
      },

      data: {
        archivedAt: null,
      },

      include: applicationInclude,
    });
  }

  async permanentDelete(
    workspaceId: string,
    applicationId: string,
  ): Promise<void> {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    if (!application.archivedAt) {
      throw new ConflictException(
        'Archive the application before permanent deletion',
      );
    }

    await this.prisma.saasApplication.delete({
      where: {
        id: applicationId,
      },
    });
  }

  async addTechnology(
    workspaceId: string,
    applicationId: string,
    dto: CreateApplicationTechnologyDto,
  ) {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    this.ensureNotArchived(application);

    try {
      return await this.prisma.applicationTechnology.create({
        data: {
          applicationId,
          name: this.normalizeRequiredText(
            dto.name,
            'Technology name',
          ),
          type: dto.type,
          version:
            this.normalizeOptionalText(dto.version),
        },
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(
        error,
        'This technology already exists on the application',
      );

      throw error;
    }
  }

  async updateTechnology(
    workspaceId: string,
    applicationId: string,
    technologyId: string,
    dto: UpdateApplicationTechnologyDto,
  ) {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    this.ensureNotArchived(application);

    const technology =
      await this.prisma.applicationTechnology.findFirst({
        where: {
          id: technologyId,
          applicationId,
        },
      });

    if (!technology) {
      throw new NotFoundException(
        'Application technology not found',
      );
    }

    try {
      return await this.prisma.applicationTechnology.update({
        where: {
          id: technologyId,
        },

        data: {
          ...(dto.name !== undefined
            ? {
                name: this.normalizeRequiredText(
                  dto.name,
                  'Technology name',
                ),
              }
            : {}),

          ...(dto.type !== undefined
            ? {
                type: dto.type,
              }
            : {}),

          ...(dto.version !== undefined
            ? {
                version:
                  this.normalizeOptionalText(
                    dto.version,
                  ),
              }
            : {}),
        },
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(
        error,
        'This technology already exists on the application',
      );

      throw error;
    }
  }

  async removeTechnology(
    workspaceId: string,
    applicationId: string,
    technologyId: string,
  ): Promise<void> {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    this.ensureNotArchived(application);

    const technology =
      await this.prisma.applicationTechnology.findFirst({
        where: {
          id: technologyId,
          applicationId,
        },
      });

    if (!technology) {
      throw new NotFoundException(
        'Application technology not found',
      );
    }

    await this.prisma.applicationTechnology.delete({
      where: {
        id: technologyId,
      },
    });
  }

  async addLink(
    workspaceId: string,
    applicationId: string,
    dto: CreateApplicationLinkDto,
  ) {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    this.ensureNotArchived(application);

    try {
      return await this.prisma.applicationLink.create({
        data: {
          applicationId,
          label: this.normalizeRequiredText(
            dto.label,
            'Link label',
          ),
          type: dto.type,
          url: dto.url.trim(),
        },
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(
        error,
        'This URL already exists on the application',
      );

      throw error;
    }
  }

  async updateLink(
    workspaceId: string,
    applicationId: string,
    linkId: string,
    dto: UpdateApplicationLinkDto,
  ) {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    this.ensureNotArchived(application);

    const link =
      await this.prisma.applicationLink.findFirst({
        where: {
          id: linkId,
          applicationId,
        },
      });

    if (!link) {
      throw new NotFoundException(
        'Application link not found',
      );
    }

    try {
      return await this.prisma.applicationLink.update({
        where: {
          id: linkId,
        },

        data: {
          ...(dto.label !== undefined
            ? {
                label: this.normalizeRequiredText(
                  dto.label,
                  'Link label',
                ),
              }
            : {}),

          ...(dto.type !== undefined
            ? {
                type: dto.type,
              }
            : {}),

          ...(dto.url !== undefined
            ? {
                url: dto.url.trim(),
              }
            : {}),
        },
      });
    } catch (error: unknown) {
      this.handleUniqueConstraint(
        error,
        'This URL already exists on the application',
      );

      throw error;
    }
  }

  async removeLink(
    workspaceId: string,
    applicationId: string,
    linkId: string,
  ): Promise<void> {
    const application = await this.findOne(
      workspaceId,
      applicationId,
    );

    this.ensureNotArchived(application);

    const link =
      await this.prisma.applicationLink.findFirst({
        where: {
          id: linkId,
          applicationId,
        },
      });

    if (!link) {
      throw new NotFoundException(
        'Application link not found',
      );
    }

    await this.prisma.applicationLink.delete({
      where: {
        id: linkId,
      },
    });
  }

  private ensureNotArchived(
    application: ApplicationDetails,
  ): void {
    if (application.archivedAt) {
      throw new ConflictException(
        'Restore the application before modifying it',
      );
    }
  }

  private async generateUniqueSlug(
    workspaceId: string,
    requestedSlug: string,
  ): Promise<string> {
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
      slug = `${requestedSlug}-${suffix}`;
    }

    return slug;
  }

  private async ensureSlugAvailable(
    workspaceId: string,
    applicationId: string,
    slug: string,
  ): Promise<void> {
    const existing =
      await this.prisma.saasApplication.findFirst({
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
      throw new ConflictException(
        'Application slug is already in use',
      );
    }
  }

  private buildOrderBy(
    query: ApplicationListQueryDto,
  ): Prisma.SaasApplicationOrderByWithRelationInput {
    const order =
      query.sortOrder ?? SortOrder.DESC;

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
      throw new BadRequestException(
        'Application slug is invalid',
      );
    }

    if (slug.length > 160) {
      throw new BadRequestException(
        'Application slug cannot exceed 160 characters',
      );
    }

    return slug;
  }

  private normalizeRequiredText(
    value: string,
    fieldName: string,
  ): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(
        `${fieldName} is required`,
      );
    }

    return normalized;
  }

  private normalizeOptionalText(
    value?: string | null,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }

  private toNullableDate(
    value?: string | null,
  ): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'Invalid date value',
      );
    }

    return date;
  }

  private validateDates(
    startedAt: Date | null,
    targetLaunchAt: Date | null,
    launchedAt: Date | null,
  ): void {
    if (
      startedAt &&
      targetLaunchAt &&
      targetLaunchAt < startedAt
    ) {
      throw new BadRequestException(
        'Target launch date cannot be before the start date',
      );
    }

    if (
      startedAt &&
      launchedAt &&
      launchedAt < startedAt
    ) {
      throw new BadRequestException(
        'Launch date cannot be before the start date',
      );
    }
  }

  private handleUniqueConstraint(
    error: unknown,
    message = 'An application with this value already exists',
  ): void {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }
}