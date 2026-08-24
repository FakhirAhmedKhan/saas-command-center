import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { ConnectDesktopTelemetryDto } from '../dto/desktop-telemetry.dto';
import { DesktopTelemetryService } from '../services/desktop-telemetry.service';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Telemetry')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/telemetry')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopTelemetryController {
  constructor(private readonly service: DesktopTelemetryService) {}

  @Get()
  list(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string) {
    return this.service.list(workspaceId, desktopAppId);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({ summary: 'Configure a desktop telemetry provider' })
  connect(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string, @Body() dto: ConnectDesktopTelemetryDto) {
    return this.service.connect(workspaceId, desktopAppId, dto);
  }

  @Post(':integrationId/preview')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  preview(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string, @Param('integrationId', ParseUUIDPipe) integrationId: string) {
    return this.service.preview(workspaceId, desktopAppId, integrationId);
  }

  @Delete(':integrationId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  disconnect(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string, @Param('integrationId', ParseUUIDPipe) integrationId: string) {
    return this.service.disconnect(workspaceId, desktopAppId, integrationId);
  }
}
