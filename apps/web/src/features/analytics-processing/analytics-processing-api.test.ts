import { getAnalyticsProcessingStatus, queueAnalyticsReprocessing, retryAnalyticsProcessingRun } from './analytics-processing-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('../lib/api/api-client', () => ({
  apiRequest: apiRequestMock,
}));

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('getAnalyticsProcessingStatus', () => {
  it('requests the status path with GET and forwards the signal', async () => {
    apiRequestMock.mockResolvedValue({ ok: true });
    const controller = new AbortController();

    await getAnalyticsProcessingStatus('workspace-1', 'website-1', controller.signal);

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/analytics/processing/status', {
      method: 'GET',
      signal: controller.signal,
    });
  });
});

describe('queueAnalyticsReprocessing', () => {
  it('POSTs the requested range to the reprocess path', async () => {
    apiRequestMock.mockResolvedValue({ id: 'run-1' });

    await queueAnalyticsReprocessing('workspace-1', 'website-1', {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-08T00:00:00.000Z',
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/analytics/processing/reprocess', {
      method: 'POST',
      body: {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-08T00:00:00.000Z',
      },
    });
  });
});

describe('retryAnalyticsProcessingRun', () => {
  it('POSTs to the run-specific retry path', async () => {
    apiRequestMock.mockResolvedValue({ id: 'run-1' });

    await retryAnalyticsProcessingRun('workspace-1', 'website-1', 'run-42');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/analytics/processing/runs/run-42/retry', {
      method: 'POST',
    });
  });
});
