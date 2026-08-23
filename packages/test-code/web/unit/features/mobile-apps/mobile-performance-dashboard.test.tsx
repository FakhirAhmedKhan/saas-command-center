// @vitest-environment jsdom
import { MobilePerformanceDashboard } from '@/features/mobile-apps/mobile-performance-dashboard';

import { getMobilePerformanceIssues, getMobilePerformanceSummary, getMobilePerformanceVersions } from '@/features/mobile-apps/mobile-apps-api';

import { render, screen } from '@testing-library/react';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/mobile-apps/mobile-apps-api', () => ({
  getMobilePerformanceSummary: vi.fn(),

  getMobilePerformanceVersions: vi.fn(),

  getMobilePerformanceIssues: vi.fn(),

  compareMobilePerformance: vi.fn(),
}));

describe('MobilePerformanceDashboard', () => {
  beforeEach(() => {
    vi.mocked(getMobilePerformanceSummary).mockResolvedValue({
      providerAvailable: true,

      hasData: true,

      platform: 'ANDROID',

      version: '6.14.0',

      buildNumber: '815',

      from: null,
      to: null,

      metrics: {
        CRASH_FREE_USERS_RATE: {
          metric: 'CRASH_FREE_USERS_RATE',

          value: 99.92,

          unit: '%',
          samples: 1,
        },

        CRASH_RATE: {
          metric: 'CRASH_RATE',
          value: 0.08,
          unit: '%',
          samples: 1,
        },

        CRASH_COUNT: {
          metric: 'CRASH_COUNT',
          value: 17,
          unit: 'count',
          samples: 1,
        },

        ANR_COUNT: {
          metric: 'ANR_COUNT',
          value: 3,
          unit: 'count',
          samples: 1,
        },

        HANG_COUNT: {
          metric: 'HANG_COUNT',
          value: 0,
          unit: 'count',
          samples: 1,
        },

        COLD_STARTUP_MS: {
          metric: 'COLD_STARTUP_MS',
          value: 1400,
          unit: 'ms',
          samples: 1,
        },

        WARM_STARTUP_MS: {
          metric: 'WARM_STARTUP_MS',
          value: 700,
          unit: 'ms',
          samples: 1,
        },

        MEMORY_MB: {
          metric: 'MEMORY_MB',
          value: 184,
          unit: 'MB',
          samples: 1,
        },

        NETWORK_LATENCY_MS: {
          metric: 'NETWORK_LATENCY_MS',
          value: 230,
          unit: 'ms',
          samples: 1,
        },

        API_FAILURE_RATE: {
          metric: 'API_FAILURE_RATE',
          value: 0.3,
          unit: '%',
          samples: 1,
        },

        VERSION_ADOPTION_RATE: {
          metric: 'VERSION_ADOPTION_RATE',
          value: 70,
          unit: '%',
          samples: 1,
        },

        SLOW_SCREEN_COUNT: {
          metric: 'SLOW_SCREEN_COUNT',
          value: 1,
          unit: 'count',
          samples: 1,
        },
      },
    });

    vi.mocked(getMobilePerformanceVersions).mockResolvedValue([]);

    vi.mocked(getMobilePerformanceIssues).mockResolvedValue([]);
  });

  it('renders normalized metrics', async () => {
    render(<MobilePerformanceDashboard workspaceId='workspace-1' mobileAppId='mobile-1' />);

    expect(await screen.findByText('99.92%')).toBeInTheDocument();

    expect(screen.getByText('1400ms')).toBeInTheDocument();

    expect(screen.getByText('184MB')).toBeInTheDocument();
  });
});
