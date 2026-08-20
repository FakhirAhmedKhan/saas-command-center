import { PrismaService } from '../../../database/prisma.service';
import { Prisma, WorkspaceRole } from '../../../generated/prisma/client';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

const workspaceSummarySelect = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  _count: {
    select: {
      members: true,
    },
  },
} satisfies Prisma.WorkspaceSelect;

export type WorkspaceSummary = Prisma.WorkspaceGetPayload<{
  select: typeof workspaceSummarySelect;
}>;

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  ownerId: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
}

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWorkspaceInput): Promise<WorkspaceSummary> {
    const name = this.normalizeName(input.name);
    const slug = this.normalizeSlug(input.slug || name);

    return this.prisma.$transaction(async (transaction) => {
      const owner = await transaction.user.findFirst({
        where: {
          id: input.ownerId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!owner) {
        throw new NotFoundException('Workspace owner not found');
      }

      const workspace = await transaction.workspace.create({
        data: {
          name,
          slug,
          ownerId: input.ownerId,
        },
      });

      await transaction.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: input.ownerId,
          role: WorkspaceRole.OWNER,
        },
      });

      return transaction.workspace.findUniqueOrThrow({
        where: {
          id: workspace.id,
        },
        select: workspaceSummarySelect,
      });
    });
  }
  async transferOwnership(workspaceId: string, currentOwnerId: string, newOwnerId: string): Promise<WorkspaceSummary> {
    if (currentOwnerId === newOwnerId) {
      throw new BadRequestException('The selected user already owns the workspace');
    }

    return this.prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.findFirst({
        where: {
          id: workspaceId,
          deletedAt: null,
        },
      });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      if (workspace.ownerId !== currentOwnerId) {
        throw new ForbiddenException('Only the workspace owner can transfer ownership');
      }

      const newOwnerMembership = await transaction.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: newOwnerId,
          },
        },
      });

      if (!newOwnerMembership) {
        throw new BadRequestException('The new owner must already be a workspace member');
      }

      await transaction.workspace.update({
        where: {
          id: workspaceId,
        },
        data: {
          ownerId: newOwnerId,
        },
      });

      await transaction.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: currentOwnerId,
          },
        },
        data: {
          role: WorkspaceRole.ADMIN,
        },
      });

      await transaction.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: newOwnerId,
          },
        },
        data: {
          role: WorkspaceRole.OWNER,
        },
      });

      return transaction.workspace.findUniqueOrThrow({
        where: {
          id: workspaceId,
        },
        select: workspaceSummarySelect,
      });
    });
  }
  async findById(id: string): Promise<WorkspaceSummary | null> {
    return this.prisma.workspace.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: workspaceSummarySelect,
    });
  }

  async findByIdOrThrow(id: string): Promise<WorkspaceSummary> {
    const workspace = await this.findById(id);

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async findForUser(workspaceId: string, userId: string) {
    return this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        ...workspaceSummarySelect,
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        ...workspaceSummarySelect,
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async update(id: string, input: UpdateWorkspaceInput): Promise<WorkspaceSummary> {
    await this.findByIdOrThrow(id);

    return this.prisma.workspace.update({
      where: {
        id,
      },
      data: {
        ...(input.name !== undefined
          ? {
              name: this.normalizeName(input.name),
            }
          : {}),
        ...(input.slug !== undefined
          ? {
              slug: this.normalizeSlug(input.slug),
            }
          : {}),
      },
      select: workspaceSummarySelect,
    });
  }

  async softDelete(id: string): Promise<WorkspaceSummary> {
    await this.findByIdOrThrow(id);

    return this.prisma.workspace.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
      select: workspaceSummarySelect,
    });
  }

  private normalizeName(name: string): string {
    const normalized = name.trim();

    if (normalized.length < 2) {
      throw new BadRequestException('Workspace name must contain at least 2 characters');
    }

    if (normalized.length > 120) {
      throw new BadRequestException('Workspace name cannot exceed 120 characters');
    }

    return normalized;
  }

  private normalizeSlug(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (slug.length < 2) {
      throw new BadRequestException('Workspace slug is invalid');
    }

    if (slug.length > 120) {
      throw new BadRequestException('Workspace slug cannot exceed 120 characters');
    }

    return slug;
  }
}
