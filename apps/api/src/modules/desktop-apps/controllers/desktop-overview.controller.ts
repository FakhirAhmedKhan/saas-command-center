import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { DesktopOverviewService } from '../services/desktop-overview.service';
import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Desktop Application Overview')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class DesktopOverviewController {
  constructor(private readonly service: DesktopOverviewService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get the desktop application overview',
  })
  get(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.service.get(workspaceId, desktopAppId);
  }
}
