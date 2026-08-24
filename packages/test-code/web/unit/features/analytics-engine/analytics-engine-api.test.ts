import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAnalyticsAggregates, getAnalyticsEngineStatus, processAnalytics, reprocessAnalytics, runAnalyticsRetention } from '@/features/analytics-engine/analytics-engine-api';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: apiRequestMock,
}));

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('getAnalyticsEngineStatus', () => {
  it('requests the status path for the workspace/website', () => {
    apiRequestMock.mockResolvedValue({ ok: true });

    getAnalyticsEngineStatus('workspace-1', 'website-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/analytics-engine/status');
  });
});

describe('getAnalyticsAggregates', () => {
  it('includes all provided query parameters', () => {
    apiRequestMock.mockResolvedValue({ data: [] });

    getAnalyticsAggregates('workspace-1', 'website-1', {
      period: 'DAILY',
      dimension: 'PAGE',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-01-31T23:59:59.999Z',
      limit: 500,
    });

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics-engine/aggregates?')).toBe(true);
    expect(query.get('period')).toBe('DAILY');
    expect(query.get('dimension')).toBe('PAGE');
    expect(query.get('dateFrom')).toBe('2026-01-01T00:00:00.000Z');
    expect(query.get('dateTo')).toBe('2026-01-31T23:59:59.999Z');
    expect(query.get('limit')).toBe('500');
  });

  it('omits undefined and empty-string optional parameters', () => {
    apiRequestMock.mockResolvedValue({ data: [] });

    getAnalyticsAggregates('workspace-1', 'website-1', {
      period: 'HOURLY',
      dimension: 'OVERVIEW',
      dateFrom: undefined,
      dateTo: '',
      limit: undefined,
    });

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.has('dateFrom')).toBe(false);
    expect(query.has('dateTo')).toBe(false);
    expect(query.has('limit')).toBe(false);
    expect(query.get('period')).toBe('HOURLY');
    expect(query.get('dimension')).toBe('OVERVIEW');
  });
});

describe('processAnalytics', () => {
  it('POSTs the default maxEvents when none is given', () => {
    apiRequestMock.mockResolvedValue({ run: {}, status: {} });

    processAnalytics('workspace-1', 'website-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/analytics-engine/process', {
      method: 'POST',
      body: JSON.stringify({ maxEvents: 5000 }),
    });
  });

  it('POSTs a custom maxEvents value', () => {
    apiRequestMock.mockResolvedValue({ run: {}, status: {} });

    processAnalytics('workspace-1', 'website-1', 250);

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/analytics-engine/process', {
      method: 'POST',
      body: JSON.stringify({ maxEvents: 250 }),
    });
  });
});

describe('reprocessAnalytics', () => {
  it('POSTs the reprocess payload as JSON', () => {
    apiRequestMock.mockResolvedValue({ run: {}, status: {} });

    const payload = {
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-01-08T00:00:00.000Z',
      maxEvents: 100000,
    };

    reprocessAnalytics('workspace-1', 'website-1', payload);

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/analytics-engine/reprocess', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('runAnalyticsRetention', () => {
  it('POSTs to the retention path with no body', () => {
    apiRequestMock.mockResolvedValue({ rawEventsDeleted: 0 });

    runAnalyticsRetention('workspace-1', 'website-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/analytics-engine/retention', {
      method: 'POST',
    });
  });
});
