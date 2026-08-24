import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, getAccessToken, refreshSession, setAccessToken, setUnauthorizedHandler } from '@/features/lib/api/api-client';
import { ApiError } from '@/features/lib/api/api-error';

const BASE_URL = 'http://localhost:4000/api/v1';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function fetchMock() {
  return vi.mocked(globalThis.fetch);
}

/** The request init of the Nth fetch call. */
function callInit(index: number): RequestInit {
  return fetchMock().mock.calls[index]?.[1] as RequestInit;
}

function headerOf(index: number, name: string): string | null {
  return (callInit(index).headers as Headers).get(name);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  setAccessToken(null);
  setUnauthorizedHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('access token accessors', () => {
  it('stores and clears the access token', () => {
    expect(getAccessToken()).toBeNull();

    setAccessToken('token-1');
    expect(getAccessToken()).toBe('token-1');

    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});

describe('apiRequest url building', () => {
  it('joins a relative path onto the base url', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));

    await apiRequest('/health');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/health`);
  });

  it('normalises duplicate slashes between base and path', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));

    await apiRequest('///health');

    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/health`);
  });

  it.each([['http://other.test/thing'], ['https://other.test/thing']])('leaves the absolute url %s untouched', async (url) => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));

    await apiRequest(url);

    expect(fetchMock().mock.calls[0]?.[0]).toBe(url);
  });
});

describe('apiRequest headers and body', () => {
  it('always requests JSON and sends credentials', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));

    await apiRequest('/health');

    expect(headerOf(0, 'Accept')).toBe('application/json');
    expect(callInit(0).credentials).toBe('include');
  });

  it('attaches a bearer token when one is set', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));
    setAccessToken('token-1');

    await apiRequest('/me');

    expect(headerOf(0, 'Authorization')).toBe('Bearer token-1');
  });

  it('omits the bearer token when skipAuthentication is set', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));
    setAccessToken('token-1');

    await apiRequest('/public', { skipAuthentication: true });

    expect(headerOf(0, 'Authorization')).toBeNull();
  });

  it('serialises a plain object body as JSON', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));

    await apiRequest('/apps', { method: 'POST', body: { name: 'App' } });

    expect(callInit(0).body).toBe('{"name":"App"}');
    expect(headerOf(0, 'Content-Type')).toBe('application/json');
  });

  it('passes FormData through without a JSON content type', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));
    const form = new FormData();
    form.set('file', 'contents');

    await apiRequest('/upload', { method: 'POST', body: form });

    expect(callInit(0).body).toBe(form);
    expect(headerOf(0, 'Content-Type')).toBeNull();
  });

  it('passes a string body through unchanged', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));

    await apiRequest('/raw', { method: 'POST', body: 'plain text' });

    expect(callInit(0).body).toBe('plain text');
  });

  it('sends no body when none is provided', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ ok: true }));

    await apiRequest('/health');

    expect(callInit(0).body).toBeUndefined();
  });
});

describe('apiRequest response parsing', () => {
  it('returns the parsed JSON payload', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ id: 'app-1' }));

    await expect(apiRequest('/apps/app-1')).resolves.toEqual({ id: 'app-1' });
  });

  it('returns undefined for 204 No Content', async () => {
    fetchMock().mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiRequest('/apps/app-1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('returns raw text when the response is not JSON', async () => {
    fetchMock().mockResolvedValue(new Response('pong', { status: 200, headers: { 'content-type': 'text/plain' } }));

    await expect(apiRequest('/ping')).resolves.toBe('pong');
  });

  it('returns undefined for an empty non-JSON body', async () => {
    fetchMock().mockResolvedValue(new Response('', { status: 200, headers: { 'content-type': 'text/plain' } }));

    await expect(apiRequest('/ping')).resolves.toBeUndefined();
  });
});

describe('apiRequest error handling', () => {
  it('throws an ApiError carrying status and body', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ message: 'Not found' }, { status: 404 }));

    const error = await apiRequest('/apps/missing').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).message).toBe('Not found');
    expect((error as ApiError).details).toEqual({ message: 'Not found' });
  });

  it('joins an array of validation messages', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ message: ['name must be set', 'slug is invalid'] }, { status: 400 }));

    await expect(apiRequest('/apps')).rejects.toThrow('name must be set, slug is invalid');
  });

  it('falls back to the error field', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ error: 'Conflict' }, { status: 409 }));

    await expect(apiRequest('/apps')).rejects.toThrow('Conflict');
  });

  it('falls back to a status message when the body explains nothing', async () => {
    fetchMock().mockResolvedValue(jsonResponse({}, { status: 500 }));

    await expect(apiRequest('/apps')).rejects.toThrow('Request failed with status 500.');
  });
});

