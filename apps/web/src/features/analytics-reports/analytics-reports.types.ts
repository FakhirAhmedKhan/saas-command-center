export type AnalyticsPreset = 'today' | '7d' | '30d' | '90d';

export type AnalyticsReportTab = 'pages' | 'sources' | 'geography' | 'technology' | 'events';

export type TechnologyDimension = 'devices' | 'browsers' | 'operating-systems';

export type AnalyticsDimension = 'sources' | 'countries' | TechnologyDimension;

export type SortDirection = 'asc' | 'desc';

export interface Pagination {
  page: number;

  limit: number;

  total: number;

  totalPages: number;

  hasPreviousPage: boolean;

  hasNextPage: boolean;
}

export interface ReportRange {
  from: string;

  to: string;

  timeZone: string;

  days: number;
}

export interface PageReportItem {
  path: string;

  title: string;

  views: number;

  visitors: number;

  sessions: number;

  entrances: number;

  exits: number;

  bounceRate: number;

  averageDurationSeconds: number;
}

export interface PageReportResponse {
  items: PageReportItem[];

  pagination: Pagination;

  range: ReportRange;
}

export interface EventReportItem {
  name: string;

  events: number;

  visitors: number;

  sessions: number;
}

export interface EventReportResponse {
  items: EventReportItem[];

  summary: {
    totalEvents: number;

    uniqueVisitors: number;

    uniqueSessions: number;
  };

  pagination: Pagination;

  range: ReportRange;
}

export interface DimensionReportItem {
  key: string;

  label: string;

  visitors: number;

  sessions: number;

  pageViews: number;

  percentage: number;
}

export interface DimensionReportResponse {
  items: DimensionReportItem[];

  pagination: Pagination;

  range: ReportRange;
}

export interface AnalyticsReportRequest {
  workspaceId: string;

  websiteId: string;

  tab: AnalyticsReportTab;

  dimension: TechnologyDimension;

  preset: AnalyticsPreset;

  search: string;

  page: number;

  limit: number;

  sortBy: string;

  sortDirection: SortDirection;

  signal?: AbortSignal;
}

export type AnalyticsReportResponse =
  PageReportResponse | EventReportResponse | DimensionReportResponse;
