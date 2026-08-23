import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { IngestGithubMobileBuildDto, MobileBuildQueryDto } from '../dto/mobile-build.dto';
import { MobileBuildsService } from '../services/mobile-builds.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Mobile Builds')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId/builds')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class MobileBuildsController {
  constructor(private readonly service: MobileBuildsService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Query()
    query: MobileBuildQueryDto,
  ) {
    return this.service.list(workspaceId, mobileAppId, query);
  }

  @Get(':buildId')
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,
  ) {
    return this.service.findOne(workspaceId, mobileAppId, buildId);
  }

  /*
   * This normalized endpoint is also useful for
   * deterministic tests and explicit CI sync.
   *
   * Your existing GitHub webhook adapter should
   * ultimately call the same service method rather
   * than creating a second build implementation.
   */
  @Post('ingest/github')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  ingestGithub(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Body()
    dto: IngestGithubMobileBuildDto,
  ) {
    return this.service.ingestGithubBuild(workspaceId, mobileAppId, dto);
  }
}
