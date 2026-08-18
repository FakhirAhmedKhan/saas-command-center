// @vitest-environment jsdom
import { MonitoringDashboard } from '@/features/monitoring/monitoring-dashboard';
import type { HealthCheck, HealthIncident, MonitoringSummary, MonitoringTarget } from '@/features/monitoring/monitoring.types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getMonitoringSummaryMock,
  getHealthChecksMock,
  getHealthIncidentsMock,
  getMonitoringTargetsMock,
  updateHealthCheckMock,
  runHealthCheckNowMock,
  getHealthCheckHistoryMock,
  createHealthCheckMock,
} = vi.hoisted(() => ({
  getMonitoringSummaryMock: vi.fn(),
  getHealthChecksMock: vi.fn(),
  getHealthIncidentsMock: vi.fn(),
  getMonitoringTargetsMock: vi.fn(),
  updateHealthCheckMock: vi.fn(),
  runHealthCheckNowMock: vi.fn(),
  getHealthCheckHistoryMock: vi.fn(),
  createHealthCheckMock: vi.fn(),
}));

vi.mock('@/features/monitoring/monitoring-api', () => ({
  getMonitoringSummary: getMonitoringSummaryMock,
  getHealthChecks: getHealthChecksMock,
  getHealthIncidents: getHealthIncidentsMock,
  getMonitoringTargets: getMonitoringTargetsMock,
  updateHealthCheck: updateHealthCheckMock,
  runHealthCheckNow: runHealthCheckNowMock,
  getHealthCheckHistory: getHealthCheckHistoryMock,
  createHealthCheck: createHealthCheckMock,
}));

function makeSummary(overrides: Partial<MonitoringSummary> = {}): MonitoringSummary {
  return {
    canManage: true,
    total: 1,
    healthy: 1,
    degraded: 0,
    down: 0,
    unknown: 0,
    disabled: 0,
    activeIncidents: 0,
    ...overrides,
  };
}

function makeCheck(overrides: Partial<HealthCheck> = {}): HealthCheck {
  return {
    id: 'check-1',
    targetType: 'APPLICATION',
    targetId: 'app-1',
    targetName: 'Demo API',
    applicationId: 'app-1',
    websiteId: null,
    name: 'Production API',
    url: 'https://example.com/health',
    intervalSeconds: 300,
    timeoutMs: 10_000,
    expectedStatusMin: 200,
    expectedStatusMax: 399,
    degradedAfterMs: 1_500,
    failureThreshold: 3,
    enabled: true,
    latestStatus: 'HEALTHY',
    lastStatusCode: 200,
    lastResponseTimeMs: 120,
    lastFailureReason: null,
    consecutiveFailures: 0,
    lastCheckedAt: '2026-08-07T01:00:00.000Z',
    lastSuccessfulAt: '2026-08-07T01:00:00.000Z',
    nextRunAt: '2026-08-07T01:05:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-07T01:00:00.000Z',
    ...overrides,
  } as HealthCheck;
}

