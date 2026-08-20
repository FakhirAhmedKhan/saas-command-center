// @vitest-environment jsdom
/**
 * Integration-level regression test for the GitHub-callback /login redirect
 * bug: AuthProvider's mount effect must never send two concurrent
 * POST /auth/refresh requests.
 *
 * Unlike auth-provider.test.tsx, this file does NOT mock '@/features/lib/api/api-client'
 * -- only global fetch -- so the real single-flight de-duplication inside
 * refreshSession()/performRefresh() is actually exercised, not mocked away.
 */
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { getAccessToken, setAccessToken, setUnauthorizedHandler } from '@/features/lib/api/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function AuthProbe() {
  const auth = useAuth();

  useEffect(() => {
    (window as unknown as { __auth: ReturnType<typeof useAuth> }).__auth = auth;
  }, [auth]);

  return <span data-testid='status'>{auth.status}</span>;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
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

describe('AuthProvider mount-time session restore (real api-client)', () => {
  it('sends exactly one /auth/refresh request even when the mount effect runs twice (React Strict Mode)', async () => {
    const authResponse = {
      accessToken: 'access-token-1',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { id: 'user-1', email: 'user@example.com', displayName: 'Test User' },
      workspaces: [],
    };

    vi.mocked(fetch).mockResolvedValue(jsonResponse(authResponse));

    render(
      <StrictMode>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    // Give any second, racing effect invocation a chance to have fired its
    // own request before asserting the call count is final.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const refreshCalls = vi.mocked(fetch).mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'));

    expect(refreshCalls).toHaveLength(1);
    expect(getAccessToken()).toBe('access-token-1');
  });

  it('does not revoke the session when two overlapping restores race a single-use refresh cookie', async () => {
    // Simulates the backend's refresh-token rotation: only the first request
    // that presents a given refresh token succeeds; a second concurrent use
    // of the same (already-consumed) token is rejected as replay. Before the
    // fix, AuthProvider's double mount effect sent two requests here and the
    // second one's 401 cleared the session that the first had just restored.
    let refreshCallCount = 0;

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input).endsWith('/auth/refresh')) {
        refreshCallCount += 1;

        if (refreshCallCount > 1) {
          return Promise.resolve(jsonResponse({ message: 'Refresh token reuse detected' }, { status: 401 }));
        }

        return Promise.resolve(
          jsonResponse({
            accessToken: 'access-token-1',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: { id: 'user-1', email: 'user@example.com', displayName: 'Test User' },
            workspaces: [],
          }),
        );
      }

      return Promise.resolve(jsonResponse({ ok: true }));
    });

    render(
      <StrictMode>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Status must still be authenticated -- a second, would-be-rejected
    // refresh call was never actually sent.
    expect(screen.getByTestId('status').textContent).toBe('authenticated');
    expect(refreshCallCount).toBe(1);
  });
});
