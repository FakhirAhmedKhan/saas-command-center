import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationListQueryDto } from '../dto/notification.dto';
import { NotificationService } from '../services/notification.service';
import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(
    @Req()
    request: AuthenticatedRequest,

    @Query()
    query: NotificationListQueryDto,
  ) {
    return this.notifications.list({
      userId: request.user.id,

      ...query,
    });
  }

  @Get('unread-count')
  unreadCount(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.notifications.getUnreadCount(request.user.id);
  }

  @Post('mark-all-read')
  markAllRead(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.notifications.markAllRead(request.user.id);
  }

  @Post(':notificationId/read')
  markRead(
    @Req()
    request: AuthenticatedRequest,

    @Param('notificationId', ParseUUIDPipe)
    notificationId: string,
  ) {
    return this.notifications.markRead(request.user.id, notificationId);
  }
}