function stubAll(options: { checks?: HealthCheck[]; incidents?: HealthIncident[]; targets?: MonitoringTarget[]; summary?: MonitoringSummary } = {}): void {
  getMonitoringSummaryMock.mockResolvedValue(options.summary ?? makeSummary());
  getHealthChecksMock.mockResolvedValue(options.checks ?? [makeCheck()]);
  getHealthIncidentsMock.mockResolvedValue(options.incidents ?? []);
  getMonitoringTargetsMock.mockResolvedValue(options.targets ?? []);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MonitoringDashboard', () => {
  it('shows a loading skeleton before data arrives', () => {
    getMonitoringSummaryMock.mockReturnValue(new Promise(() => {}));
    getHealthChecksMock.mockReturnValue(new Promise(() => {}));
    getHealthIncidentsMock.mockReturnValue(new Promise(() => {}));
    getMonitoringTargetsMock.mockReturnValue(new Promise(() => {}));

    const { container } = render(<MonitoringDashboard workspaceId='workspace-1' />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders the health check once the API responds successfully', async () => {
    stubAll();

    render(<MonitoringDashboard workspaceId='workspace-1' />);

    await waitFor(() => {
      expect(screen.getByText('Production API')).toBeInTheDocument();
    });

    expect(getMonitoringSummaryMock).toHaveBeenCalledWith('workspace-1', expect.anything());
  });

  it('shows an empty state when no health checks are configured', async () => {
    stubAll({ checks: [] });

    render(<MonitoringDashboard workspaceId='workspace-1' />);

    await waitFor(() => {
      expect(screen.getByText('Monitoring is not configured')).toBeInTheDocument();
    });
  });

  it('shows an error state with a retry action when the summary request fails, and retry recovers', async () => {
    const user = userEvent.setup();

    getMonitoringSummaryMock.mockRejectedValueOnce(new Error('boom'));
    getHealthChecksMock.mockResolvedValue([]);
    getHealthIncidentsMock.mockResolvedValue([]);
    getMonitoringTargetsMock.mockResolvedValue([]);

    render(<MonitoringDashboard workspaceId='workspace-1' />);

    await waitFor(() => {
      expect(screen.getByText('Monitoring unavailable')).toBeInTheDocument();
    });

    stubAll();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Production API')).toBeInTheDocument();
    });
  });

  it('toggles a health check and reloads the list', async () => {
    const user = userEvent.setup();

    stubAll({ checks: [makeCheck({ enabled: true })] });
    updateHealthCheckMock.mockResolvedValue(makeCheck({ enabled: false }));

    render(<MonitoringDashboard workspaceId='workspace-1' />);

    await waitFor(() => {
      expect(screen.getByText('Production API')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Disable' }));

    await waitFor(() => {
      expect(updateHealthCheckMock).toHaveBeenCalledWith('workspace-1', 'check-1', { enabled: false });
    });

    // A reload follows every mutation.
    expect(getHealthChecksMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('does not surface an error banner for a request aborted by unmount', async () => {
    let rejectSummary: (reason: unknown) => void = () => {};

    getMonitoringSummaryMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSummary = reject;
        }),
    );

    getHealthChecksMock.mockResolvedValue([]);
    getHealthIncidentsMock.mockResolvedValue([]);
    getMonitoringTargetsMock.mockResolvedValue([]);

    const { unmount } = render(<MonitoringDashboard workspaceId='workspace-1' />);

    unmount();

    const abortError = new DOMException('Aborted', 'AbortError');

    rejectSummary(abortError);

    // Give any pending microtasks a chance to run; nothing should throw or
    // attempt to update state on the unmounted tree.
    await Promise.resolve();

    expect(screen.queryByText('Monitoring unavailable')).not.toBeInTheDocument();
  });

  it('does not let a stale in-flight request overwrite the latest data when workspaceId changes', async () => {
    let resolveFirst: (value: HealthCheck[]) => void = () => {};

    getHealthChecksMock.mockImplementationOnce(
      () =>
        new Promise<HealthCheck[]>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    getMonitoringSummaryMock.mockResolvedValue(makeSummary());
    getHealthIncidentsMock.mockResolvedValue([]);
    getMonitoringTargetsMock.mockResolvedValue([]);

    const { rerender } = render(<MonitoringDashboard workspaceId='workspace-1' />);

    getHealthChecksMock.mockResolvedValueOnce([makeCheck({ id: 'check-2', name: 'Second Workspace API' })]);

    rerender(<MonitoringDashboard workspaceId='workspace-2' />);

    await waitFor(() => {
      expect(screen.getByText('Second Workspace API')).toBeInTheDocument();
    });

    // The slow first-workspace response resolves after the newer request has
    // already superseded it; it must not clobber what is on screen.
    resolveFirst([makeCheck({ id: 'check-1', name: 'Stale Workspace API' })]);

    await Promise.resolve();

    expect(screen.queryByText('Stale Workspace API')).not.toBeInTheDocument();
    expect(screen.getByText('Second Workspace API')).toBeInTheDocument();
  });
});
