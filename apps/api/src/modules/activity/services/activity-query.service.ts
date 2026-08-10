import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ActivityQueryDto } from '../dto/activity-query.dto';

@Injectable()
export class ActivityQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaceActivities(
    workspaceId: string,

    query: ActivityQueryDto,
  ) {
    const where = this.buildWhere(workspaceId, undefined, query);

    return this.list(where, query);
  }

  async listApplicationActivities(
    workspaceId: string,

    applicationId: string,

    query: ActivityQueryDto,
  ) {
    const where = this.buildWhere(workspaceId, applicationId, query);

    return this.list(where, query);
  }

  private async list(
    where: Prisma.ApplicationActivityWhereInput,

    query: ActivityQueryDto,
  ) {
    const [total, items] = await Promise.all([
      this.prisma.applicationActivity.count({
        where,
      }),

      this.prisma.applicationActivity.findMany({
        where,

        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },

          application: {
            select: {
              id: true,
              name: true,
            },
          },
        },

        orderBy: [
          {
            createdAt: 'desc',
          },

          {
            id: 'desc',
          },
        ],

        skip: (query.page - 1) * query.limit,

        take: query.limit,
      }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,

        createdAt: item.createdAt.toISOString(),
      })),

      pagination: {
        page: query.page,

        limit: query.limit,

        total,

        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  private buildWhere(
    workspaceId: string,

    applicationId: string | undefined,

    query: ActivityQueryDto,
  ): Prisma.ApplicationActivityWhereInput {
    const from = query.from ? new Date(query.from) : undefined;

    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && to < from) {
      throw new BadRequestException('to must be on or after from.');
    }

    return {
      workspaceId,

      applicationId,

      activityType: query.activityType,

      actorType: query.actorType,

      actorUserId: query.actorUserId,

      entityType: query.entityType,

      entityId: query.entityId,

      createdAt:
        from || to
          ? {
              gte: from,
              lte: to,
            }
          : undefined,

      OR: query.search
        ? [
            {
              description: {
                contains: query.search,

                mode: 'insensitive',
              },
            },

            {
              actor: {
                displayName: {
                  contains: query.search,

                  mode: 'insensitive',
                },
              },
            },

            {
              actor: {
                email: {
                  contains: query.search,

                  mode: 'insensitive',
                },
              },
            },

            {
              application: {
                name: {
                  contains: query.search,

                  mode: 'insensitive',
                },
              },
            },
          ]
        : undefined,
    };
  }
}
