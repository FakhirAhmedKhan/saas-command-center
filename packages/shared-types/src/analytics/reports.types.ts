import type { AnalyticsPreset } from './overview.types.js';

export type AnalyticsReportTab = 'pages' | 'sources' | 'geography' | 'technology' | 'events';

export type TechnologyDimension = 'devices' | 'browsers' | 'operating-systems';

export type AnalyticsDimension = 'sources' | 'countries' | TechnologyDimension;

export type AnalyticsSortDirection = 'asc' | 'desc';

export interface AnalyticsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface AnalyticsReportRange {
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
  pagination: AnalyticsPagination;
  range: AnalyticsReportRange;
}

export interface EventReportItem {
  name: string;
  events: number;
  visitors: number;
  sessions: number;
}

export interface EventReportSummary {
  totalEvents: number;
  uniqueVisitors: number;
  uniqueSessions: number;
}

export interface EventReportResponse {
  items: EventReportItem[];
  summary: EventReportSummary;
  pagination: AnalyticsPagination;
  range: AnalyticsReportRange;
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
  pagination: AnalyticsPagination;
  range: AnalyticsReportRange;
}

export type AnalyticsReportResponse = PageReportResponse | EventReportResponse | DimensionReportResponse;

export interface AnalyticsReportBaseInput {
  preset?: AnalyticsPreset;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortDirection?: AnalyticsSortDirection;
}
