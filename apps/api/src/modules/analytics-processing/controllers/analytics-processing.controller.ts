import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';
import { AnalyticsProcessingTrigger } from '../../../generated/prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { AnalyticsProcessingStatusDto, ProcessingRunDto } from '../dto/analytics-processing-response.dto';
import { ReprocessAnalyticsDto } from '../dto/reprocess-analytics.dto';
import { AnalyticsProcessingAccessService } from '../services/analytics-processing-access.service';
import { AnalyticsProcessingQueueService } from '../services/analytics-processing-queue.service';
import { AnalyticsProcessingStatusService } from '../services/analytics-processing-status.service';

@ApiTags('Analytics Processing')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/websites/:websiteId/analytics/processing')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class AnalyticsProcessingController {
  constructor(
    private readonly status: AnalyticsProcessingStatusService,

    private readonly queue: AnalyticsProcessingQueueService,

    private readonly access: AnalyticsProcessingAccessService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get analytics processing status',
  })
  @ApiOkResponse({
    type: AnalyticsProcessingStatusDto,
  })
  getStatus(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<AnalyticsProcessingStatusDto> {
    return this.status.getStatus(workspaceId, websiteId, user.id);
  }

  @Post('reprocess')
  @ApiOperation({
    summary: 'Queue manual analytics reprocessing',
  })
  @ApiCreatedResponse({
    type: ProcessingRunDto,
  })
  async reprocess(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('websiteId', ParseUUIDPipe)
    websiteId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    body: ReprocessAnalyticsDto,
  ) {
    await this.access.assertCanReprocess(workspaceId, user.id);

    return this.queue.queue({
      workspaceId,

      websiteId,

      initiatedByUserId: user.id,

      from: new Date(body.from),

      to: new Date(body.to),

      trigger: AnalyticsProcessingTrigger.MANUAL,
    });
  }

  @Post('runs/:runId/retry')
  @ApiOperation({
    summary: 'Retry a dead-lettered processing run',
  })
  async retry(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('runId', ParseUUIDPipe)
    runId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    await this.access.assertCanReprocess(workspaceId, user.id);

    return this.queue.retryDeadLetter(runId, user.id);
  }
}
