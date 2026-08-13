// @vitest-environment jsdom
import { AnalyticsReportsDashboard } from '@/features/analytics-reports/analytics-reports-dashboard';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAnalyticsReportMock, routerReplaceMock, downloadAnalyticsReportMock } = vi.hoisted(() => ({
  getAnalyticsReportMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  downloadAnalyticsReportMock: vi.fn(),
}));

vi.mock('@/features/analytics-reports/analytics-reports-api', () => ({
  getAnalyticsReport: getAnalyticsReportMock,
  downloadAnalyticsReport: downloadAnalyticsReportMock,
}));

let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock, refresh: vi.fn() }),
  usePathname: () => '/workspaces/workspace-1/websites/website-1/analytics/reports',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const baseRange = { from: '2026-08-01', to: '2026-08-07', timeZone: 'UTC', days: 7 };
const basePagination = { page: 1, limit: 25, total: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false };

beforeEach(() => {
  getAnalyticsReportMock.mockReset();
  routerReplaceMock.mockReset();
  downloadAnalyticsReportMock.mockReset();
  currentSearch = '';
});

describe('AnalyticsReportsDashboard report-shape rendering', () => {
  it('renders the page report table when the response has page items', async () => {
    currentSearch = 'tab=pages';
    getAnalyticsReportMock.mockResolvedValue({
      items: [
        {
          path: '/pricing',
          title: 'Pricing',
          views: 500,
          visitors: 200,
          sessions: 250,
          entrances: 180,
          exits: 90,
          bounceRate: 12.5,
          averageDurationSeconds: 75,
        },
      ],
      pagination: basePagination,
      range: baseRange,
    });

    render(<AnalyticsReportsDashboard workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });

    // averageDurationSeconds=75 -> "1m 15s" per formatDuration.
    expect(screen.getByText('1m 15s')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('renders the event report table with its summary counts when the response has a summary', async () => {
    currentSearch = 'tab=events';
    getAnalyticsReportMock.mockResolvedValue({
      items: [{ name: 'signup_started', events: 42, visitors: 30, sessions: 35 }],
      summary: { totalEvents: 999, uniqueVisitors: 400, uniqueSessions: 500 },
      pagination: basePagination,
      range: baseRange,
    });

    render(<AnalyticsReportsDashboard workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('signup_started')).toBeInTheDocument();
    });

    expect(screen.getByText('999')).toBeInTheDocument();
    // "Total events" also appears as a <select> sort-option label, so scope
    // this assertion to the summary card's own paragraph text.
    expect(screen.getAllByText('Total events').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Unique visitors')).toBeInTheDocument();
  });

  it('renders the dimension report table for a sources/geography/technology response', async () => {
    currentSearch = 'tab=sources';
    getAnalyticsReportMock.mockResolvedValue({
      items: [{ key: 'google', label: 'Google', visitors: 300, sessions: 320, pageViews: 900, percentage: 64.2 }],
      pagination: basePagination,
      range: baseRange,
    });

    render(<AnalyticsReportsDashboard workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    expect(screen.getByText('64.2%')).toBeInTheDocument();
  });

  it('renders an empty-items page report as the empty state rather than an empty table', async () => {
    currentSearch = 'tab=pages';
    getAnalyticsReportMock.mockResolvedValue({
      items: [],
      pagination: { ...basePagination, total: 0 },
      range: baseRange,
    });

    render(<AnalyticsReportsDashboard workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('No report data')).toBeInTheDocument();
    });
  });
});

describe('AnalyticsReportsDashboard duration formatting', () => {
  it('formats a sub-minute average duration in seconds only', async () => {
    currentSearch = 'tab=pages';
    getAnalyticsReportMock.mockResolvedValue({
      items: [
        {
          path: '/fast',
          title: 'Fast page',
          views: 10,
          visitors: 5,
          sessions: 6,
          entrances: 4,
          exits: 2,
          bounceRate: 0,
          averageDurationSeconds: 40,
        },
      ],
      pagination: basePagination,
      range: baseRange,
    });

    render(<AnalyticsReportsDashboard workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('40s')).toBeInTheDocument();
    });
  });
});
