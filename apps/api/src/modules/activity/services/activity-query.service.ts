import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { Prisma } from 'src/generated/prisma/client';

import type { ActivityQueryDto } from '../dto/activity-query.dto';

const activityInclude = {
  actor: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },

  application: {
    select: {
      id: true,
      name: true,
      slug: true,
      archivedAt: true,
    },
  },
} satisfies Prisma.ApplicationActivityInclude;

@Injectable()
export class ActivityQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaceActivities(workspaceId: string, query: ActivityQueryDto) {
    return this.list(workspaceId, null, query);
  }

  async listApplicationActivities(
    workspaceId: string,
    applicationId: string,
    query: ActivityQueryDto,
  ) {
    const application = await this.prisma.saasApplication.findFirst({
      where: {
        id: applicationId,
        workspaceId,
      },

      select: {
        id: true,
      },
    });

    if (!application) {
      throw new NotFoundException('SaaS application not found');
    }

    return this.list(workspaceId, applicationId, query);
  }

  private async list(workspaceId: string, applicationId: string | null, query: ActivityQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const dateFilter: Prisma.DateTimeFilter | undefined =
      query.dateFrom || query.dateTo
        ? {
            ...(query.dateFrom
              ? {
                  gte: new Date(query.dateFrom),
                }
              : {}),

            ...(query.dateTo
              ? {
                  lte: new Date(query.dateTo),
                }
              : {}),
          }
        : undefined;

    const where: Prisma.ApplicationActivityWhereInput = {
      workspaceId,

      ...(applicationId
        ? {
            applicationId,
          }
        : {}),

      ...(query.activityType
        ? {
            activityType: query.activityType,
          }
        : {}),

      ...(query.actorType
        ? {
            actorType: query.actorType,
          }
        : {}),

      ...(query.entityType
        ? {
            entityType: query.entityType,
          }
        : {}),

      ...(query.actorUserId
        ? {
            actorUserId: query.actorUserId,
          }
        : {}),

      ...(dateFilter
        ? {
            createdAt: dateFilter,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                applicationName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                actor: {
                  is: {
                    OR: [
                      {
                        displayName: {
                          contains: search,
                          mode: 'insensitive',
                        },
                      },

                      {
                        email: {
                          contains: search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [activities, total] = await this.prisma.$transaction([
      this.prisma.applicationActivity.findMany({
        where,
        include: activityInclude,
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip,
        take: limit,
      }),

      this.prisma.applicationActivity.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: activities,

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
}
