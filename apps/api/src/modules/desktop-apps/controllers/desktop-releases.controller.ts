import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateDesktopReleaseDto, DesktopReleaseQueryDto, UpdateDesktopReleaseStatusDto } from '../dto/desktop-release.dto';
import { DesktopReleasesService } from '../services/desktop-releases.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Releases')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/releases')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopReleasesController {
  constructor(private readonly service: DesktopReleasesService) {}

  @Get()
  @ApiOperation({
    summary: 'List desktop releases',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Query()
    query: DesktopReleaseQueryDto,
  ) {
    return this.service.list(workspaceId, desktopAppId, query);
  }

  @Get(':releaseId')
  @ApiOperation({
    summary: 'Get a desktop release',
  })
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('releaseId', ParseUUIDPipe)
    releaseId: string,
  ) {
    return this.service.findOne(workspaceId, desktopAppId, releaseId);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Create a desktop release from a successful build',
  })
  create(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Body()
    dto: CreateDesktopReleaseDto,
  ) {
    return this.service.create(workspaceId, desktopAppId, dto);
  }

  @Patch(':releaseId/status')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Transition a desktop release status',
  })
  updateStatus(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('releaseId', ParseUUIDPipe)
    releaseId: string,

    @Body()
    dto: UpdateDesktopReleaseStatusDto,
  ) {
    return this.service.updateStatus(workspaceId, desktopAppId, releaseId, dto);
  }
}
