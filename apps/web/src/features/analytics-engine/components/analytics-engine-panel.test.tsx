// @vitest-environment jsdom
import { AnalyticsEnginePanel } from './analytics-engine-panel';
import type { AnalyticsEngineStatus } from '../analytics-engine-types';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAnalyticsEngineStatusMock, getAnalyticsAggregatesMock } = vi.hoisted(() => ({
  getAnalyticsEngineStatusMock: vi.fn(),
  getAnalyticsAggregatesMock: vi.fn(),
}));

vi.mock('../analytics-engine-api', () => ({
  getAnalyticsEngineStatus: getAnalyticsEngineStatusMock,
  getAnalyticsAggregates: getAnalyticsAggregatesMock,
  processAnalytics: vi.fn(),
  reprocessAnalytics: vi.fn(),
  runAnalyticsRetention: vi.fn(),
}));

function makeStatus(overrides: Partial<AnalyticsEngineStatus> = {}): AnalyticsEngineStatus {
  return {
    website: {
      id: 'website-1',
      name: 'Demo Website',
      domain: 'demo.example.com',
      timeZone: 'UTC',
      enabled: true,
      archivedAt: null,
      lastEventAt: null,
    },
    counts: {
      rawEvents: 100,
      pendingRawEvents: 5,
      visitors: 40,
      sessions: 60,
      normalizedEvents: 90,
      pageViews: 200,
      hourlyAggregates: 24,
      dailyAggregates: 7,
    },
    processingState: null,
    latestRun: null,
    recentSessions: [],
    ...overrides,
  };
}

beforeEach(() => {
  getAnalyticsEngineStatusMock.mockReset();
  getAnalyticsAggregatesMock.mockReset();
  getAnalyticsAggregatesMock.mockResolvedValue({ period: 'DAILY', dimension: 'OVERVIEW', data: [] });
});

describe('AnalyticsEnginePanel processing badge', () => {
  it('shows a "Ready" badge when processingState is null (defaults to COMPLETED)', async () => {
    getAnalyticsEngineStatusMock.mockResolvedValue(makeStatus());

    render(<AnalyticsEnginePanel workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  it('shows a "Processing" badge while a run is RUNNING', async () => {
    getAnalyticsEngineStatusMock.mockResolvedValue(
      makeStatus({
        processingState: {
          websiteId: 'website-1',
          status: 'RUNNING',
          lastStartedAt: '2026-08-10T00:00:00.000Z',
          lastCompletedAt: null,
          lastFailedAt: null,
          lastProcessedReceivedAt: null,
          lastError: null,
          totalRawEventsProcessed: 0,
          updatedAt: '2026-08-10T00:00:00.000Z',
        },
      }),
    );

    render(<AnalyticsEnginePanel workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });
  });

  it('shows a "Failed" badge and the last error message when a run FAILED', async () => {
    getAnalyticsEngineStatusMock.mockResolvedValue(
      makeStatus({
        processingState: {
          websiteId: 'website-1',
          status: 'FAILED',
          lastStartedAt: '2026-08-10T00:00:00.000Z',
          lastCompletedAt: null,
          lastFailedAt: '2026-08-10T00:05:00.000Z',
          lastProcessedReceivedAt: null,
          lastError: 'Normalization worker crashed',
          totalRawEventsProcessed: 0,
          updatedAt: '2026-08-10T00:05:00.000Z',
        },
      }),
    );

    render(<AnalyticsEnginePanel workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    expect(screen.getByText('Normalization worker crashed')).toBeInTheDocument();
  });
});

describe('AnalyticsEnginePanel counts and error state', () => {
  it('renders the raw event and pending counts from the status response', async () => {
    getAnalyticsEngineStatusMock.mockResolvedValue(makeStatus({ counts: { ...makeStatus().counts, rawEvents: 12345, pendingRawEvents: 314 } }));

    render(<AnalyticsEnginePanel workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('12345')).toBeInTheDocument();
    });

    expect(screen.getByText('314')).toBeInTheDocument();
  });

  it('shows a retry option when the initial status request fails', async () => {
    getAnalyticsEngineStatusMock.mockRejectedValue(new Error('Engine offline'));

    render(<AnalyticsEnginePanel workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Analytics engine unavailable')).toBeInTheDocument();
    });

    expect(screen.getByText('Engine offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
