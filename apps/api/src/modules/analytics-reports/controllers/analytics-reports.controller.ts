import {
    Controller,
    Get,
    Param,
    ParseEnumPipe,
    ParseUUIDPipe,
    Query,
    Res,
    StreamableFile,
    UseGuards,
} from '@nestjs/common';

import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiProduces,
    ApiTags,
} from '@nestjs/swagger';

import type {
    Response,
} from 'express';

import {
    JwtAuthGuard,
} from '../../auth/guards/jwt-auth.guard';

import {
    WorkspaceAccessGuard,
} from '../../workspace/guards/workspace-access.guard';

import {
    AnalyticsReportDimension,
    DimensionReportQueryDto,
    EventReportQueryDto,
    PageReportQueryDto,
} from '../dto/analytics-report-query.dto';

import {
    DimensionReportResponseDto,
    EventReportResponseDto,
    PageReportResponseDto,
} from '../dto/analytics-report-response.dto';

import {
    AnalyticsReportsService,
} from '../services/analytics-reports.service';

@ApiTags('Analytics Reports')
@ApiBearerAuth('access-token')
@Controller(
    'workspaces/:workspaceId/websites/:websiteId/analytics/reports',
)
@UseGuards(
    JwtAuthGuard,
    WorkspaceAccessGuard,
)
export class AnalyticsReportsController {
    constructor(
        private readonly analyticsReportsService:
            AnalyticsReportsService,
    ) { }

    @Get('pages')
    @ApiOperation({
        summary:
            'Get the detailed pages report',
    })
    @ApiOkResponse({
        type:
            PageReportResponseDto,
    })
    getPages(
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
            PageReportQueryDto,
    ): Promise<PageReportResponseDto> {
        return this
            .analyticsReportsService
            .getPagesReport(
                workspaceId,
                websiteId,
                query,
            );
    }

    @Get('events')
    @ApiOperation({
        summary:
            'Get the custom events report',
    })
    @ApiOkResponse({
        type:
            EventReportResponseDto,
    })
    getEvents(
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
            EventReportQueryDto,
    ): Promise<EventReportResponseDto> {
        return this
            .analyticsReportsService
            .getEventsReport(
                workspaceId,
                websiteId,
                query,
            );
    }

    @Get('dimensions/:dimension')
    @ApiOperation({
        summary:
            'Get a dimension report',
    })
    @ApiOkResponse({
        type:
            DimensionReportResponseDto,
    })
    getDimension(
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

        @Param(
            'dimension',
            new ParseEnumPipe(
                AnalyticsReportDimension,
            ),
        )
        dimension:
            AnalyticsReportDimension,

        @Query()
        query:
            DimensionReportQueryDto,
    ): Promise<DimensionReportResponseDto> {
        return this
            .analyticsReportsService
            .getDimensionReport(
                workspaceId,
                websiteId,
                dimension,
                query,
            );
    }

    @Get('exports/pages')
    @ApiProduces('text/csv')
    @ApiOperation({
        summary:
            'Export the pages report as CSV',
    })
    async exportPages(
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
            PageReportQueryDto,

        @Res({
            passthrough: true,
        })
        response: Response,
    ): Promise<StreamableFile> {
        const exportResult =
            await this
                .analyticsReportsService
                .exportPages(
                    workspaceId,
                    websiteId,
                    query,
                );

        return this.createCsvResponse(
            response,
            exportResult.filename,
            exportResult.content,
        );
    }

    @Get('exports/events')
    @ApiProduces('text/csv')
    @ApiOperation({
        summary:
            'Export the events report as CSV',
    })
    async exportEvents(
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
            EventReportQueryDto,

        @Res({
            passthrough: true,
        })
        response: Response,
    ): Promise<StreamableFile> {
        const exportResult =
            await this
                .analyticsReportsService
                .exportEvents(
                    workspaceId,
                    websiteId,
                    query,
                );

        return this.createCsvResponse(
            response,
            exportResult.filename,
            exportResult.content,
        );
    }

    @Get(
        'exports/dimensions/:dimension',
    )
    @ApiProduces('text/csv')
    @ApiOperation({
        summary:
            'Export a dimension report as CSV',
    })
    async exportDimension(
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

        @Param(
            'dimension',
            new ParseEnumPipe(
                AnalyticsReportDimension,
            ),
        )
        dimension:
            AnalyticsReportDimension,

        @Query()
        query:
            DimensionReportQueryDto,

        @Res({
            passthrough: true,
        })
        response: Response,
    ): Promise<StreamableFile> {
        const exportResult =
            await this
                .analyticsReportsService
                .exportDimension(
                    workspaceId,
                    websiteId,
                    dimension,
                    query,
                );

        return this.createCsvResponse(
            response,
            exportResult.filename,
            exportResult.content,
        );
    }

    private createCsvResponse(
        response: Response,
        filename: string,
        content: string,
    ): StreamableFile {
        response.setHeader(
            'Content-Type',
            'text/csv; charset=utf-8',
        );

        response.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"`,
        );

        response.setHeader(
            'Cache-Control',
            'no-store',
        );

        return new StreamableFile(
            Buffer.from(
                content,
                'utf8',
            ),
        );
    }
}