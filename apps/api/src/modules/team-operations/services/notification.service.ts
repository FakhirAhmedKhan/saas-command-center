 
 
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  NotificationPriority,
  NotificationType,
  Prisma,
} from '../../../generated/prisma/client';

import {
  PrismaService,
} from '../../../database/prisma.service';

export interface CreateNotificationInput {
  workspaceId: string;
  userId: string;

  applicationId?: string | null;

  type: NotificationType;

  priority?: NotificationPriority;

  title: string;
  message: string;

  resourceType?: string | null;
  resourceId?: string | null;

  actionUrl?: string | null;

  payload?: Prisma.InputJsonValue;

  dedupeKey?: string | null;

  expiresAt?: Date | null;
}

export interface ListNotificationsInput {
  userId: string;

  workspaceId?: string;

  unreadOnly?: boolean;

  limit?: number;

  cursor?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a notification.
   *
   * When a dedupe key is supplied, the same notification
   * will not be created twice for the same user.
   */
  async create(
    input: CreateNotificationInput,
  ) {
    if (
      input.dedupeKey
    ) {
      const existing =
        await this.prisma.notification.findFirst({
          where: {
            userId:
              input.userId,

            dedupeKey:
              input.dedupeKey,
          },
        });

      if (
        existing
      ) {
        return existing;
      }
    }

    try {
      return await this.prisma.notification.create({
        data: {
          workspaceId:
            input.workspaceId,

          userId:
            input.userId,

          applicationId:
            input.applicationId ??
            null,

          type:
            input.type,

          priority:
            input.priority ??
            NotificationPriority.INFO,

          title:
            input.title,

          message:
            input.message,

          resourceType:
            input.resourceType ??
            null,

          resourceId:
            input.resourceId ??
            null,

          actionUrl:
            input.actionUrl ??
            null,

          payload:
            input.payload,

          dedupeKey:
            input.dedupeKey ??
            null,

          expiresAt:
            input.expiresAt ??
            null,
        },
      });
    } catch (
      error
    ) {
      /*
       * Protect against concurrent duplicate notification
       * creation when two processes perform the same
       * dedupe check at nearly the same time.
       */
      if (
        input.dedupeKey
      ) {
        const existing =
          await this.prisma.notification.findFirst({
            where: {
              userId:
                input.userId,

              dedupeKey:
                input.dedupeKey,
            },
          });

        if (
          existing
        ) {
          return existing;
        }
      }

      throw error;
    }
  }

  /**
   * Alias used by Phase 17 domain services.
   */
  async createForUser(
    input: CreateNotificationInput,
  ) {
    return this.create(input);
  }
  async createNotification(
    input: CreateNotificationInput,
  ) {
    return this.create(
      input,
    );
  }

  /**
   * Another small alias so operational modules can use:
   *
   * notificationService.notify(...)
   */
  async notify(
    input: CreateNotificationInput,
  ) {
    return this.create(
      input,
    );
  }

  /**
   * List notifications belonging to one authenticated user.
   */
  async list(
    input: ListNotificationsInput,
  ) {
    const limit =
      Math.min(
        Math.max(
          input.limit ??
            30,
          1,
        ),
        100,
      );

    const now =
      new Date();

    const items =
      await this.prisma.notification.findMany({
        where: {
          userId:
            input.userId,

          workspaceId:
            input.workspaceId,

          readAt:
            input.unreadOnly
              ? null
              : undefined,

          OR: [
            {
              expiresAt:
                null,
            },
            {
              expiresAt: {
                gt:
                  now,
              },
            },
          ],
        },

        orderBy: {
          createdAt:
            'desc',
        },

        take:
          limit + 1,

        ...(input.cursor
          ? {
              cursor: {
                id:
                  input.cursor,
              },

              skip:
                1,
            }
          : {}),
      });

    const hasMore =
      items.length >
      limit;

    const results =
      hasMore
        ? items.slice(
            0,
            limit,
          )
        : items;

    return {
      items:
        results,

      nextCursor:
        hasMore
          ? results[
              results.length -
                1
            ]?.id ??
            null
          : null,
    };
  }

  /**
   * Compatibility alias for controllers/services that use
   * listForUser().
   */
  async listForUser(
    input: ListNotificationsInput,
  ) {
    return this.list(
      input,
    );
  }

  /**
   * Return unread notifications count for one user.
   */
  async getUnreadCount(
    userId: string,
    workspaceId?: string,
  ) {
    const now =
      new Date();

    const count =
      await this.prisma.notification.count({
        where: {
          userId,

          workspaceId,

          readAt:
            null,

          OR: [
            {
              expiresAt:
                null,
            },
            {
              expiresAt: {
                gt:
                  now,
              },
            },
          ],
        },
      });

    return {
      count,
    };
  }

  /**
   * Compatibility alias.
   */
  async unreadCount(
    userId: string,
    workspaceId?: string,
  ) {
    return this.getUnreadCount(
      userId,
      workspaceId,
    );
  }

  /**
   * Mark one notification as read.
   *
   * userId is part of the filter so a user cannot mutate
   * another user's notification.
   */
  async markRead(
    userId: string,
    notificationId: string,
  ) {
    const notification =
      await this.prisma.notification.findFirst({
        where: {
          id:
            notificationId,

          userId,
        },
      });

    if (
      !notification
    ) {
      throw new NotFoundException(
        'Notification not found.',
      );
    }

    if (
      notification.readAt
    ) {
      return notification;
    }

    return this.prisma.notification.update({
      where: {
        id:
          notification.id,
      },

      data: {
        readAt:
          new Date(),
      },
    });
  }

  /**
   * Compatibility alias.
   */
  async markAsRead(
    userId: string,
    notificationId: string,
  ) {
    return this.markRead(
      userId,
      notificationId,
    );
  }

  /**
   * Mark all unread notifications belonging to the user
   * as read.
   *
   * workspaceId can optionally scope the operation.
   */
  async markAllRead(
    userId: string,
    workspaceId?: string,
  ) {
    const result =
      await this.prisma.notification.updateMany({
        where: {
          userId,

          workspaceId,

          readAt:
            null,
        },

        data: {
          readAt:
            new Date(),
        },
      });

    return {
      updated:
        result.count,
    };
  }

  /**
   * Compatibility alias.
   */
  async markAllAsRead(
    userId: string,
    workspaceId?: string,
  ) {
    return this.markAllRead(
      userId,
      workspaceId,
    );
  }

  /**
   * Delete expired notifications.
   *
   * This can later be called from the Phase 17 cleanup
   * scheduler.
   */
  async cleanupExpired() {
    const result =
      await this.prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lte:
              new Date(),
          },
        },
      });

    return {
      deleted:
        result.count,
    };
  }
}