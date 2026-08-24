// @vitest-environment jsdom
import type { AnalyticsOverviewResponse } from '@/features/analytics-overview/analytics-overview.types';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsOverviewDashboard } from '@/features/analytics-overview/analytics-overview-dashboard';

const { useAnalyticsOverviewMock, routerReplaceMock } = vi.hoisted(() => ({
  useAnalyticsOverviewMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}));

vi.mock('@/features/analytics-overview/use-analytics-overview', () => ({
  useAnalyticsOverview: useAnalyticsOverviewMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
  usePathname: () => '/workspaces/workspace-1/websites/website-1/analytics',
  useSearchParams: () => new URLSearchParams(),
}));

function makeMetric(value: number, changePercent: number | null, previousValue = 0) {
  return { value, previousValue, changePercent };
}

function makeResponse(overrides: Partial<AnalyticsOverviewResponse> = {}): AnalyticsOverviewResponse {
  return {
    website: {
      id: 'website-1',
      name: 'Demo Website',
      domain: 'demo.example.com',
      timeZone: 'UTC',
      lastEventAt: null,
    },
    range: {
      preset: '7d',
      from: '2026-08-01',
      to: '2026-08-07',
      previousFrom: '2026-07-25',
      previousTo: '2026-07-31',
      granularity: 'day',
      days: 7,
    },
    metrics: {
      visitors: makeMetric(320, 28),
      sessions: makeMetric(420, 20),
      pageViews: makeMetric(1200, 20),
      bounceRate: makeMetric(32.4, -15),
      averageDurationSeconds: makeMetric(140, 16.7),
    },
    trend: [
      { bucketStart: '2026-08-01T00:00:00.000Z', visitors: 40, sessions: 50, pageViews: 150 },
      { bucketStart: '2026-08-02T00:00:00.000Z', visitors: 48, sessions: 60, pageViews: 190 },
    ],
    topPages: [{ key: '/', label: 'Home', value: 600, percentage: 50 }],
    topSources: [],
    topCountries: [],
    topDevices: [],
    topBrowsers: [],
    topOperatingSystems: [],
    empty: false,
    ...overrides,
  };
}

beforeEach(() => {
  useAnalyticsOverviewMock.mockReset();
  routerReplaceMock.mockReset();
});

describe('AnalyticsOverviewDashboard loading/error/empty states', () => {
  it('shows a loading skeleton while data is loading', () => {
    useAnalyticsOverviewMock.mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByLabelText('Loading analytics')).toBeInTheDocument();
  });

  it('shows an error message with the underlying error text', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Analytics service unreachable'),
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('Analytics service unreachable')).toBeInTheDocument();
  });

  it('shows the empty state when the response reports no analytics data', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ empty: true }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('No analytics yet')).toBeInTheDocument();
    // The metric cards should not render alongside the empty state.
    expect(screen.queryByText('Visitors')).not.toBeInTheDocument();
  });
});

describe('AnalyticsOverviewDashboard metric change formatting', () => {
  it('shows a positive-change badge with an up-arrow and the percentage value', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ metrics: { ...makeResponse().metrics, visitors: makeMetric(320, 28) } }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    // Regression test for a fixed mojibake bug: formatMetricChange used to store a
    // mis-encoded glyph instead of U+2191 ("↑"), so real users saw "Ã¢â€ â€˜ 28%". The
    // source now uses the real arrow character.
    expect(screen.getByText('↑ 28%')).toBeInTheDocument();
  });

  it('shows a negative-change badge with a down-arrow and the absolute-value percentage', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ metrics: { ...makeResponse().metrics, bounceRate: makeMetric(32.4, -15) } }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    // -15 must render as the absolute value "15%" with a real down-arrow, not "-15%"
    // or the mojibake glyph the source used to contain.
    expect(screen.getByText('↓ 15%')).toBeInTheDocument();
    expect(screen.queryByText('-15%')).not.toBeInTheDocument();
  });

  it('shows "No change" for a zero change percentage', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ metrics: { ...makeResponse().metrics, sessions: makeMetric(420, 0) } }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('No change')).toBeInTheDocument();
  });

  it('shows "New activity" when the change percentage is null', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ metrics: { ...makeResponse().metrics, pageViews: makeMetric(1200, null) } }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('New activity')).toBeInTheDocument();
  });
});

describe('AnalyticsOverviewDashboard duration formatting', () => {
  it('formats a sub-minute average duration in seconds', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ metrics: { ...makeResponse().metrics, averageDurationSeconds: makeMetric(45, 5) } }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('formats a multi-minute average duration as minutes and seconds', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ metrics: { ...makeResponse().metrics, averageDurationSeconds: makeMetric(140, 5) } }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('2m 20s')).toBeInTheDocument();
  });
});

describe('AnalyticsOverviewDashboard traffic trend', () => {
  it('renders the peak page-view value across the trend points', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({
        trend: [
          { bucketStart: '2026-08-01T00:00:00.000Z', visitors: 10, sessions: 20, pageViews: 75 },
          { bucketStart: '2026-08-02T00:00:00.000Z', visitors: 20, sessions: 30, pageViews: 190 },
          { bucketStart: '2026-08-03T00:00:00.000Z', visitors: 15, sessions: 25, pageViews: 110 },
        ],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('Peak')).toBeInTheDocument();
    expect(screen.getByText('190')).toBeInTheDocument();
  });

  it('shows a no-traffic message when the trend is empty', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ trend: [] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('No traffic was recorded in this range.')).toBeInTheDocument();
  });
});

describe('AnalyticsOverviewDashboard breakdown panels', () => {
  it('shows an empty-label message for a breakdown with no items', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ topPages: [] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText('No page data available.')).toBeInTheDocument();
  });

  it('formats large breakdown values with thousands separators', () => {
    useAnalyticsOverviewMock.mockReturnValue({
      data: makeResponse({ topPages: [{ key: '/', label: 'Home', value: 12345, percentage: 100 }] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AnalyticsOverviewDashboard workspaceId='workspace-1' websiteId='website-1' />);

    expect(screen.getByText(/12,345/)).toBeInTheDocument();
  });
});
