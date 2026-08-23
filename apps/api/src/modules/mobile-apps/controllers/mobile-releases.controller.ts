import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateMobileReleaseDto, MobileReleaseQueryDto, UpdateMobileReleaseStatusDto } from '../dto/mobile-release.dto';
import { MobileReleasesService } from '../services/mobile-releases.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Mobile Releases')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId/releases')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class MobileReleasesController {
  constructor(private readonly service: MobileReleasesService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Query()
    query: MobileReleaseQueryDto,
  ) {
    return this.service.list(workspaceId, mobileAppId, query);
  }

  @Get(':releaseId')
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Param('releaseId', ParseUUIDPipe)
    releaseId: string,
  ) {
    return this.service.findOne(workspaceId, mobileAppId, releaseId);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  create(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Body()
    dto: CreateMobileReleaseDto,
  ) {
    return this.service.create(workspaceId, mobileAppId, dto);
  }

  @Patch(':releaseId/status')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  updateStatus(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Param('releaseId', ParseUUIDPipe)
    releaseId: string,

    @Body()
    dto: UpdateMobileReleaseStatusDto,
  ) {
    return this.service.updateStatus(workspaceId, mobileAppId, releaseId, dto);
  }
}
