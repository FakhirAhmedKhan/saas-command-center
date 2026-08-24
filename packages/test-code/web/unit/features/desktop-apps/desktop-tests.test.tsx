// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDesktopTestSummary, listDesktopAppTests } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopTests } from '@/features/desktop-apps/desktop-tests';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  getDesktopTestSummary: vi.fn(),
  listDesktopAppTests: vi.fn(),
}));

const summaryMock = vi.mocked(getDesktopTestSummary);
const runsMock = vi.mocked(listDesktopAppTests);

describe('DesktopTests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    summaryMock.mockResolvedValue({
      totalRuns: 1,
      passedRuns: 0,
      failedRuns: 1,
      passedTests: 18,
      failedTests: 1,
      skippedTests: 2,
    });

    runsMock.mockResolvedValue([
      {
        id: 'run-1',
        buildId: 'build-1',
        type: 'E2E',
        status: 'FAILED',
        passed: 18,
        failed: 1,
        skipped: 2,
        total: 21,
        durationMs: 55000,
        startedAt: null,
        completedAt: null,
        createdAt: '2026-08-23T00:00:00.000Z',
        updatedAt: '2026-08-23T00:00:00.000Z',
        failures: [
          {
            id: 'failure-1',
            testRunId: 'run-1',
            suite: 'Installer',
            testName: 'installs cleanly',
            message: 'Installer exited with code 1603',
            file: 'tests/installer.spec.ts',
            line: 42,
            stackTrace: null,
            createdAt: '2026-08-23T00:00:00.000Z',
          },
        ],
      },
    ] as never);
  });

  it('renders aggregate counts and failed test drilldown', async () => {
    render(<DesktopTests workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('installs cleanly')).toBeInTheDocument();

    expect(screen.getByText('Installer exited with code 1603')).toBeInTheDocument();

    expect(screen.getByText('tests/installer.spec.ts:42')).toBeInTheDocument();
  });
});
