import { ApiError } from './api-error';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;

  skipAuthentication?: boolean;

  skipRefresh?: boolean;
}

interface RefreshResponse {
  accessToken: string;
}

let accessToken: string | null = null;

let refreshPromise: Promise<string | null> | null = null;

let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedBaseUrl = API_URL.replace(/\/+$/, '');

  const normalizedPath = path.replace(/^\/+/, '');

  return `${normalizedBaseUrl}/${normalizedPath}`;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams || typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers);

  headers.set('Accept', 'application/json');

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuthentication && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  return text || undefined;
}

function resolveErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null) {
    const apiBody = body as ApiErrorBody;

    if (Array.isArray(apiBody.message)) {
      return apiBody.message.join(', ');
    }

    if (typeof apiBody.message === 'string') {
      return apiBody.message;
    }

    if (typeof apiBody.error === 'string') {
      return apiBody.error;
    }
  }

  return fallback;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',

        credentials: 'include',

        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        setAccessToken(null);

        unauthorizedHandler?.();

        return null;
      }

      const body = (await response.json()) as RefreshResponse;

      if (typeof body.accessToken !== 'string' || body.accessToken.length === 0) {
        setAccessToken(null);

        unauthorizedHandler?.();

        return null;
      }

      setAccessToken(body.accessToken);

      return body.accessToken;
    } catch {
      setAccessToken(null);

      unauthorizedHandler?.();

      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, retryAfterUnauthorized = true): Promise<T> {
  const { body, skipAuthentication, skipRefresh, ...requestInit } = options;

  const execute = (): Promise<Response> =>
    fetch(buildUrl(path), {
      ...requestInit,

      body: serializeBody(body),

      headers: buildHeaders({
        ...options,
        body,
        skipAuthentication,
        skipRefresh,
      }),

      credentials: 'include',
    });

  let response = await execute();

  if (response.status === 401 && retryAfterUnauthorized && !skipAuthentication && !skipRefresh && path !== '/auth/refresh') {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      response = await execute();
    }
  }

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(responseBody, `Request failed with status ${response.status}.`), response.status, responseBody);
  }

  return responseBody as T;
}

/**
 * Compatibility alias used by existing application APIs.
 */
export const apiClient = apiRequest;
