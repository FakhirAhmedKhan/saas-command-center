import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@ApiTags('Invitation Response')
@Controller('invitations')
export class InvitationResponseController {
  constructor(private readonly invitations: WorkspaceInvitationService) {}

  @Public()
  @Get(':token')
  preview(
    @Param('token')
    token: string,
  ) {
    return this.invitations.preview(token);
  }

  @Post(':token/accept')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  accept(
    @Req()
    request: AuthenticatedRequest,

    @Param('token')
    token: string,
  ) {
    return this.invitations.accept(token, request.user.id);
  }

  @Post(':token/decline')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  decline(
    @Req()
    request: AuthenticatedRequest,

    @Param('token')
    token: string,
  ) {
    return this.invitations.decline(token, request.user.id);
  }
}
