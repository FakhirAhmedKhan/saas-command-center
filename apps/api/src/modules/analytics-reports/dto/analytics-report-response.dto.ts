import {
    ApiProperty,
} from '@nestjs/swagger';

export class AnalyticsPaginationDto {
    @ApiProperty()
    page!: number;

    @ApiProperty()
    limit!: number;

    @ApiProperty()
    total!: number;

    @ApiProperty()
    totalPages!: number;

    @ApiProperty()
    hasPreviousPage!: boolean;

    @ApiProperty()
    hasNextPage!: boolean;
}

export class AnalyticsReportRangeDto {
    @ApiProperty()
    from!: string;

    @ApiProperty()
    to!: string;

    @ApiProperty()
    timeZone!: string;

    @ApiProperty()
    days!: number;
}

export class PageReportItemDto {
    @ApiProperty()
    path!: string;

    @ApiProperty()
    title!: string;

    @ApiProperty()
    views!: number;

    @ApiProperty()
    visitors!: number;

    @ApiProperty()
    sessions!: number;

    @ApiProperty()
    entrances!: number;

    @ApiProperty()
    exits!: number;

    @ApiProperty()
    bounceRate!: number;

    @ApiProperty()
    averageDurationSeconds!: number;
}

export class PageReportResponseDto {
    @ApiProperty({
        type: [
            PageReportItemDto,
        ],
    })
    items!: PageReportItemDto[];

    @ApiProperty({
        type:
            AnalyticsPaginationDto,
    })
    pagination!:
        AnalyticsPaginationDto;

    @ApiProperty({
        type:
            AnalyticsReportRangeDto,
    })
    range!:
        AnalyticsReportRangeDto;
}

export class EventReportItemDto {
    @ApiProperty()
    name!: string;

    @ApiProperty()
    events!: number;

    @ApiProperty()
    visitors!: number;

    @ApiProperty()
    sessions!: number;
}

export class EventReportSummaryDto {
    @ApiProperty()
    totalEvents!: number;

    @ApiProperty()
    uniqueVisitors!: number;

    @ApiProperty()
    uniqueSessions!: number;
}

export class EventReportResponseDto {
    @ApiProperty({
        type: [
            EventReportItemDto,
        ],
    })
    items!: EventReportItemDto[];

    @ApiProperty({
        type:
            EventReportSummaryDto,
    })
    summary!:
        EventReportSummaryDto;

    @ApiProperty({
        type:
            AnalyticsPaginationDto,
    })
    pagination!:
        AnalyticsPaginationDto;

    @ApiProperty({
        type:
            AnalyticsReportRangeDto,
    })
    range!:
        AnalyticsReportRangeDto;
}

export class DimensionReportItemDto {
    @ApiProperty()
    key!: string;

    @ApiProperty()
    label!: string;

    @ApiProperty()
    visitors!: number;

    @ApiProperty()
    sessions!: number;

    @ApiProperty()
    pageViews!: number;

    @ApiProperty()
    percentage!: number;
}

export class DimensionReportResponseDto {
    @ApiProperty({
        type: [
            DimensionReportItemDto,
        ],
    })
    items!:
        DimensionReportItemDto[];

    @ApiProperty({
        type:
            AnalyticsPaginationDto,
    })
    pagination!:
        AnalyticsPaginationDto;

    @ApiProperty({
        type:
            AnalyticsReportRangeDto,
    })
    range!:
        AnalyticsReportRangeDto;
}