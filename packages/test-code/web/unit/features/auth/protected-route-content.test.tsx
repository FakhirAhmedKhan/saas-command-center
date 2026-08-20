// @vitest-environment jsdom
import { ProtectedRoute } from '@/features/auth/protected-route-content';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useSessionMock, replaceMock, usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  replaceMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('@/features/auth/use-session', () => ({
  useSession: useSessionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

beforeEach(() => {
  useSessionMock.mockReset();
  replaceMock.mockReset();
  usePathnameMock.mockReset();
  useSearchParamsMock.mockReset();
  usePathnameMock.mockReturnValue('/dashboard');
  useSearchParamsMock.mockReturnValue(new URLSearchParams());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProtectedRoute (content)', () => {
  it('shows a restoring-session loader and does not redirect while loading', () => {
    useSessionMock.mockReturnValue({ status: 'loading' });

    render(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
    expect(screen.getByText('Restoring your session…')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders children and does not redirect once authenticated', () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' });

    render(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('secret content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to /login with a bare next path when there is no query string', () => {
    usePathnameMock.mockReturnValue('/dashboard/settings');
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });

    render(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
    expect(screen.getByText('Redirecting to login…')).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/login?next=%2Fdashboard%2Fsettings');
  });

  it('appends and URL-encodes the current query string onto the next path', () => {
    usePathnameMock.mockReturnValue('/dashboard/apps');
    useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=billing&ref=email'));
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });

    render(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>,
    );

    // The whole "path?query" string must be encoded as a single unit -- the
    // literal '?' and '&' inside it are percent-escaped, not left raw.
    const expectedNext = encodeURIComponent('/dashboard/apps?tab=billing&ref=email');

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith(`/login?next=${expectedNext}`);
    expect(replaceMock.mock.calls[0]?.[0]).toBe('/login?next=%2Fdashboard%2Fapps%3Ftab%3Dbilling%26ref%3Demail');
  });

  it('does not redirect again once status settles to authenticated after being unauthenticated', () => {
    useSessionMock.mockReturnValue({ status: 'unauthenticated' });

    const { rerender } = render(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>,
    );

    expect(replaceMock).toHaveBeenCalledTimes(1);

    useSessionMock.mockReturnValue({ status: 'authenticated' });

    rerender(
      <ProtectedRoute>
        <div>secret content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('secret content')).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });
});
