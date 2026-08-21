import { SharedRateLimit } from '../../../common/rate-limit/shared-rate-limit.decorator';
import { SharedRateLimitGuard } from '../../../common/rate-limit/shared-rate-limit.guard';
import { WorkspaceRole } from '../../../generated/prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateWorkspaceInvitationDto, InvitationListQueryDto } from '../dto/workspace-invitation.dto';
import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@ApiTags('Workspace Invitations')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/invitations')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard, SharedRateLimitGuard)
export class WorkspaceInvitationsController {
  constructor(private readonly invitations: WorkspaceInvitationService) {}

  @Get()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Query()
    query: InvitationListQueryDto,
  ) {
    return this.invitations.list(workspaceId, query);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @SharedRateLimit({
    scope: 'workspace-invitation-create',
    limit: 20,
    windowSeconds: 60 * 60,
  })
  create(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Body()
    input: CreateWorkspaceInvitationDto,
  ) {
    return this.invitations.create(workspaceId, request.user.id, input);
  }

  @Post(':invitationId/resend')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @SharedRateLimit({
    scope: 'workspace-invitation-resend',
    limit: 5,
    windowSeconds: 15 * 60,
  })
  resend(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('invitationId', ParseUUIDPipe)
    invitationId: string,
  ) {
    return this.invitations.resend(workspaceId, invitationId);
  }

  @Post(':invitationId/revoke')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  revoke(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('invitationId', ParseUUIDPipe)
    invitationId: string,
  ) {
    return this.invitations.revoke(workspaceId, invitationId);
  }
}
