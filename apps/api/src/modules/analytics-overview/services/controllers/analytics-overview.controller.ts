/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Query,
    UseGuards,
} from '@nestjs/common';

import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from 'src/modules/workspace/guards/workspace-access.guard';
import { AnalyticsOverviewQueryDto } from '../../dto/analytics-overview-query.dto';
import { AnalyticsOverviewResponseDto } from '../../dto/analytics-overview-response.dto';
import { AnalyticsOverviewService } from '../analytics-overview.service';



@ApiTags('Analytics Overview')
@ApiBearerAuth('access-token')
@Controller(
    'workspaces/:workspaceId/websites/:websiteId/analytics',
)
@UseGuards(
    JwtAuthGuard,
    WorkspaceAccessGuard,
)
export class AnalyticsOverviewController {
    constructor(
        private readonly analyticsOverviewService:
            AnalyticsOverviewService,
    ) { }

    @Get('overview')
    @ApiOperation({
        summary:
            'Get website analytics overview',
    })
    @ApiOkResponse({
        type:
            AnalyticsOverviewResponseDto,
    })
    getOverview(
        @Param(
            'workspaceId',
            ParseUUIDPipe,
        )
        workspaceId: string,

        @Param(
            'websiteId',
            ParseUUIDPipe,
        )
        websiteId: string,

        @Query()
        query:
            AnalyticsOverviewQueryDto,
    ): Promise<
        AnalyticsOverviewResponseDto
    > {
        return this
            .analyticsOverviewService
            .getOverview(
                workspaceId,
                websiteId,
                query,
            );
    }
}