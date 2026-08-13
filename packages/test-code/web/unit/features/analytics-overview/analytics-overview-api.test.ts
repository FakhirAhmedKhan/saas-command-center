import { getAnalyticsOverview } from '@/features/analytics-overview/analytics-overview-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: apiRequestMock,
}));

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('getAnalyticsOverview', () => {
  it('requests the workspace/website overview path with GET', async () => {
    apiRequestMock.mockResolvedValue({ ok: true });

    await getAnalyticsOverview({
      workspaceId: 'workspace-1',
      websiteId: 'website-1',
    });

    const [path, options] = apiRequestMock.mock.calls[0] as [string, Record<string, unknown>];

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics/overview?')).toBe(true);
    expect(options.method).toBe('GET');
  });

  it('defaults to the 7d preset when no range is supplied', async () => {
    apiRequestMock.mockResolvedValue({ ok: true });

    await getAnalyticsOverview({
      workspaceId: 'workspace-1',
      websiteId: 'website-1',
    });

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.get('preset')).toBe('7d');
    expect(query.has('from')).toBe(false);
    expect(query.has('to')).toBe(false);
  });

  it('sends the explicit preset when provided', async () => {
    apiRequestMock.mockResolvedValue({ ok: true });

    await getAnalyticsOverview({
      workspaceId: 'workspace-1',
      websiteId: 'website-1',
      preset: '30d',
    });

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.get('preset')).toBe('30d');
  });

  it('prefers an explicit from/to range over the preset', async () => {
    apiRequestMock.mockResolvedValue({ ok: true });

    await getAnalyticsOverview({
      workspaceId: 'workspace-1',
      websiteId: 'website-1',
      preset: '90d',
      from: '2026-01-01',
      to: '2026-01-31',
    });

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.get('from')).toBe('2026-01-01');
    expect(query.get('to')).toBe('2026-01-31');
    expect(query.has('preset')).toBe(false);
  });

  it('falls back to the preset when only "from" is supplied without "to"', async () => {
    apiRequestMock.mockResolvedValue({ ok: true });

    await getAnalyticsOverview({
      workspaceId: 'workspace-1',
      websiteId: 'website-1',
      preset: '30d',
      from: '2026-01-01',
    });

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.get('preset')).toBe('30d');
    expect(query.has('from')).toBe(false);
  });

  it('forwards the abort signal', async () => {
    apiRequestMock.mockResolvedValue({ ok: true });
    const controller = new AbortController();

    await getAnalyticsOverview({
      workspaceId: 'workspace-1',
      websiteId: 'website-1',
      signal: controller.signal,
    });

    const [, options] = apiRequestMock.mock.calls[0] as [string, Record<string, unknown>];

    expect(options.signal).toBe(controller.signal);
  });
});
