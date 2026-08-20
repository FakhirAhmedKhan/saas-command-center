// @vitest-environment jsdom
import { AnalyticsProcessingPanel } from './analytics-processing-panel';
import type { AnalyticsProcessingStatus, ProcessingRun } from './analytics-processing.types';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAnalyticsProcessingStatusMock } = vi.hoisted(() => ({
  getAnalyticsProcessingStatusMock: vi.fn(),
}));

vi.mock('./analytics-processing-api', () => ({
  getAnalyticsProcessingStatus: getAnalyticsProcessingStatusMock,
  queueAnalyticsReprocessing: vi.fn(),
  retryAnalyticsProcessingRun: vi.fn(),
}));

function makeRun(overrides: Partial<ProcessingRun> = {}): ProcessingRun {
  return {
    id: 'run-1',
    status: 'SUCCEEDED',
    trigger: 'SCHEDULED',
    rangeStart: '2026-08-01T00:00:00.000Z',
    rangeEnd: '2026-08-02T00:00:00.000Z',
    retryCount: 0,
    maxRetries: 3,
    processedEvents: 100,
    failedEvents: 0,
    errorMessage: null,
    startedAt: '2026-08-02T01:00:00.000Z',
    finishedAt: '2026-08-02T01:01:00.000Z',
    createdAt: '2026-08-02T01:00:00.000Z',
    ...overrides,
  } as ProcessingRun;
}

function makeStatus(overrides: Partial<AnalyticsProcessingStatus> = {}): AnalyticsProcessingStatus {
  return {
    canReprocess: true,
    pendingEvents: 0,
    unresolvedDeadLetters: 0,
    activeRun: null,
    latestRun: null,
    lastSuccessfulRun: null,
    recentRuns: [],
    ...overrides,
  } as AnalyticsProcessingStatus;
}

beforeEach(() => {
  getAnalyticsProcessingStatusMock.mockReset();
});

describe('AnalyticsProcessingPanel run status badge classes', () => {
  it.each([
    ['SUCCEEDED', 'bg-emerald-50'],
    ['RUNNING', 'bg-blue-50'],
    ['QUEUED', 'bg-amber-50'],
    ['DEAD_LETTERED', 'bg-red-50'],
    ['CANCELLED', 'bg-slate-100'],
  ])('gives a %s run the %s badge class', async (status, expectedClass) => {
    getAnalyticsProcessingStatusMock.mockResolvedValue(
      makeStatus({
        recentRuns: [makeRun({ id: 'run-status-test', status: status as ProcessingRun['status'] })],
      }),
    );

    render(<AnalyticsProcessingPanel workspaceId='workspace-1' websiteId='website-1' />);

    const badge = await waitFor(() => screen.getByText(status));

    expect(badge.className).toContain(expectedClass);
  });
});

describe('AnalyticsProcessingPanel active run banner', () => {
  it('shows a "Processing queued" heading when the active run is QUEUED', async () => {
    getAnalyticsProcessingStatusMock.mockResolvedValue(
      makeStatus({
        activeRun: makeRun({ id: 'active-run', status: 'QUEUED', retryCount: 1, maxRetries: 3 }),
      }),
    );

    render(<AnalyticsProcessingPanel workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Processing queued')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry 1 of 3')).toBeInTheDocument();
  });

  it('shows a "Processing analytics" heading when the active run is RUNNING', async () => {
    getAnalyticsProcessingStatusMock.mockResolvedValue(
      makeStatus({
        activeRun: makeRun({ id: 'active-run', status: 'RUNNING', retryCount: 0, maxRetries: 3 }),
      }),
    );

    render(<AnalyticsProcessingPanel workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Processing analytics')).toBeInTheDocument();
    });
  });
});

describe('AnalyticsProcessingPanel current status field', () => {
  it('shows "Idle" when there is no active run', async () => {
    getAnalyticsProcessingStatusMock.mockResolvedValue(makeStatus({ activeRun: null }));

    render(<AnalyticsProcessingPanel workspaceId='workspace-1' websiteId='website-1' />);

    await waitFor(() => {
      expect(screen.getByText('Idle')).toBeInTheDocument();
    });
  });
});
