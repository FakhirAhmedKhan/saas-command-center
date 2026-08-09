export type AnalyticsDeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET' | 'BOT' | 'OTHER';

export type AnalyticsSourceType = 'DIRECT' | 'INTERNAL' | 'SEARCH' | 'SOCIAL' | 'REFERRAL' | 'UNKNOWN';

export type AnalyticsAggregateDimension = 'OVERVIEW' | 'PAGE' | 'SOURCE' | 'COUNTRY' | 'DEVICE' | 'BROWSER' | 'OPERATING_SYSTEM' | 'CUSTOM_EVENT';

export type AnalyticsAggregatePeriod = 'HOURLY' | 'DAILY';

export type AnalyticsProcessingStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface AnalyticsProcessingState {
  websiteId: string;
  status: AnalyticsProcessingStatus;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastFailedAt: string | null;
  lastProcessedReceivedAt: string | null;
  lastError: string | null;
  totalRawEventsProcessed: string | number;
  updatedAt: string;
}

export interface AnalyticsProcessingRun {
  id: string;
  websiteId: string;
  initiatedByUserId: string | null;
  status: AnalyticsProcessingStatus;
  rawEventsProcessed: number;
  sessionsRebuilt: number;
  hourlyBuckets: number;
  dailyBuckets: number;
  startedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
}

export interface AnalyticsSession {
  id: string;
  websiteId: string;
  visitorId: string;
  externalSessionId: string;
  startedAt: string;
  endedAt: string;
  lastEventAt: string;
  durationMs: number;
  engagedDurationMs: number;
  pageViewCount: number;
  eventCount: number;
  customEventCount: number;
  bounced: boolean;
  entryPath: string | null;
  exitPath: string | null;
  sourceType: AnalyticsSourceType;
  sourceName: string;
  countryCode: string | null;
  deviceType: AnalyticsDeviceType;
  browserName: string;
  operatingSystem: string;

  visitor: {
    externalVisitorId: string;
  };
}

export interface AnalyticsEngineStatus {
  website: {
    id: string;
    name: string;
    domain: string;
    timeZone: string;
    enabled: boolean;
    archivedAt: string | null;
    lastEventAt: string | null;
  };

  counts: {
    rawEvents: number;
    pendingRawEvents: number;
    visitors: number;
    sessions: number;
    normalizedEvents: number;
    pageViews: number;
    hourlyAggregates: number;
    dailyAggregates: number;
  };

  processingState: AnalyticsProcessingState | null;

  latestRun: AnalyticsProcessingRun | null;

  recentSessions: AnalyticsSession[];
}

export interface AnalyticsAggregate {
  id: string;
  websiteId: string;
  bucketStart: string;
  bucketEnd: string;
  timeZone: string;
  dimension: AnalyticsAggregateDimension;
  dimensionKey: string;
  dimensionValue: string;
  dimensionLabel: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  events: number;
  customEvents: number;
  bounces: number;
  totalDurationMs: number;
  generatedAt: string;
  updatedAt: string;
}

export interface AnalyticsAggregateResponse {
  period: AnalyticsAggregatePeriod;

  dimension: AnalyticsAggregateDimension;

  data: AnalyticsAggregate[];
}

export interface ReprocessAnalyticsPayload {
  dateFrom: string;
  dateTo: string;
  maxEvents?: number;
}

export interface AnalyticsRetentionResult {
  rawEventsDeleted: number;
  sessionsDeleted: number;
  visitorsDeleted: number;
  hourlyAggregatesDeleted: number;
  dailyAggregatesDeleted: number;
}
