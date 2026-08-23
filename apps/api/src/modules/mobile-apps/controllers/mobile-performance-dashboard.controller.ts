import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { CompareMobilePerformanceDto, MobilePerformanceQueryDto } from '../dto/mobile-performance-dashboard.dto';
import { MobilePerformanceDashboardService } from '../services/mobile-performance-dashboard.service';
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Mobile Performance Dashboard')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId/performance')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class MobilePerformanceDashboardController {
  constructor(private readonly service: MobilePerformanceDashboardService) {}

  @Get('summary')
  summary(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Query()
    query: MobilePerformanceQueryDto,
  ) {
    return this.service.summary(workspaceId, mobileAppId, query);
  }

  @Get('versions')
  versions(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Query()
    query: MobilePerformanceQueryDto,
  ) {
    return this.service.versions(workspaceId, mobileAppId, query);
  }

  @Get('issues')
  issues(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Query()
    query: MobilePerformanceQueryDto,
  ) {
    return this.service.issues(workspaceId, mobileAppId, query);
  }

  @Get('compare')
  compare(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Query()
    query: CompareMobilePerformanceDto,
  ) {
    return this.service.compare(workspaceId, mobileAppId, query.fromVersion, query.toVersion);
  }
}
