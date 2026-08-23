import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { ConnectMobileTelemetryDto } from '../dto/mobile-telemetry.dto';
import { MobileTelemetryService } from '../services/mobile-telemetry.service';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Mobile Telemetry')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId/telemetry')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class MobileTelemetryController {
  constructor(private readonly service: MobileTelemetryService) {}

  @Get()
  getIntegration(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.getIntegration(workspaceId, mobileAppId);
  }

  @Post('connect')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  connect(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Body()
    dto: ConnectMobileTelemetryDto,
  ) {
    return this.service.connect(workspaceId, mobileAppId, dto);
  }

  @Post('sync')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  sync(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.sync(workspaceId, mobileAppId);
  }

  @Delete()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  disconnect(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.disconnect(workspaceId, mobileAppId);
  }
}
