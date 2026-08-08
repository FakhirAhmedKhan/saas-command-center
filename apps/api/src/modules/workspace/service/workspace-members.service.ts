import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma, WorkspaceRole } from 'src/generated/prisma/client';

const memberSelect = {
  id: true,
  workspaceId: true,
  userId: true,
  role: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
      isActive: true,
    },
  },
} satisfies Prisma.WorkspaceMemberSelect;

export type WorkspaceMemberDetails = Prisma.WorkspaceMemberGetPayload<{
  select: typeof memberSelect;
}>;

export interface AddWorkspaceMemberInput {
  workspaceId: string;
  userId: string;
  role?: WorkspaceRole;
}

@Injectable()
export class WorkspaceMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async addMember(input: AddWorkspaceMemberInput): Promise<WorkspaceMemberDetails> {
    if (input.role === WorkspaceRole.OWNER) {
      throw new ConflictException('Use ownership transfer to assign the OWNER role.');
    }

    return this.prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.findFirst({
        where: {
          id: input.workspaceId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      const user = await transaction.user.findFirst({
        where: {
          id: input.userId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existingMembership = await transaction.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingMembership) {
        throw new ConflictException('User is already a workspace member');
      }

      return transaction.workspaceMember.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role ?? WorkspaceRole.VIEWER,
        },
        select: memberSelect,
      });
    });
  }

  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberDetails | null> {
    return this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        workspace: {
          deletedAt: null,
        },
        user: {
          isActive: true,
          deletedAt: null,
        },
      },
      select: memberSelect,
    });
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberDetails[]> {
    return this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        workspace: {
          deletedAt: null,
        },
      },
      select: memberSelect,
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  async updateRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberDetails> {
    return this.prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.findFirst({
        where: {
          id: workspaceId,
          deletedAt: null,
        },
        select: {
          ownerId: true,
        },
      });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      const membership = await transaction.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new NotFoundException('Workspace membership not found');
      }

      if (workspace.ownerId === userId && role !== WorkspaceRole.OWNER) {
        throw new ConflictException(
          'The workspace owner cannot be demoted. Transfer ownership first.',
        );
      }

      if (workspace.ownerId !== userId && role === WorkspaceRole.OWNER) {
        throw new ConflictException('Use ownership transfer to assign the OWNER role.');
      }

      return transaction.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        data: {
          role,
        },
        select: memberSelect,
      });
    });
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.findFirst({
        where: {
          id: workspaceId,
          deletedAt: null,
        },
        select: {
          ownerId: true,
        },
      });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      if (workspace.ownerId === userId) {
        throw new ConflictException(
          'The workspace owner cannot be removed. Transfer ownership first.',
        );
      }

      const membership = await transaction.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        throw new NotFoundException('Workspace membership not found');
      }

      await transaction.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });
    });
  }
}
