// @vitest-environment jsdom
import { AuthProvider, useAuth } from './auth-provider';
import type { AuthResponse, CurrentUserResponse, Workspace } from './auth.types';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock, setAccessTokenMock, setUnauthorizedHandlerMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  setAccessTokenMock: vi.fn(),
  setUnauthorizedHandlerMock: vi.fn(),
}));

vi.mock('../lib/api/api-client', () => ({
  apiRequest: apiRequestMock,
  setAccessToken: setAccessTokenMock,
  setUnauthorizedHandler: setUnauthorizedHandlerMock,
}));

function makeUser(overrides: Partial<AuthResponse['user']> = {}): AuthResponse['user'] {
  return {
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    isActive: true,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'workspace-1',
    name: 'Workspace One',
    slug: 'workspace-one',
    ownerId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeAuthResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    accessToken: 'access-token-1',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: makeUser(),
    workspaces: [makeWorkspace()],
    ...overrides,
  };
}

/** Exposes the auth context value on `window.__auth` for assertions and imperative calls. */
function AuthProbe() {
  const auth = useAuth();

  useEffect(() => {
    (window as unknown as { __auth: ReturnType<typeof useAuth> }).__auth = auth;
  }, [auth]);

  return (
    <div>
      <span data-testid='status'>{auth.status}</span>
      <span data-testid='user-email'>{auth.user?.email ?? ''}</span>
      <span data-testid='workspace-count'>{auth.workspaces.length}</span>
      <span data-testid='workspace-names'>{auth.workspaces.map((workspace) => workspace.name).join(',')}</span>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

function getAuth() {
  return (window as unknown as { __auth: ReturnType<typeof useAuth> }).__auth;
}

beforeEach(() => {
  apiRequestMock.mockReset();
  setAccessTokenMock.mockReset();
  setUnauthorizedHandlerMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as { __auth?: unknown }).__auth;
});

describe('AuthProvider status state machine', () => {
  it('transitions from loading to authenticated after a successful refresh on mount', async () => {
    apiRequestMock.mockResolvedValueOnce(makeAuthResponse());

    renderAuth();

    expect(screen.getByTestId('status').textContent).toBe('loading');

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    expect(screen.getByTestId('user-email').textContent).toBe('user@example.com');
    expect(apiRequestMock).toHaveBeenCalledWith('/auth/refresh', {
      method: 'POST',
      skipAuthentication: true,
      skipRefresh: true,
    });
    expect(setAccessTokenMock).toHaveBeenCalledWith('access-token-1');
  });

  it('transitions from loading to unauthenticated after a failed refresh on mount', async () => {
    apiRequestMock.mockRejectedValueOnce(new Error('no session'));

    renderAuth();

    expect(screen.getByTestId('status').textContent).toBe('loading');

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    expect(screen.getByTestId('user-email').textContent).toBe('');
    expect(setAccessTokenMock).toHaveBeenLastCalledWith(null);
  });

  it('registers an unauthorized handler on mount and clears it on unmount', async () => {
    apiRequestMock.mockRejectedValueOnce(new Error('no session'));

    const { unmount } = renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    expect(setUnauthorizedHandlerMock).toHaveBeenCalledWith(expect.any(Function));

    unmount();

    expect(setUnauthorizedHandlerMock).toHaveBeenLastCalledWith(null);
  });
});

describe('AuthProvider login/register/logout/logoutAll', () => {
  it('login calls apiRequest with the correct method/path/body and applies the response', async () => {
    apiRequestMock.mockRejectedValueOnce(new Error('no session'));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    apiRequestMock.mockResolvedValueOnce(makeAuthResponse({ user: makeUser({ email: 'login@example.com' }) }));

    await act(async () => {
      await getAuth().login({ email: 'login@example.com', password: 'Password123!' });
    });

    expect(apiRequestMock).toHaveBeenLastCalledWith('/auth/login', {
      method: 'POST',
      body: { email: 'login@example.com', password: 'Password123!' },
      skipAuthentication: true,
      skipRefresh: true,
    });
    expect(screen.getByTestId('status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('login@example.com');
  });

  it('login rejects and leaves status unauthenticated when the API call fails', async () => {
    apiRequestMock.mockRejectedValueOnce(new Error('no session'));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    apiRequestMock.mockRejectedValueOnce(new Error('Invalid credentials'));

    await act(async () => {
      await expect(getAuth().login({ email: 'bad@example.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
    });

    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
  });

  it('register calls apiRequest with the correct method/path/body and applies the response', async () => {
    apiRequestMock.mockRejectedValueOnce(new Error('no session'));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    apiRequestMock.mockResolvedValueOnce(makeAuthResponse({ user: makeUser({ email: 'new@example.com' }) }));

    await act(async () => {
      await getAuth().register({
        email: 'new@example.com',
        password: 'Password123!',
        displayName: 'New User',
      });
    });

    expect(apiRequestMock).toHaveBeenLastCalledWith('/auth/register', {
      method: 'POST',
      body: { email: 'new@example.com', password: 'Password123!', displayName: 'New User' },
      skipAuthentication: true,
      skipRefresh: true,
    });
    expect(screen.getByTestId('status').textContent).toBe('authenticated');
  });

  it('logout calls apiRequest with the correct method/path and clears the session', async () => {
    apiRequestMock.mockResolvedValueOnce(makeAuthResponse());

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    apiRequestMock.mockResolvedValueOnce({ success: true });

    await act(async () => {
      await getAuth().logout();
    });

    expect(apiRequestMock).toHaveBeenLastCalledWith('/auth/logout', {
      method: 'POST',
      skipRefresh: true,
    });
    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('workspace-count').textContent).toBe('0');
    expect(setAccessTokenMock).toHaveBeenLastCalledWith(null);
  });

  it('logout clears the session even when the API call fails', async () => {
    apiRequestMock.mockResolvedValueOnce(makeAuthResponse());

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    apiRequestMock.mockRejectedValueOnce(new Error('network error'));

    await act(async () => {
      await expect(getAuth().logout()).rejects.toThrow('network error');
    });

    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
  });

  it('logoutAll calls apiRequest with the correct method/path and clears the session', async () => {
    apiRequestMock.mockResolvedValueOnce(makeAuthResponse());

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    apiRequestMock.mockResolvedValueOnce({ success: true });

    await act(async () => {
      await getAuth().logoutAll();
    });

    expect(apiRequestMock).toHaveBeenLastCalledWith('/auth/logout-all', {
      method: 'POST',
      skipRefresh: true,
    });
    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
  });

  it('refreshCurrentUser calls apiRequest with GET /auth/me and updates user/workspaces without changing status', async () => {
    apiRequestMock.mockResolvedValueOnce(makeAuthResponse());

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    const updatedUserResponse: CurrentUserResponse = {
      user: makeUser({ displayName: 'Refreshed Name' }),
      workspaces: [makeWorkspace({ name: 'Refreshed Workspace' })],
    };

    apiRequestMock.mockResolvedValueOnce(updatedUserResponse);

    await act(async () => {
      await getAuth().refreshCurrentUser();
    });

    expect(apiRequestMock).toHaveBeenLastCalledWith('/auth/me');
    expect(screen.getByTestId('status').textContent).toBe('authenticated');
    expect(screen.getByTestId('workspace-names').textContent).toBe('Refreshed Workspace');
  });
});

describe('AuthProvider updateWorkspaceInState', () => {
  it('adds a new workspace when it does not already exist in state', async () => {
    apiRequestMock.mockResolvedValueOnce(makeAuthResponse({ workspaces: [makeWorkspace({ id: 'workspace-1', name: 'First' })] }));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    expect(screen.getByTestId('workspace-count').textContent).toBe('1');

    act(() => {
      getAuth().updateWorkspaceInState(makeWorkspace({ id: 'workspace-2', name: 'Second' }));
    });

    expect(screen.getByTestId('workspace-count').textContent).toBe('2');
    expect(screen.getByTestId('workspace-names').textContent).toBe('First,Second');
  });

  it('merges an update into an existing workspace instead of duplicating it', async () => {
    apiRequestMock.mockResolvedValueOnce(makeAuthResponse({ workspaces: [makeWorkspace({ id: 'workspace-1', name: 'Original Name', slug: 'original' })] }));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    act(() => {
      getAuth().updateWorkspaceInState(makeWorkspace({ id: 'workspace-1', name: 'Renamed', slug: 'original' }));
    });

    expect(screen.getByTestId('workspace-count').textContent).toBe('1');
    expect(screen.getByTestId('workspace-names').textContent).toBe('Renamed');
  });
});

describe('useAuth', () => {
  it('throws when called outside an AuthProvider', () => {
    function Rogue() {
      useAuth();
      return null;
    }

    // Suppress the expected React error boundary console noise for this assertion.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Rogue />)).toThrow('useAuth must be used inside AuthProvider.');

    consoleError.mockRestore();
  });
});
