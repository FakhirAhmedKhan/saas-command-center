import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { IngestDesktopBuildArtifactDto } from '../dto/desktop-build-artifact.dto';
import { DesktopBuildArtifactsService } from '../services/desktop-build-artifacts.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Build Artifacts')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/builds/:buildId/artifacts')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopBuildArtifactsController {
  constructor(private readonly service: DesktopBuildArtifactsService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,
  ) {
    return this.service.list(workspaceId, desktopAppId, buildId);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  ingest(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,

    @Body()
    dto: IngestDesktopBuildArtifactDto,
  ) {
    return this.service.ingest(workspaceId, desktopAppId, buildId, dto);
  }
}
