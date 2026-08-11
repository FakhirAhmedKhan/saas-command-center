export type ProcessingRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'DEAD_LETTERED' | 'CANCELLED';

export type AnalyticsProcessingTrigger = 'SCHEDULED' | 'MANUAL' | 'RETRY';

export interface ProcessingRun {
  id: string;
  status: ProcessingRunStatus;
  trigger: AnalyticsProcessingTrigger;
  rangeStart: string;
  rangeEnd: string;
  retryCount: number;
  maxRetries: number;
  processedEvents: number;
  failedEvents: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface AnalyticsProcessingStatusResponse {
  canReprocess: boolean;
  pendingEvents: number;
  unresolvedDeadLetters: number;
  activeRun: ProcessingRun | null;
  latestRun: ProcessingRun | null;
  lastSuccessfulRun: ProcessingRun | null;
  recentRuns: ProcessingRun[];
}

export interface ReprocessAnalyticsInput {
  from: string;
  to: string;
}
