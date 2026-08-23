import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { MobilePermissionsService } from '../security/mobile-permissions.service';
import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@ApiTags('Mobile Security')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-security')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class MobileSecurityController {
  constructor(private readonly permissions: MobilePermissionsService) {}

  @Get('permissions')
  permissionsForCurrentUser(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.permissions.getForUser(workspaceId, request.user.id);
  }
}
