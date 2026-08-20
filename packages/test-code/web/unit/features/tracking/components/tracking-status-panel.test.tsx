// @vitest-environment jsdom
import { TrackingStatusPanel } from '@/features/tracking/components/tracking-status-panel';
import type { TrackingStatus } from '@/features/tracking/tracking-types';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getTrackingStatusMock } = vi.hoisted(() => ({
  getTrackingStatusMock: vi.fn(),
}));

vi.mock('@/features/tracking/tracking-api', () => ({
  getTrackingStatus: getTrackingStatusMock,
}));

function makeStatus(overrides: Partial<TrackingStatus> = {}): TrackingStatus {
  return {
    connected: false,
    totalEvents: 0,
    counts: {
      PAGE_VIEW: 0,
      HEARTBEAT: 0,
      CUSTOM: 0,
    },
    website: {
      id: 'website-1',
      name: 'Demo Website',
      domain: 'demo.example.com',
      lastEventAt: null,
    },
    ...overrides,
  } as TrackingStatus;
}

beforeEach(() => {
  getTrackingStatusMock.mockReset();
});

describe('TrackingStatusPanel connection badge', () => {
  it('shows "Receiving events" when the tracker is connected', async () => {
    getTrackingStatusMock.mockResolvedValue(makeStatus({ connected: true }));

    render(<TrackingStatusPanel workspaceId='workspace-1' websiteId='website-1' autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('Receiving events')).toBeInTheDocument();
    });

    expect(screen.queryByText('Waiting for first event')).not.toBeInTheDocument();
  });

  it('shows "Waiting for first event" when the tracker has not connected', async () => {
    getTrackingStatusMock.mockResolvedValue(makeStatus({ connected: false }));

    render(<TrackingStatusPanel workspaceId='workspace-1' websiteId='website-1' autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('Waiting for first event')).toBeInTheDocument();
    });

    expect(screen.queryByText('Receiving events')).not.toBeInTheDocument();
  });
});

describe('TrackingStatusPanel metric counts', () => {
  it('renders the per-type event counts from the status response', async () => {
    getTrackingStatusMock.mockResolvedValue(
      makeStatus({
        connected: true,
        totalEvents: 999,
        counts: { PAGE_VIEW: 600, HEARTBEAT: 300, CUSTOM: 99 },
      }),
    );

    render(<TrackingStatusPanel workspaceId='workspace-1' websiteId='website-1' autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('999')).toBeInTheDocument();
    });

    expect(screen.getByText('600')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });
});

describe('TrackingStatusPanel error state', () => {
  it('shows the error message when the status request fails and no prior data exists', async () => {
    getTrackingStatusMock.mockRejectedValue(new Error('Tracking status unavailable'));

    render(<TrackingStatusPanel workspaceId='workspace-1' websiteId='website-1' autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('Tracking status unavailable')).toBeInTheDocument();
    });
  });
});
