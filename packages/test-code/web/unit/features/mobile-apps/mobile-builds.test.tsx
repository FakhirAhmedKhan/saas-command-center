// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { MobileTests } from '@/features/mobile-apps/mobile-tests';

import { getMobileTestsDashboard } from '@/features/mobile-apps/mobile-apps-api';

import { render, screen } from '@testing-library/react';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/mobile-apps/mobile-apps-api', () => ({
  getMobileTestsDashboard: vi.fn(),
}));

const mockedDashboard = vi.mocked(getMobileTestsDashboard);

describe('MobileTests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedDashboard.mockResolvedValue([
      {
        id: 'build-1',

        workspaceId: 'workspace-1',

        mobileAppId: 'mobile-1',

        repositoryId: 'repo-1',

        workflowRunId: '123',

        source: 'GITHUB_ACTIONS',

        commitSha: 'a93f142',

        branch: 'development',

        version: '6.14.0',

        buildNumber: '815',

        platform: 'ANDROID',

        status: 'SUCCESS',

        startedAt: null,

        completedAt: null,

        durationMs: null,

        createdAt: '2026-08-22',

        updatedAt: '2026-08-22',

        testSummary: {
          totalRuns: 2,

          passed: 462,

          failed: 2,

          skipped: 0,

          hasFailures: true,
        },

        testRuns: [
          {
            id: 'run-unit',

            buildId: 'build-1',

            type: 'UNIT',

            status: 'PASSED',

            passed: 428,

            failed: 0,

            skipped: 0,

            durationMs: 42000,

            createdAt: '2026-08-22',

            updatedAt: '2026-08-22',

            failures: [],
          },

          {
            id: 'run-ui',

            buildId: 'build-1',

            type: 'UI',

            status: 'FAILED',

            passed: 34,

            failed: 2,

            skipped: 0,

            durationMs: 68000,

            createdAt: '2026-08-22',

            updatedAt: '2026-08-22',

            failures: [
              {
                id: 'failure-1',

                testRunId: 'run-ui',

                suite: 'BookingScreen',

                testName: 'shows confirmation',

                message: 'Expected confirmation',

                file: 'BookingScreenTest.kt',

                createdAt: '2026-08-22',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('renders test totals and failures', async () => {
    render(<MobileTests workspaceId='workspace-1' mobileAppId='mobile-1' />);

    expect(await screen.findByText('Build #815')).toBeInTheDocument();

    expect(screen.getByText('Unit Tests')).toBeInTheDocument();

    expect(screen.getByText('UI Tests')).toBeInTheDocument();

    expect(screen.getByText('View 1 failure')).toBeInTheDocument();
  });
});
