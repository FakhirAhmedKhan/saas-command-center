import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRawTrackingEvents, getTrackingStatus } from '@/features/tracking/tracking-api';

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: apiRequestMock,
}));

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('getTrackingStatus', () => {
  it('requests the tracking status path for the workspace/website', () => {
    apiRequestMock.mockResolvedValue({ connected: true });

    getTrackingStatus('workspace-1', 'website-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/tracking/status');
  });
});

describe('getRawTrackingEvents', () => {
  it('requests the events path with no query string when no query is given', () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    getRawTrackingEvents('workspace-1', 'website-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/tracking/events');
  });

  it('requests the events path with no query string for an empty query object', () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    getRawTrackingEvents('workspace-1', 'website-1', {});

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/websites/website-1/tracking/events');
  });

  it('serialises provided query parameters', () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    getRawTrackingEvents('workspace-1', 'website-1', {
      type: 'PAGE_VIEW',
      limit: 50,
    });

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const [base, queryString] = path.split('?');
    const query = new URLSearchParams(queryString);

    expect(base).toBe('/workspaces/workspace-1/websites/website-1/tracking/events');
    expect(query.get('type')).toBe('PAGE_VIEW');
    expect(query.get('limit')).toBe('50');
  });

  it('omits undefined, null and empty-string query values', () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    getRawTrackingEvents('workspace-1', 'website-1', {
      type: undefined,
      cursor: '',
      // @ts-expect-error -- exercising the runtime null-guard, not the type-level contract.
      visitorId: null,
      limit: 10,
    });

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.has('type')).toBe(false);
    expect(query.has('cursor')).toBe(false);
    expect(query.has('visitorId')).toBe(false);
    expect(query.get('limit')).toBe('10');
  });
});
