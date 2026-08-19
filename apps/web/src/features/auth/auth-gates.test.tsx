// @vitest-environment jsdom
import { AuthenticatedOnly, GuestOnly } from './auth-gates';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useAuthMock, replaceMock, usePathnameMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
  usePathnameMock: vi.fn(),
}));

vi.mock('@/features/auth/auth-provider', () => ({
  useAuth: useAuthMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: usePathnameMock,
}));

beforeEach(() => {
  useAuthMock.mockReset();
  replaceMock.mockReset();
  usePathnameMock.mockReset();
  usePathnameMock.mockReturnValue('/login');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GuestOnly', () => {
  it('renders a loader and does not redirect while loading', () => {
    useAuthMock.mockReturnValue({ status: 'loading', workspaces: [] });

    render(
      <GuestOnly>
        <div>guest content</div>
      </GuestOnly>,
    );

    expect(screen.queryByText('guest content')).not.toBeInTheDocument();
    expect(screen.getByText('Loading your workspace…')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders children when unauthenticated and does not redirect', () => {
    useAuthMock.mockReturnValue({ status: 'unauthenticated', workspaces: [] });

    render(
      <GuestOnly>
        <div>guest content</div>
      </GuestOnly>,
    );

    expect(screen.getByText('guest content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects a newly registered authenticated user to workspace onboarding', () => {
    usePathnameMock.mockReturnValue('/register');
    useAuthMock.mockReturnValue({ status: 'authenticated', workspaces: [] });

    render(
      <GuestOnly>
        <div>guest content</div>
      </GuestOnly>,
    );

    expect(screen.queryByText('guest content')).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/workspaces/new');
  });

  it('redirects to /dashboard and renders a loader when authenticated', () => {
    useAuthMock.mockReturnValue({ status: 'authenticated', workspaces: [] });

    render(
      <GuestOnly>
        <div>guest content</div>
      </GuestOnly>,
    );

    expect(screen.queryByText('guest content')).not.toBeInTheDocument();
    expect(screen.getByText('Loading your workspace…')).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/dashboard');
  });
});

describe('AuthenticatedOnly', () => {
  it('renders a loader and does not redirect while loading', () => {
    useAuthMock.mockReturnValue({ status: 'loading', workspaces: [] });

    render(
      <AuthenticatedOnly>
        <div>protected content</div>
      </AuthenticatedOnly>,
    );

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByText('Loading your workspace…')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders children only when authenticated', () => {
    useAuthMock.mockReturnValue({ status: 'authenticated', workspaces: [] });

    render(
      <AuthenticatedOnly>
        <div>protected content</div>
      </AuthenticatedOnly>,
    );

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to /login and renders a loader when unauthenticated', () => {
    useAuthMock.mockReturnValue({ status: 'unauthenticated', workspaces: [] });

    render(
      <AuthenticatedOnly>
        <div>protected content</div>
      </AuthenticatedOnly>,
    );

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByText('Loading your workspace…')).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/login');
  });
});
