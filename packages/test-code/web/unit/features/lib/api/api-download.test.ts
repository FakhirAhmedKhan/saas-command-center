/**
 * apiDownload drives real DOM APIs (anchor click, object URLs), so this file
 * opts into jsdom while the rest of the api-client suite stays on node.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDownload, setAccessToken, setUnauthorizedHandler } from '@/features/lib/api/api-client';
import { ApiError } from '@/features/lib/api/api-error';

const BASE_URL = 'http://localhost:4000/api/v1';

function csvResponse(init: ResponseInit = {}): Response {
  return new Response('id,name\n1,App', {
    status: 200,
    headers: { 'content-type': 'text/csv' },
    ...init,
  });
}

function fetchMock() {
  return vi.mocked(globalThis.fetch);
}

let createObjectUrl: ReturnType<typeof vi.fn>;
let revokeObjectUrl: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());

  createObjectUrl = vi.fn(() => 'blob:mock-url');
  revokeObjectUrl = vi.fn();
  vi.stubGlobal(
    'URL',
    Object.assign(globalThis.URL, {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    }),
  );

  setAccessToken(null);
  setUnauthorizedHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiDownload', () => {
  it('requests CSV and triggers an anchor download', async () => {
    fetchMock().mockResolvedValue(csvResponse());
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await apiDownload('/reports/export', 'fallback.csv');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/reports/export`);
    expect((fetchMock().mock.calls[0]?.[1]?.headers as Headers).get('Accept')).toBe('text/csv');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('always revokes the object url', async () => {
    fetchMock().mockResolvedValue(csvResponse());
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await apiDownload('/reports/export', 'fallback.csv');

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:mock-url');
  });

  it('removes the temporary anchor from the document', async () => {
    fetchMock().mockResolvedValue(csvResponse());
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await apiDownload('/reports/export', 'fallback.csv');

    expect(document.querySelectorAll('a')).toHaveLength(0);
  });

  it('uses the filename from content-disposition', async () => {
    fetchMock().mockResolvedValue(
      csvResponse({
        headers: {
          'content-type': 'text/csv',
          'content-disposition': 'attachment; filename="report-2026.csv"',
        },
      }),
    );

    let downloadName: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });

    await apiDownload('/reports/export', 'fallback.csv');

    expect(downloadName).toBe('report-2026.csv');
  });

  it('falls back to the provided filename when the header is absent', async () => {
    fetchMock().mockResolvedValue(csvResponse());

    let downloadName: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });

    await apiDownload('/reports/export', 'fallback.csv');

    expect(downloadName).toBe('fallback.csv');
  });

  it('attaches the bearer token when one is set', async () => {
    fetchMock().mockResolvedValue(csvResponse());
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setAccessToken('token-1');

    await apiDownload('/reports/export', 'fallback.csv');

    expect((fetchMock().mock.calls[0]?.[1]?.headers as Headers).get('Authorization')).toBe('Bearer token-1');
  });

  it('refreshes then retries after a 401', async () => {
    fetchMock()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'fresh-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(csvResponse());

    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await apiDownload('/reports/export', 'fallback.csv');

    expect(fetchMock()).toHaveBeenCalledTimes(3);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('throws an ApiError when the download fails', async () => {
    fetchMock().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Report too large' }), {
        status: 413,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const error = await apiDownload('/reports/export', 'fallback.csv').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(413);
    expect((error as ApiError).message).toBe('Report too large');
  });

  it('does not create an object url when the request fails', async () => {
    fetchMock().mockResolvedValue(new Response(null, { status: 500 }));

    await expect(apiDownload('/reports/export', 'fallback.csv')).rejects.toBeInstanceOf(ApiError);

    expect(createObjectUrl).not.toHaveBeenCalled();
  });
});
