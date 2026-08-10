import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { RawEventQueryDto } from '../dto/raw-event-query.dto';
import { TrackingAdminService } from '../services/tracking-admin.service';

@ApiTags('Website Tracking')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/websites/:websiteId/tracking')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class TrackingAdminController {
  constructor(private readonly trackingAdminService: TrackingAdminService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get website tracking status',
  })
  getStatus(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.trackingAdminService.getStatus(workspaceId, websiteId);
  }

  @Get('events')
  @ApiOperation({
    summary: 'List raw tracking events',
  })
  listEvents(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,

    @Query()
    query: RawEventQueryDto,
  ) {
    return this.trackingAdminService.listEvents(workspaceId, websiteId, query);
  }
}
