import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { DesktopPermissionsService } from '../services/desktop-permissions.service';
import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Desktop Security')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopSecurityController {
  constructor(private readonly permissions: DesktopPermissionsService) {}

  @Get('permissions')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER, WorkspaceRole.VIEWER)
  getPermissions(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) _desktopAppId: string, @Req() request: AuthenticatedRequest) {
    void _desktopAppId;
    return this.permissions.get(workspaceId, request.user.id);
  }
}
