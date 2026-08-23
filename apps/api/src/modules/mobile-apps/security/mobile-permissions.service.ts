import { PrismaService } from '../../../database/prisma.service';
import type { MobilePermissionSnapshot } from '@command-center/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@Injectable()
export class MobilePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(workspaceId: string, userId: string): Promise<MobilePermissionSnapshot> {
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

    const canWrite = membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN || membership.role === WorkspaceRole.DEVELOPER;

    const canAdmin = membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN;

    return {
      role: membership.role,

      canRead: true,

      canWrite,

      canAdmin,

      canManageSecrets: canAdmin,
    };
  }
}
