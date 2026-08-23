import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { IngestMobileTestRunDto } from '../dto/mobile-test.dto';
import { MobileTestsService } from '../services/mobile-tests.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Mobile Tests')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class MobileTestsController {
  constructor(private readonly service: MobileTestsService) {}

  @Get('tests')
  dashboard(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.dashboard(workspaceId, mobileAppId);
  }

  @Get('builds/:buildId/tests')
  listBuildTests(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,
  ) {
    return this.service.listForBuild(workspaceId, mobileAppId, buildId);
  }

  @Post('builds/:buildId/tests/ingest')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  ingest(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Param('buildId', ParseUUIDPipe)
    buildId: string,

    @Body()
    dto: IngestMobileTestRunDto,
  ) {
    return this.service.ingest(workspaceId, mobileAppId, buildId, dto);
  }
}
