// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubSetupClient } from '@/app/(dashboard)/github/setup/github-setup-client';

const { useSessionMock, completeGithubSetupMock, completePersonalGithubSetupMock, routerReplaceMock, useSearchParamsMock, locationReplaceMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  completeGithubSetupMock: vi.fn(),
  completePersonalGithubSetupMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  locationReplaceMock: vi.fn(),
}));

vi.mock('@/features/auth/use-session', () => ({
  useSession: useSessionMock,
}));

vi.mock('@/features/repositories/repositories-api', () => ({
  completeGithubSetup: completeGithubSetupMock,
}));

vi.mock('@/features/workspaces/github-import/github-import-api', () => ({
  completePersonalGithubSetup: completePersonalGithubSetupMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
  useSearchParams: useSearchParamsMock,
}));

function searchParamsFor(query: Record<string, string>): URLSearchParams {
  return new URLSearchParams(query);
}

beforeEach(() => {
  useSessionMock.mockReset();
  completeGithubSetupMock.mockReset();
  completePersonalGithubSetupMock.mockReset();
  routerReplaceMock.mockReset();
  useSearchParamsMock.mockReset();
  locationReplaceMock.mockReset();

  useSearchParamsMock.mockReturnValue(searchParamsFor({ installation_id: '456', state: 'install-state-1' }));

  sessionStorage.clear();

  Object.defineProperty(window, 'location', {
    value: { replace: locationReplaceMock },
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GithubSetupClient', () => {
  it('does nothing while the session is still restoring', () => {
    useSessionMock.mockReturnValue({ status: 'loading' });

    render(<GithubSetupClient />);

    expect(screen.getByText('Connecting GitHub')).toBeInTheDocument();
    expect(completeGithubSetupMock).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it('redirects to /login with the setup path preserved when genuinely unauthenticated', () => {
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });

    render(<GithubSetupClient />);

    expect(routerReplaceMock).toHaveBeenCalledExactlyOnceWith('/login?next=%2Fgithub%2Fsetup%3Finstallation_id%3D456%26state%3Dinstall-state-1');
    expect(completeGithubSetupMock).not.toHaveBeenCalled();
  });

  it('does not call the setup API or redirect to /login merely because status has not resolved yet', () => {
    useSessionMock.mockReturnValue({ status: 'loading' });

    const { rerender } = render(<GithubSetupClient />);

    expect(routerReplaceMock).not.toHaveBeenCalled();

    useSessionMock.mockReturnValue({ status: 'authenticated' });
    completeGithubSetupMock.mockReturnValue(new Promise(() => {}));

    rerender(<GithubSetupClient />);

    expect(routerReplaceMock).not.toHaveBeenCalled();
    expect(completeGithubSetupMock).toHaveBeenCalledExactlyOnceWith('install-state-1', '456');
  });

  it('navigates to the returned GitHub authorization URL once authenticated', async () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' });
    completeGithubSetupMock.mockResolvedValue({ authorizationUrl: 'https://github.com/login/oauth/authorize?client_id=abc' });

    render(<GithubSetupClient />);

    await waitFor(() => {
      expect(locationReplaceMock).toHaveBeenCalledExactlyOnceWith('https://github.com/login/oauth/authorize?client_id=abc');
    });
  });

  it('refuses to navigate to a non-GitHub authorization URL and shows an error instead', async () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' });
    completeGithubSetupMock.mockResolvedValue({ authorizationUrl: 'https://attacker.example.com/phish' });

    render(<GithubSetupClient />);

    await waitFor(() => expect(screen.getByText('GitHub connection failed')).toBeInTheDocument());

    expect(screen.getByText(/did not return a valid authorization URL/)).toBeInTheDocument();
    expect(locationReplaceMock).not.toHaveBeenCalled();
  });

  it('shows an error state without redirecting when the setup API call fails', async () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' });
    completeGithubSetupMock.mockRejectedValue(new Error('GitHub installation state has expired.'));

    render(<GithubSetupClient />);

    await waitFor(() => expect(screen.getByText('GitHub connection failed')).toBeInTheDocument());

    expect(screen.getByText('GitHub installation state has expired.')).toBeInTheDocument();
    expect(locationReplaceMock).not.toHaveBeenCalled();
  });

  it('shows an error state when GitHub did not return the required installation_id/state', () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' });
    useSearchParamsMock.mockReturnValue(searchParamsFor({}));

    render(<GithubSetupClient />);

    expect(screen.getByText('GitHub did not return the required installation information.')).toBeInTheDocument();
    expect(completeGithubSetupMock).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });
});