describe('apiRequest 401 refresh flow', () => {
  it('refreshes then replays the original request', async () => {
    fetchMock()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'user-1' }));

    await expect(apiRequest('/me')).resolves.toEqual({ id: 'user-1' });

    expect(fetchMock()).toHaveBeenCalledTimes(3);
    expect(fetchMock().mock.calls[1]?.[0]).toBe(`${BASE_URL}/auth/refresh`);
    expect(getAccessToken()).toBe('fresh-token');
    // The replay carries the newly issued token.
    expect(headerOf(2, 'Authorization')).toBe('Bearer fresh-token');
  });

  it('clears the token and notifies when refresh fails', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAccessToken('stale-token');

    fetchMock()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Expired' }, { status: 401 }));

    await expect(apiRequest('/me')).rejects.toBeInstanceOf(ApiError);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    // No replay after a failed refresh.
    expect(fetchMock()).toHaveBeenCalledTimes(2);
  });

  it('treats a refresh response without a token as a failure', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    fetchMock()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: '' }));

    await expect(apiRequest('/me')).rejects.toBeInstanceOf(ApiError);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('treats a network failure during refresh as a failure', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    fetchMock()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, { status: 401 }))
      .mockRejectedValueOnce(new Error('offline'));

    await expect(apiRequest('/me')).rejects.toBeInstanceOf(ApiError);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('does not refresh when skipRefresh is set', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, { status: 401 }));

    await expect(apiRequest('/me', { skipRefresh: true })).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it('does not recurse when /auth/refresh itself returns 401', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, { status: 401 }));

    await expect(apiRequest('/auth/refresh', { method: 'POST' })).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it('shares one refresh across concurrent 401s', async () => {
    fetchMock().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ accessToken: 'fresh-token' }));
      }

      return Promise.resolve(getAccessToken() === 'fresh-token' ? jsonResponse({ ok: true }) : jsonResponse({ message: 'Unauthorized' }, { status: 401 }));
    });

    await Promise.all([apiRequest('/a'), apiRequest('/b'), apiRequest('/c')]);

    const refreshCalls = fetchMock().mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'));

    expect(refreshCalls).toHaveLength(1);
  });
});

describe('refreshSession', () => {
  it('returns the full refresh payload and stores the access token', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ accessToken: 'fresh-token', user: { id: 'user-1' }, workspaces: [] }));

    await expect(refreshSession()).resolves.toEqual({ accessToken: 'fresh-token', user: { id: 'user-1' }, workspaces: [] });

    expect(getAccessToken()).toBe('fresh-token');
    expect(fetchMock().mock.calls[0]?.[0]).toBe(`${BASE_URL}/auth/refresh`);
    expect(callInit(0).credentials).toBe('include');
  });

  it('returns null and notifies the unauthorized handler when the refresh response is not ok', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    fetchMock().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, { status: 401 }));

    await expect(refreshSession()).resolves.toBeNull();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('de-duplicates concurrent refreshSession() calls into a single request', async () => {
    // Regression test: the refresh-token cookie is single-use, so two
    // independent calls (e.g. React Strict Mode double-invoking a mount
    // effect) would otherwise send two requests, and the second would be
    // rejected as token replay.
    fetchMock().mockResolvedValue(jsonResponse({ accessToken: 'fresh-token' }));

    const [first, second, third] = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(second).toEqual(third);
  });

  it('shares its in-flight request with a concurrent apiRequest() 401 retry', async () => {
    let refreshCallCount = 0;

    fetchMock().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCallCount += 1;

        return Promise.resolve(jsonResponse({ accessToken: 'fresh-token' }));
      }

      return Promise.resolve(getAccessToken() === 'fresh-token' ? jsonResponse({ ok: true }) : jsonResponse({ message: 'Unauthorized' }, { status: 401 }));
    });

    const [restoreResult] = await Promise.all([refreshSession(), apiRequest('/me')]);

    expect(refreshCallCount).toBe(1);
    expect(restoreResult).toEqual({ accessToken: 'fresh-token' });
  });
});
