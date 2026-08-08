import {
    ApiProperty,
} from '@nestjs/swagger';

export class ProcessingRunDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    status!: string;

    @ApiProperty()
    trigger!: string;

    @ApiProperty()
    rangeStart!: string;

    @ApiProperty()
    rangeEnd!: string;

    @ApiProperty()
    retryCount!: number;

    @ApiProperty()
    maxRetries!: number;

    @ApiProperty()
    processedEvents!: number;

    @ApiProperty()
    failedEvents!: number;

    @ApiProperty({
        nullable: true,
    })
    errorMessage!:
        string | null;

    @ApiProperty({
        nullable: true,
    })
    startedAt!:
        string | null;

    @ApiProperty({
        nullable: true,
    })
    finishedAt!:
        string | null;

    @ApiProperty()
    createdAt!: string;
}

export class AnalyticsProcessingStatusDto {
    @ApiProperty()
    canReprocess!: boolean;

    @ApiProperty()
    pendingEvents!: number;

    @ApiProperty()
    unresolvedDeadLetters!: number;

    @ApiProperty({
        nullable: true,
        type:
            ProcessingRunDto,
    })
    activeRun!:
        ProcessingRunDto | null;

    @ApiProperty({
        nullable: true,
        type:
            ProcessingRunDto,
    })
    latestRun!:
        ProcessingRunDto | null;

    @ApiProperty({
        nullable: true,
        type:
            ProcessingRunDto,
    })
    lastSuccessfulRun!:
        ProcessingRunDto | null;

    @ApiProperty({
        type: [
            ProcessingRunDto,
        ],
    })
    recentRuns!:
        ProcessingRunDto[];
}