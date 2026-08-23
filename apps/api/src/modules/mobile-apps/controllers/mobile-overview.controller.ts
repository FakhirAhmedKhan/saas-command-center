import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { MobileOverviewService } from '../services/mobile-overview.service';
import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Mobile Application Overview')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class MobileOverviewController {
  constructor(private readonly service: MobileOverviewService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get mobile application overview',
  })
  overview(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.getOverview(workspaceId, mobileAppId);
  }
}
