import { ApiError } from './api-error';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let accessToken: string | null = null;

let refreshPromise: Promise<string | null> | null = null;

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
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
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        setAccessToken(null);
        return null;
      }

      const body = (await response.json()) as {
        accessToken?: string;
      };

      if (!body.accessToken) {
        setAccessToken(null);
        return null;
      }

      setAccessToken(body.accessToken);

      return body.accessToken;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retryAfterUnauthorized = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retryAfterUnauthorized && path !== '/auth/refresh') {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      return apiRequest<T>(path, options, false);
    }
  }

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      resolveErrorMessage(body, `Request failed with status ${response.status}`),
      response.status,
      body,
    );
  }

  return body as T;
}

/**
 * Alias used by the Phase 5 application API.
 */
export const apiClient = apiRequest;
