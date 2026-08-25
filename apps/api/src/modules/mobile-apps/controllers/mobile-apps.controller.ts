import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateMobileAppDto, UpdateMobileAppDto } from '../dto/mobile-app.dto';
import { MobileAppsService } from '../services/mobile-apps.service';
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

@ApiTags('Mobile Applications')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class MobileAppsController {
  constructor(private readonly mobileAppsService: MobileAppsService) {}

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Create a mobile application',
  })
  create(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Body()
    dto: CreateMobileAppDto,
  ) {
    return this.mobileAppsService.create(workspaceId, dto, request.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List workspace mobile applications',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.mobileAppsService.list(workspaceId);
  }

  @Get(':mobileAppId')
  @ApiOperation({
    summary: 'Get a mobile application',
  })
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.mobileAppsService.findOne(workspaceId, mobileAppId);
  }

  @Patch(':mobileAppId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Update a mobile application',
  })
  update(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Body()
    dto: UpdateMobileAppDto,
  ) {
    return this.mobileAppsService.update(workspaceId, mobileAppId, dto, request.user.id);
  }

  @Delete(':mobileAppId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({
    summary: 'Archive a mobile application',
  })
  archive(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.mobileAppsService.archive(workspaceId, mobileAppId, request.user.id);
  }
}
