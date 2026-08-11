import { InvitationMailer } from './invitation-mailer.service';
import { InvitationTokenService } from './invitation-token.service';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../../database/prisma.service';
import { InvitationDeliveryStatus, NotificationType, Prisma, WorkspaceInvitationStatus } from '../../../generated/prisma/client';
import type { CreateWorkspaceInvitationDto, InvitationListQueryDto } from '../dto/workspace-invitation.dto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class WorkspaceInvitationService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly tokens: InvitationTokenService,

    private readonly mailer: InvitationMailer,

    private readonly notifications: NotificationService,
  ) {}

  async create(
    workspaceId: string,

    invitedById: string,

    input: CreateWorkspaceInvitationDto,
  ) {
    const email = this.normalizeEmail(input.email);

    const [workspace, inviter, existingUser] = await Promise.all([
      this.prisma.workspace.findUnique({
        where: {
          id: workspaceId,
        },

        select: {
          id: true,
          name: true,
        },
      }),

      this.prisma.user.findUnique({
        where: {
          id: invitedById,
        },

        select: {
          id: true,
          displayName: true,
          email: true,
        },
      }),

      this.prisma.user.findFirst({
        where: {
          email: {
            equals: email,

            mode: 'insensitive',
          },
        },

        select: {
          id: true,
          email: true,
        },
      }),
    ]);

    if (!workspace || !inviter) {
      throw new NotFoundException('Workspace or inviter not found.');
    }

    if (existingUser) {
      const existingMember = await this.prisma.workspaceMember.findFirst({
        where: {
          workspaceId,

          userId: existingUser.id,
        },

        select: {
          id: true,
        },
      });

      if (existingMember) {
        throw new ConflictException('This user is already a workspace member.');
      }
    }

    await this.expirePendingInvitations(workspaceId, email);

    const generated = this.tokens.generate();

    let invitation;

    try {
      invitation = await this.prisma.workspaceInvitation.create({
        data: {
          workspaceId,

          invitedById,

          email,

          role: input.role,

          tokenHash: generated.tokenHash,

          expiresAt: this.tokens.getExpiresAt(),

          sendCount: 1,

          lastSentAt: new Date(),
        },

        include: this.invitationInclude(),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An active invitation already exists for this email.');
      }

      throw error;
    }

    const invitationUrl = this.tokens.createInvitationUrl(generated.rawToken);

    await this.deliverInvitation(
      invitation.id,

      {
        email,

        workspaceName: workspace.name,

        inviterName: inviter.displayName ?? inviter.email,

        role: invitation.role,

        invitationUrl,

        expiresAt: invitation.expiresAt,
      },
    );

    if (existingUser) {
      await this.notifications.createForUser({
        workspaceId,

        userId: existingUser.id,

        type: NotificationType.WORKSPACE_INVITATION,

        title: `Invitation to ${workspace.name}`,

        message: `${inviter.displayName ?? inviter.email} invited you as ${invitation.role}.`,

        resourceType: 'WORKSPACE_INVITATION',

        resourceId: invitation.id,

        actionUrl: `/invitations/${generated.rawToken}`,

        dedupeKey: `workspace-invitation:${invitation.id}`,
      });
    }

    const updated = await this.prisma.workspaceInvitation.findUniqueOrThrow({
      where: {
        id: invitation.id,
      },

      include: this.invitationInclude(),
    });

    return {
      invitation: this.mapInvitation(updated),

      invitationUrl,
    };
  }

  async list(
    workspaceId: string,

    query: InvitationListQueryDto,
  ) {
    await this.expireAllWorkspaceInvitations(workspaceId);

    const invitations = await this.prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,

        status: query.status,
      },

      include: this.invitationInclude(),

      orderBy: {
        createdAt: 'desc',
      },

      take: 200,
    });

    return invitations.map((invitation) => this.mapInvitation(invitation));
  }

  async resend(
    workspaceId: string,

    invitationId: string,
  ) {
    const invitation = await this.requireInvitation(workspaceId, invitationId);

    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new ConflictException('Only pending invitations can be resent.');
    }

    const generated = this.tokens.generate();

    const updated = await this.prisma.workspaceInvitation.update({
      where: {
        id: invitation.id,
      },

      data: {
        tokenHash: generated.tokenHash,

        expiresAt: this.tokens.getExpiresAt(),

        lastSentAt: new Date(),

        sendCount: {
          increment: 1,
        },

        deliveryStatus: InvitationDeliveryStatus.NOT_REQUESTED,

        deliveryError: null,
      },

      include: this.invitationInclude(),
    });

    const invitationUrl = this.tokens.createInvitationUrl(generated.rawToken);

    await this.deliverInvitation(
      updated.id,

      {
        email: updated.email,

        workspaceName: updated.workspace.name,

        inviterName: updated.invitedBy.displayName ?? updated.invitedBy.email,

        role: updated.role,

        invitationUrl,

        expiresAt: updated.expiresAt,
      },
    );

    const result = await this.prisma.workspaceInvitation.findUniqueOrThrow({
      where: {
        id: updated.id,
      },

      include: this.invitationInclude(),
    });

    return {
      invitation: this.mapInvitation(result),

      invitationUrl,
    };
  }

  async revoke(
    workspaceId: string,

    invitationId: string,
  ) {
    const result = await this.prisma.workspaceInvitation.updateMany({
      where: {
        id: invitationId,

        workspaceId,

        status: WorkspaceInvitationStatus.PENDING,
      },

      data: {
        status: WorkspaceInvitationStatus.REVOKED,

        revokedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Pending invitation not found.');
    }

    return {
      success: true,
    };
  }

  async preview(rawToken: string) {
    const invitation = await this.findByToken(rawToken);

    const status = await this.resolveCurrentStatus(invitation);

    return {
      id: invitation.id,

      email: invitation.email,

      role: invitation.role,

      status,

      workspace: {
        id: invitation.workspace.id,

        name: invitation.workspace.name,
      },

      invitedBy: {
        name: invitation.invitedBy.displayName,

        email: invitation.invitedBy.email,
      },

      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async accept(
    rawToken: string,

    userId: string,
  ) {
    const invitation = await this.findByToken(rawToken);

    await this.assertUsable(invitation);

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (this.normalizeEmail(user.email) !== this.normalizeEmail(invitation.email)) {
      throw new ForbiddenException('This invitation belongs to another email address.');
    }

    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.workspaceInvitation.updateMany({
        where: {
          id: invitation.id,

          tokenHash: invitation.tokenHash,

          status: WorkspaceInvitationStatus.PENDING,

          expiresAt: {
            gt: new Date(),
          },
        },

        data: {
          status: WorkspaceInvitationStatus.ACCEPTED,

          acceptedById: user.id,

          acceptedAt: new Date(),
        },
      });

      if (consumed.count !== 1) {
        throw new ConflictException('Invitation is no longer available.');
      }

      const membership = await transaction.workspaceMember.findFirst({
        where: {
          workspaceId: invitation.workspaceId,

          userId: user.id,
        },

        select: {
          id: true,
        },
      });

      if (!membership) {
        await transaction.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,

            userId: user.id,

            role: invitation.role,
          },
        });
      }
    });

    await this.notifications.createForUser({
      workspaceId: invitation.workspaceId,

      userId: invitation.invitedById,

      type: NotificationType.WORKSPACE_INVITATION_ACCEPTED,

      title: 'Workspace invitation accepted',

      message: `${user.displayName ?? user.email} joined ${invitation.workspace.name}.`,

      resourceType: 'WORKSPACE_INVITATION',

      resourceId: invitation.id,

      actionUrl: `/workspaces/${invitation.workspaceId}/settings/members`,

      dedupeKey: `workspace-invitation-accepted:${invitation.id}`,
    });

    return {
      success: true,

      workspaceId: invitation.workspaceId,
    };
  }

  async decline(
    rawToken: string,

    userId: string,
  ) {
    const invitation = await this.findByToken(rawToken);

    await this.assertUsable(invitation);

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        email: true,
      },
    });

    if (!user || this.normalizeEmail(user.email) !== this.normalizeEmail(invitation.email)) {
      throw new ForbiddenException('This invitation belongs to another email address.');
    }

    const result = await this.prisma.workspaceInvitation.updateMany({
      where: {
        id: invitation.id,

        tokenHash: invitation.tokenHash,

        status: WorkspaceInvitationStatus.PENDING,

        expiresAt: {
          gt: new Date(),
        },
      },

      data: {
        status: WorkspaceInvitationStatus.DECLINED,

        declinedAt: new Date(),
      },
    });

    if (result.count !== 1) {
      throw new ConflictException('Invitation is no longer available.');
    }

    return {
      success: true,
    };
  }

  private async deliverInvitation(
    invitationId: string,

    input: Parameters<InvitationMailer['send']>[0],
  ): Promise<void> {
    try {
      const result = await this.mailer.send(input);

      await this.prisma.workspaceInvitation.update({
        where: {
          id: invitationId,
        },

        data: {
          deliveryStatus: result.sent ? InvitationDeliveryStatus.SENT : InvitationDeliveryStatus.NOT_REQUESTED,

          deliveryError: null,
        },
      });
    } catch (error) {
      await this.prisma.workspaceInvitation.update({
        where: {
          id: invitationId,
        },

        data: {
          deliveryStatus: InvitationDeliveryStatus.FAILED,

          deliveryError: error instanceof Error ? error.message.slice(0, 1_000) : 'Invitation email delivery failed.',
        },
      });
    }
  }

  private async findByToken(rawToken: string) {
    if (rawToken.length < 20) {
      throw new NotFoundException('Invitation not found.');
    }

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: {
        tokenHash: this.tokens.hash(rawToken),
      },

      include: this.invitationInclude(),
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    return invitation;
  }

  private async assertUsable(invitation: Awaited<ReturnType<WorkspaceInvitationService['findByToken']>>): Promise<void> {
    const status = await this.resolveCurrentStatus(invitation);

    if (status === WorkspaceInvitationStatus.EXPIRED) {
      throw new ConflictException('Invitation has expired.');
    }

    if (status !== WorkspaceInvitationStatus.PENDING) {
      throw new ConflictException(`Invitation is ${status.toLowerCase()}.`);
    }
  }

  private async resolveCurrentStatus(invitation: Awaited<ReturnType<WorkspaceInvitationService['findByToken']>>) {
    if (invitation.status === WorkspaceInvitationStatus.PENDING && invitation.expiresAt <= new Date()) {
      await this.prisma.workspaceInvitation.updateMany({
        where: {
          id: invitation.id,

          status: WorkspaceInvitationStatus.PENDING,
        },

        data: {
          status: WorkspaceInvitationStatus.EXPIRED,
        },
      });

      return WorkspaceInvitationStatus.EXPIRED;
    }

    return invitation.status;
  }

  private async expirePendingInvitations(
    workspaceId: string,

    email: string,
  ): Promise<void> {
    await this.prisma.workspaceInvitation.updateMany({
      where: {
        workspaceId,

        email: {
          equals: email,

          mode: 'insensitive',
        },

        status: WorkspaceInvitationStatus.PENDING,

        expiresAt: {
          lte: new Date(),
        },
      },

      data: {
        status: WorkspaceInvitationStatus.EXPIRED,
      },
    });
  }

  private async expireAllWorkspaceInvitations(workspaceId: string): Promise<void> {
    await this.prisma.workspaceInvitation.updateMany({
      where: {
        workspaceId,

        status: WorkspaceInvitationStatus.PENDING,

        expiresAt: {
          lte: new Date(),
        },
      },

      data: {
        status: WorkspaceInvitationStatus.EXPIRED,
      },
    });
  }

  private async requireInvitation(
    workspaceId: string,

    invitationId: string,
  ) {
    const invitation = await this.prisma.workspaceInvitation.findFirst({
      where: {
        id: invitationId,

        workspaceId,
      },

      include: this.invitationInclude(),
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    return invitation;
  }

  private invitationInclude() {
    return {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },

      invitedBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },

      acceptedBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    } as const;
  }

  private mapInvitation(invitation: Awaited<ReturnType<WorkspaceInvitationService['requireInvitation']>>) {
    return {
      id: invitation.id,

      workspaceId: invitation.workspaceId,

      email: invitation.email,

      role: invitation.role,

      status: invitation.status,

      deliveryStatus: invitation.deliveryStatus,

      deliveryError: invitation.deliveryError,

      expiresAt: invitation.expiresAt.toISOString(),

      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,

      declinedAt: invitation.declinedAt?.toISOString() ?? null,

      revokedAt: invitation.revokedAt?.toISOString() ?? null,

      lastSentAt: invitation.lastSentAt?.toISOString() ?? null,

      sendCount: invitation.sendCount,

      createdAt: invitation.createdAt.toISOString(),

      invitedBy: invitation.invitedBy,

      acceptedBy: invitation.acceptedBy,
    };
  }

  private normalizeEmail(value: string): string {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException('Email is required.');
    }

    return normalized;
  }
}
