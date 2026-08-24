// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/app/(auth)/login/page';
import { ApiError } from '@/features/lib/api/api-error';

const { loginMock, replaceMock, useSearchParamsMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  replaceMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ login: loginMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: useSearchParamsMock,
}));

async function fillAndSubmit() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Email'), 'user@example.com');
  await user.type(screen.getByLabelText('Password'), 'Password123!');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  return user;
}

beforeEach(() => {
  loginMock.mockReset();
  replaceMock.mockReset();
  useSearchParamsMock.mockReset();
  useSearchParamsMock.mockReturnValue(new URLSearchParams());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage open-redirect guard', () => {
  it.each([
    ['https://evil.com', 'absolute URL to another origin'],
    ['javascript:alert(1)', 'javascript: scheme'],
    ['http://evil.com/phish', 'absolute http URL'],
  ])('falls back to /dashboard instead of using a malicious next value: %s (%s)', async (nextValue) => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams({ next: nextValue }));
    loginMock.mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    await fillAndSubmit();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledTimes(1));

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/dashboard');
  });

  // Regression test for a fixed open-redirect bug: src/app/(auth)/login/page.tsx:39 used to treat
  // a protocol-relative URL like `//evil.com` as "safe" because `startsWith('/')` is true for it.
  // Browsers resolve a leading `//` as a scheme-relative absolute URL, so that was an open redirect
  // to an attacker-controlled origin. The guard now also rejects `startsWith('//')`.
  it('does not treat a protocol-relative next value like //evil.com as a safe redirect target', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams({ next: '//evil.com' }));
    loginMock.mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    await fillAndSubmit();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledTimes(1));

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/dashboard');
  });

  it('uses a safe relative next path as the redirect target', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams({ next: '/dashboard/settings' }));
    loginMock.mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    await fillAndSubmit();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledTimes(1));

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/dashboard/settings');
  });

  it('falls back to /dashboard when there is no next param at all', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    loginMock.mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    await fillAndSubmit();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledTimes(1));

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/dashboard');
  });
});

describe('LoginPage error handling', () => {
  it('renders the API error message in an alert and does not redirect on failed login', async () => {
    loginMock.mockRejectedValueOnce(new ApiError('Invalid email or password', 401));

    render(<LoginPage />);

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Invalid email or password');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('falls back to the generic message for a non-Error rejection', async () => {
    loginMock.mockRejectedValueOnce('some string rejection');

    render(<LoginPage />);

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('clears a previous error and stops showing the loading state after a failed submit', async () => {
    loginMock.mockRejectedValueOnce(new ApiError('Invalid email or password', 401));

    render(<LoginPage />);

    await fillAndSubmit();

    await screen.findByRole('alert');

    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    expect(submitButton).not.toBeDisabled();
  });
});
