import { ForbiddenException, Injectable } from '@nestjs/common';

import { WorkspaceRole } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AnalyticsProcessingAccessService {
  getCanReprocess(workspaceId: string, userId: string): any {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly prisma: PrismaService) {}

  async assertCanReprocess(workspaceId: string, userId: string): Promise<void> {
    await this.assertCanManageProcessing(workspaceId, userId);
  }

  async assertCanRetry(workspaceId: string, userId: string): Promise<void> {
    await this.assertCanManageProcessing(workspaceId, userId);
  }

  private async assertCanManageProcessing(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },

      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace.');
    }

    const allowed =
      membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN;

    if (!allowed) {
      throw new ForbiddenException('Your workspace role does not permit analytics reprocessing.');
    }
  }
}
