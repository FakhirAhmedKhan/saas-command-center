export type ProcessingRunStatus =
    | 'QUEUED'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'DEAD_LETTERED'
    | 'CANCELLED';

export interface ProcessingRun {
    id: string;

    status:
    ProcessingRunStatus;

    trigger:
    'SCHEDULED'
    | 'MANUAL'
    | 'RETRY';

    rangeStart:
    string;

    rangeEnd:
    string;

    retryCount:
    number;

    maxRetries:
    number;

    processedEvents:
    number;

    failedEvents:
    number;

    errorMessage:
    string | null;

    startedAt:
    string | null;

    finishedAt:
    string | null;

    createdAt:
    string;
}

export interface AnalyticsProcessingStatus {
    canReprocess:
    boolean;

    pendingEvents:
    number;

    unresolvedDeadLetters:
    number;

    activeRun:
    ProcessingRun | null;

    latestRun:
    ProcessingRun | null;

    lastSuccessfulRun:
    ProcessingRun | null;

    recentRuns:
    ProcessingRun[];
}

export interface ReprocessAnalyticsInput {
    from: string;

    to: string;
}