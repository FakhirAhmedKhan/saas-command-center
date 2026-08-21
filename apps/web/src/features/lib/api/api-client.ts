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

interface RefreshPayload {
  accessToken?: unknown;
}

let accessToken: string | null = null;

let refreshPromise: Promise<RefreshPayload | null> | null = null;

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

/**
 * Calls POST /auth/refresh at most once for any set of overlapping callers.
 *
 * The refresh-token cookie is single-use and rotated server-side on every
 * call; a second concurrent call with the same (already-consumed) cookie is
 * indistinguishable from token replay and gets the whole session family
 * revoked. Sharing one in-flight promise is what keeps concurrent callers
 * (an apiRequest() 401 retry racing AuthProvider's mount-time restore, or
 * React Strict Mode's double effect invocation in development) from ever
 * sending two requests for the same refresh cycle.
 */
function performRefresh(): Promise<RefreshPayload | null> {
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

      const payload = (await response.json()) as RefreshPayload;

      if (typeof payload.accessToken !== 'string' || payload.accessToken.length === 0) {
        setAccessToken(null);

        unauthorizedHandler?.();

        return null;
      }

      setAccessToken(payload.accessToken);

      return payload;
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

async function refreshAccessToken(): Promise<string | null> {
  const payload = await performRefresh();

  return typeof payload?.accessToken === 'string' ? payload.accessToken : null;
}

/**
 * Restores a session from the HTTP-only refresh cookie and returns the full
 * response body (access token plus user/workspaces), not just the token.
 * Used by AuthProvider to repopulate session state on mount -- routed
 * through the same single-flight performRefresh() as the automatic 401
 * retry above so the two never race each other's rotation.
 */
export async function refreshSession<T extends RefreshPayload>(): Promise<T | null> {
  const payload = await performRefresh();

  return payload as T | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

  if (response.status === 401 && !skipAuthentication && !skipRefresh && path !== '/auth/refresh') {
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

function getDownloadFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get('content-disposition');

  const match = disposition?.match(/filename="?([^"]+)"?/i);

  return match?.[1] ?? fallback;
}

async function executeDownloadRequest(path: string): Promise<Response> {
  const headers = new Headers({
    Accept: 'text/csv',
  });

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(buildUrl(path), {
    method: 'GET',
    credentials: 'include',

    headers,
  });
}

export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  let response = await executeDownloadRequest(path);

  if (response.status === 401) {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      response = await executeDownloadRequest(path);
    }
  }

  if (!response.ok) {
    const responseBody = await readResponseBody(response);

    throw new ApiError(resolveErrorMessage(responseBody, `Download failed with status ${response.status}.`), response.status, responseBody);
  }

  const blob = await response.blob();

  const filename = getDownloadFilename(response, fallbackFilename);

  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');

    link.href = objectUrl;

    link.download = filename;

    link.style.display = 'none';

    document.body.appendChild(link);

    link.click();

    link.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Backward-compatible alias used by existing feature APIs.
 */
export const apiClient = apiRequest;
