import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { AnalyticsAggregateQueryDto, ProcessAnalyticsDto, ReprocessAnalyticsDto } from '../dto/analytics-engine.dto';
import { AnalyticsEngineQueryService } from '../services/analytics-engine-query.service';
import { AnalyticsProcessingService } from '../services/analytics-processing.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

const WRITE_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER];
const ADMIN_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

@ApiTags('Analytics Engine')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/websites/:websiteId/analytics-engine')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class AnalyticsEngineController {
  constructor(
    private readonly queryService: AnalyticsEngineQueryService,

    private readonly processingService: AnalyticsProcessingService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get analytics-engine processing status',
  })
  getStatus(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.queryService.getStatus(workspaceId, websiteId);
  }

  @Get('aggregates')
  @ApiOperation({
    summary: 'Inspect hourly or daily aggregates',
  })
  getAggregates(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,

    @Query()
    query: AnalyticsAggregateQueryDto,
  ) {
    return this.queryService.listAggregates(workspaceId, websiteId, query);
  }

  @Post('process')
  @WorkspaceRoles(...WRITE_ROLES)
  async process(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,

    @Body()
    dto: ProcessAnalyticsDto,
  ) {
    const run = await this.processingService.processForWorkspace(workspaceId, websiteId, request.user.id, dto.maxEvents);
    const status = await this.queryService.getStatus(workspaceId, websiteId);

    return {
      run,
      status,
    };
  }

  @Post('reprocess')
  @WorkspaceRoles(...ADMIN_ROLES)
  async reprocess(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,

    @Body()
    dto: ReprocessAnalyticsDto,
  ) {
    const run = await this.processingService.reprocessRange(workspaceId, websiteId, dto, request.user.id);
    const status = await this.queryService.getStatus(workspaceId, websiteId);

    return {
      run,
      status,
    };
  }

  @Post('retention')
  @WorkspaceRoles(...ADMIN_ROLES)
  runRetention(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,
  ) {
    return this.processingService.runRetention(workspaceId, websiteId);
  }
}
