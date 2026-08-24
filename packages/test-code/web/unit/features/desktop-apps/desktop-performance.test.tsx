// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDesktopPerformance } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopPerformance } from '@/features/desktop-apps/desktop-performance';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  getDesktopPerformance: vi.fn(),
}));

const api = vi.mocked(getDesktopPerformance);

describe('DesktopPerformance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders normalized runtime KPIs', async () => {
    api.mockResolvedValue({
      summary: {
        crashFreeUsersPercent: 99.7,
        crashFreeSessionsPercent: 99.5,
        startupMs: 1800,
        memoryMb: 242,
        cpuPercent: 4.8,
        hangRatePercent: 0.2,
        networkLatencyMs: 120,
        apiFailureRatePercent: 0.4,
        versionAdoptionPercent: 76,
        sampleCount: 9,
        from: null,
        to: null,
      },
      metrics: [],
    });

    render(<DesktopPerformance workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('99.7%')).toBeInTheDocument();
    expect(screen.getByText('1.80s')).toBeInTheDocument();
    expect(screen.getByText('242.0 MB')).toBeInTheDocument();
    expect(screen.getByText('4.8%')).toBeInTheDocument();
  });

  it('renders missing-metrics state', async () => {
    api.mockResolvedValue({
      summary: {
        crashFreeUsersPercent: null,
        crashFreeSessionsPercent: null,
        startupMs: null,
        memoryMb: null,
        cpuPercent: null,
        hangRatePercent: null,
        networkLatencyMs: null,
        apiFailureRatePercent: null,
        versionAdoptionPercent: null,
        sampleCount: 0,
        from: null,
        to: null,
      },
      metrics: [],
    });

    render(<DesktopPerformance workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('No performance metrics match the current filters.')).toBeInTheDocument();
  });
});
