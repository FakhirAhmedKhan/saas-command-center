import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { IngestDesktopTestRunDto } from '../dto/desktop-test.dto';
import { DesktopTestsService } from '../services/desktop-tests.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Tests')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopTestsController {
  constructor(private readonly service: DesktopTestsService) {}

  @Get('tests')
  listForApp(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.service.listForApp(workspaceId, desktopAppId);
  }

  @Get('tests/summary')
  summary(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.service.summary(workspaceId, desktopAppId);
  }

  @Get('builds/:buildId/tests')
  listForBuild(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,
  ) {
    return this.service.listForBuild(workspaceId, desktopAppId, buildId);
  }

  @Post('builds/:buildId/tests')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  ingest(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,

    @Body()
    dto: IngestDesktopTestRunDto,
  ) {
    return this.service.ingest(workspaceId, desktopAppId, buildId, dto);
  }
}
