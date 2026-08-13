import { downloadAnalyticsReport, getAnalyticsReport } from './analytics-reports-api';
import type { AnalyticsReportRequest } from './analytics-reports.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock, apiDownloadMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  apiDownloadMock: vi.fn(),
}));

vi.mock('../lib/api/api-client', () => ({
  apiRequest: apiRequestMock,
  apiDownload: apiDownloadMock,
}));

beforeEach(() => {
  apiRequestMock.mockReset();
  apiDownloadMock.mockReset();
});

function baseRequest(overrides: Partial<AnalyticsReportRequest> = {}): AnalyticsReportRequest {
  return {
    workspaceId: 'workspace-1',
    websiteId: 'website-1',
    tab: 'pages',
    dimension: 'devices',
    preset: '7d',
    search: '',
    page: 1,
    limit: 25,
    sortBy: 'views',
    sortDirection: 'desc',
    ...overrides,
  };
}

describe('getAnalyticsReport path resolution', () => {
  it('requests the pages path for the pages tab', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await getAnalyticsReport(baseRequest({ tab: 'pages' }));

    const [path] = apiRequestMock.mock.calls[0] as [string];

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics/reports/pages?')).toBe(true);
  });

  it('requests the events path for the events tab', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await getAnalyticsReport(baseRequest({ tab: 'events', sortBy: 'events' }));

    const [path] = apiRequestMock.mock.calls[0] as [string];

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics/reports/events?')).toBe(true);
  });

  it('maps the sources tab to the "sources" dimension', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await getAnalyticsReport(baseRequest({ tab: 'sources', sortBy: 'sessions' }));

    const [path] = apiRequestMock.mock.calls[0] as [string];

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics/reports/dimensions/sources?')).toBe(true);
  });

  it('maps the geography tab to the "countries" dimension', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await getAnalyticsReport(baseRequest({ tab: 'geography', sortBy: 'sessions' }));

    const [path] = apiRequestMock.mock.calls[0] as [string];

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics/reports/dimensions/countries?')).toBe(true);
  });

  it('maps the technology tab to the selected technology dimension', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await getAnalyticsReport(baseRequest({ tab: 'technology', dimension: 'browsers', sortBy: 'sessions' }));

    const [path] = apiRequestMock.mock.calls[0] as [string];

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics/reports/dimensions/browsers?')).toBe(true);
  });

  it('uses GET and forwards the abort signal', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });
    const controller = new AbortController();

    await getAnalyticsReport(baseRequest({ signal: controller.signal }));

    const [, options] = apiRequestMock.mock.calls[0] as [string, Record<string, unknown>];

    expect(options.method).toBe('GET');
    expect(options.signal).toBe(controller.signal);
  });
});

describe('getAnalyticsReport search params', () => {
  it('serialises preset, page, limit, sortBy and sortDirection', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await getAnalyticsReport(
      baseRequest({
        preset: '30d',
        page: 3,
        limit: 50,
        sortBy: 'visitors',
        sortDirection: 'asc',
      }),
    );

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.get('preset')).toBe('30d');
    expect(query.get('page')).toBe('3');
    expect(query.get('limit')).toBe('50');
    expect(query.get('sortBy')).toBe('visitors');
    expect(query.get('sortDirection')).toBe('asc');
  });

  it('trims and includes a non-empty search term', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await getAnalyticsReport(baseRequest({ search: '  dashboard  ' }));

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.get('search')).toBe('dashboard');
  });

  it('omits the search param when the search is blank or whitespace-only', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });

    await getAnalyticsReport(baseRequest({ search: '   ' }));

    const [path] = apiRequestMock.mock.calls[0] as [string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(query.has('search')).toBe(false);
  });
});

describe('getAnalyticsReport unsupported dimension', () => {
  it('throws when the technology tab has an empty dimension', async () => {
    // getReportDimension returns request.dimension verbatim for the
    // technology tab, so createReportPath's "no dimension" guard is only
    // reachable when the dimension itself is falsy at runtime (e.g. an
    // empty string arriving from an un-validated caller).
    await expect(
      getAnalyticsReport(
        baseRequest({
          tab: 'technology',
          dimension: '' as never,
        }),
      ),
    ).rejects.toThrow('Unsupported analytics report dimension.');

    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});

describe('downloadAnalyticsReport', () => {
  it('requests the export path with page 1 and limit 100 regardless of the current page', async () => {
    apiDownloadMock.mockResolvedValue(undefined);

    await downloadAnalyticsReport(baseRequest({ tab: 'pages', page: 5, limit: 25 }));

    const [path] = apiDownloadMock.mock.calls[0] as [string, string];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics/reports/exports/pages?')).toBe(true);
    expect(query.get('page')).toBe('1');
    expect(query.get('limit')).toBe('100');
  });

  it('passes a tab-specific fallback filename', async () => {
    apiDownloadMock.mockResolvedValue(undefined);

    await downloadAnalyticsReport(baseRequest({ tab: 'events', sortBy: 'events' }));

    const [, filename] = apiDownloadMock.mock.calls[0] as [string, string];

    expect(filename).toBe('analytics-events.csv');
  });

  it('resolves the export dimension path for the technology tab', async () => {
    apiDownloadMock.mockResolvedValue(undefined);

    await downloadAnalyticsReport(baseRequest({ tab: 'technology', dimension: 'operating-systems', sortBy: 'sessions' }));

    const [path] = apiDownloadMock.mock.calls[0] as [string];

    expect(path.startsWith('/workspaces/workspace-1/websites/website-1/analytics/reports/exports/dimensions/operating-systems?')).toBe(true);
  });
});
