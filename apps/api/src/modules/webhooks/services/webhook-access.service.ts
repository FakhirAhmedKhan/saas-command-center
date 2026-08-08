import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

const WEBHOOK_MANAGEMENT_ROLES = new Set(['OWNER', 'ADMIN', 'DEVELOPER']);

@Injectable()
export class WebhookAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async canManage(
    workspaceId: string,

    userId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,

        userId,
      },

      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Workspace membership not found.');
    }

    return WEBHOOK_MANAGEMENT_ROLES.has(String(membership.role));
  }

  async assertCanManage(
    workspaceId: string,

    userId: string,
  ): Promise<void> {
    const allowed = await this.canManage(workspaceId, userId);

    if (!allowed) {
      throw new ForbiddenException('Your workspace role cannot manage integrations.');
    }
  }
}
