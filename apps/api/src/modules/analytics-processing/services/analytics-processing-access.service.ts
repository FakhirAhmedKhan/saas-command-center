import { PrismaService } from '../../../database/prisma.service';
import { WorkspaceRole } from '../../../generated/prisma/client';
import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsProcessingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanReprocess(workspaceId: string, userId: string): Promise<void> {
    await this.assertCanManageProcessing(workspaceId, userId);
  }

  async assertCanRetry(workspaceId: string, userId: string): Promise<void> {
    await this.assertCanManageProcessing(workspaceId, userId);
  }

  /**
   * Non-throwing variant of assertCanReprocess used by AnalyticsProcessingStatusService to
   * populate AnalyticsProcessingStatusDto.canReprocess. A membership lookup miss (outsider)
   * is treated as "cannot reprocess" rather than throwing, since WorkspaceAccessGuard already
   * rejects outsiders before this ever runs; a member simply lacking OWNER/ADMIN role also
   * resolves to false instead of throwing, matching the read-only nature of the status endpoint.
   */
  async getCanReprocess(workspaceId: string, userId: string): Promise<boolean> {
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

    return membership?.role === WorkspaceRole.OWNER || membership?.role === WorkspaceRole.ADMIN;
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

    const allowed = membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN;

    if (!allowed) {
      throw new ForbiddenException('Your workspace role does not permit analytics reprocessing.');
    }
  }
}
