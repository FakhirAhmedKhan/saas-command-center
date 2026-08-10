import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { ConnectWebsiteDto, CreateWebsiteDto, UpdateWebsiteDto, WebsiteListQueryDto } from '../dto/website.dto';
import { WebsitesService } from '../services/websites.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

const WRITE_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER];

const ADMIN_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

@ApiTags('Websites')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/websites')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class WebsitesController {
  constructor(private readonly websitesService: WebsitesService) {}

  @Post()
  @WorkspaceRoles(...WRITE_ROLES)
  @ApiOperation({
    summary: 'Create an analytics website',
  })
  create(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Body()
    dto: CreateWebsiteDto,
  ) {
    return this.websitesService.create(workspaceId, dto, request.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List workspace websites',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Query()
    query: WebsiteListQueryDto,
  ) {
    return this.websitesService.list(workspaceId, query);
  }

  @Get(':websiteId')
  @ApiOperation({
    summary: 'Get website configuration',
  })
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.websitesService.findOne(workspaceId, websiteId);
  }

  @Patch(':websiteId')
  @WorkspaceRoles(...WRITE_ROLES)
  update(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,

    @Body()
    dto: UpdateWebsiteDto,
  ) {
    return this.websitesService.update(workspaceId, websiteId, dto, request.user.id);
  }

  @Post(':websiteId/enable')
  @WorkspaceRoles(...WRITE_ROLES)
  enable(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.websitesService.enable(workspaceId, websiteId, request.user.id);
  }

  @Post(':websiteId/disable')
  @WorkspaceRoles(...WRITE_ROLES)
  disable(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.websitesService.disable(workspaceId, websiteId, request.user.id);
  }

  @Post(':websiteId/archive')
  @WorkspaceRoles(...ADMIN_ROLES)
  archive(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.websitesService.archive(workspaceId, websiteId, request.user.id);
  }

  @Post(':websiteId/restore')
  @WorkspaceRoles(...ADMIN_ROLES)
  restore(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.websitesService.restore(workspaceId, websiteId, request.user.id);
  }

  @Post(':websiteId/rotate-key')
  @WorkspaceRoles(...ADMIN_ROLES)
  rotateTrackingKey(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.websitesService.rotateTrackingKey(workspaceId, websiteId, request.user.id);
  }

  @Post(':websiteId/connect')
  @WorkspaceRoles(...WRITE_ROLES)
  connect(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,

    @Body()
    dto: ConnectWebsiteDto,
  ) {
    return this.websitesService.connect(workspaceId, websiteId, dto, request.user.id);
  }

  @Post(':websiteId/disconnect')
  @WorkspaceRoles(...WRITE_ROLES)
  disconnect(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.websitesService.disconnect(workspaceId, websiteId, request.user.id);
  }
}
