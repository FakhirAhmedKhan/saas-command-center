import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateDesktopAppDto, UpdateDesktopAppDto } from '../dto/desktop-app.dto';
import { DesktopAppsService } from '../services/desktop-apps.service';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;

    email?: string;
  };
}

@ApiTags('Desktop Applications')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopAppsController {
  constructor(private readonly desktopAppsService: DesktopAppsService) {}

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Create a desktop application',
  })
  create(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Body()
    dto: CreateDesktopAppDto,
  ) {
    return this.desktopAppsService.create(workspaceId, dto, request.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List workspace desktop applications',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.desktopAppsService.list(workspaceId);
  }

  @Get(':desktopAppId')
  @ApiOperation({
    summary: 'Get a desktop application',
  })
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.desktopAppsService.findOne(workspaceId, desktopAppId);
  }

  @Patch(':desktopAppId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Update a desktop application',
  })
  update(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Body()
    dto: UpdateDesktopAppDto,
  ) {
    return this.desktopAppsService.update(workspaceId, desktopAppId, dto, request.user.id);
  }

  @Delete(':desktopAppId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({
    summary: 'Archive a desktop application',
  })
  archive(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.desktopAppsService.archive(workspaceId, desktopAppId, request.user.id);
  }
}
