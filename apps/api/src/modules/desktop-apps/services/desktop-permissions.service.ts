import { PrismaService } from '../../../database/prisma.service';
import type { DesktopPermissions } from '@command-center/shared-types';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@Injectable()
export class DesktopPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(workspaceId: string, userId: string): Promise<DesktopPermissions> {
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
      throw new ForbiddenException('Workspace access denied.');
    }

    const canWrite = membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN || membership.role === WorkspaceRole.DEVELOPER;

    const canManage = membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN;

    return {
      role: membership.role,
      canRead: true,
      canWrite,
      canManage,
      canAnalyze: canWrite,
      canConfigureSecrets: canManage,
    };
  }
}