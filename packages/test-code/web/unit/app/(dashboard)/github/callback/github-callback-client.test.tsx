// @vitest-environment jsdom
import { GithubCallbackClient } from '@/app/(dashboard)/github/callback/github-callback-client';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useSessionMock, completeGithubCallbackMock, completePersonalGithubCallbackMock, replaceMock, useSearchParamsMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  completeGithubCallbackMock: vi.fn(),
  completePersonalGithubCallbackMock: vi.fn(),
  replaceMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('@/features/auth/use-session', () => ({
  useSession: useSessionMock,
}));

vi.mock('@/features/repositories/repositories-api', () => ({
  completeGithubCallback: completeGithubCallbackMock,
}));

vi.mock('@/features/workspaces/github-import/github-import-api', () => ({
  completePersonalGithubCallback: completePersonalGithubCallbackMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: useSearchParamsMock,
}));

function searchParamsFor(query: Record<string, string>): URLSearchParams {
  return new URLSearchParams(query);
}

beforeEach(() => {
  useSessionMock.mockReset();
  completeGithubCallbackMock.mockReset();
  completePersonalGithubCallbackMock.mockReset();
  replaceMock.mockReset();
  useSearchParamsMock.mockReset();
  useSearchParamsMock.mockReturnValue(searchParamsFor({ code: 'abc', state: 'xyz' }));
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('GithubCallbackClient', () => {
  it('does nothing while the session is still restoring', () => {
    useSessionMock.mockReturnValue({ status: 'loading' });

    render(<GithubCallbackClient />);

    expect(screen.getByText('Finalizing GitHub connection')).toBeInTheDocument();
    expect(completeGithubCallbackMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to /login with the callback path preserved when genuinely unauthenticated', () => {
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });

    render(<GithubCallbackClient />);

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/login?next=%2Fgithub%2Fcallback%3Fcode%3Dabc%26state%3Dxyz');
    expect(completeGithubCallbackMock).not.toHaveBeenCalled();
  });

  it('does not call the callback API or redirect to /login merely because status has not resolved yet', () => {
    // Belt-and-braces check on top of the "loading" test above: an
    // unresolved status must never be treated as unauthenticated.
    useSessionMock.mockReturnValue({ status: 'loading' });

    const { rerender } = render(<GithubCallbackClient />);

    expect(replaceMock).not.toHaveBeenCalled();

    useSessionMock.mockReturnValue({ status: 'authenticated' });
    completeGithubCallbackMock.mockReturnValue(new Promise(() => {}));

    rerender(<GithubCallbackClient />);

    expect(replaceMock).not.toHaveBeenCalled();
    expect(completeGithubCallbackMock).toHaveBeenCalledExactlyOnceWith('abc', 'xyz');
  });

  it('completes the GitHub callback and redirects to the workspace repositories page once authenticated', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    useSessionMock.mockReturnValue({ status: 'authenticated' });
    completeGithubCallbackMock.mockResolvedValue({ workspaceId: 'workspace-1', repositoryCount: 3 });

    render(<GithubCallbackClient />);

    await waitFor(() => expect(screen.getByText('GitHub connected')).toBeInTheDocument());

    expect(completeGithubCallbackMock).toHaveBeenCalledExactlyOnceWith('abc', 'xyz');
    expect(replaceMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(900);

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/workspaces/workspace-1/repositories?connected=1');
  });

  it('shows an error state without redirecting when the callback API call fails', async () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' });
    completeGithubCallbackMock.mockRejectedValue(new Error('GitHub installation could not be verified.'));

    render(<GithubCallbackClient />);

    await waitFor(() => expect(screen.getByText('Authorization failed')).toBeInTheDocument());

    expect(screen.getByText('GitHub installation could not be verified.')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('shows an error state when GitHub did not return the required code/state', () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' });
    useSearchParamsMock.mockReturnValue(searchParamsFor({}));

    render(<GithubCallbackClient />);

    expect(screen.getByText('GitHub did not return the required authorization information.')).toBeInTheDocument();
    expect(completeGithubCallbackMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
