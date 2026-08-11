import type { AnalyticsPreset, AnalyticsReportTab, AnalyticsSortDirection, TechnologyDimension } from '@command-center/shared-types';

export type {
  AnalyticsDimension,
  AnalyticsPreset,
  AnalyticsReportResponse,
  AnalyticsReportTab,
  DimensionReportItem,
  DimensionReportResponse,
  EventReportItem,
  EventReportResponse,
  AnalyticsPagination as Pagination,
  PageReportItem,
  PageReportResponse,
  AnalyticsReportRange as ReportRange,
  AnalyticsSortDirection as SortDirection,
  TechnologyDimension,
} from '@command-center/shared-types';

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
  sortDirection: AnalyticsSortDirection;
  signal?: AbortSignal;
}
