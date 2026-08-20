// @vitest-environment jsdom
import RegisterPage from './page';
import { ApiError } from '@/features/lib/api/api-error';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { registerMock, replaceMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ register: registerMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

async function fillAndSubmit({ name = 'Jane Doe' }: { name?: string } = {}) {
  const user = userEvent.setup();

  if (name) {
    await user.type(screen.getByLabelText('Name'), name);
  }

  await user.type(screen.getByLabelText('Email'), '  new@example.com  ');
  await user.type(screen.getByLabelText('Password'), 'Password123!');
  await user.click(screen.getByRole('button', { name: 'Create account' }));

  return user;
}

beforeEach(() => {
  registerMock.mockReset();
  replaceMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RegisterPage redirect behavior', () => {
  it('always redirects to /workspaces/new on success, ignoring any next-style query param', async () => {
    registerMock.mockResolvedValueOnce(undefined);

    render(<RegisterPage />);

    await fillAndSubmit();

    expect(replaceMock).toHaveBeenCalledExactlyOnceWith('/workspaces/new');
  });

  it('does not redirect when registration fails', async () => {
    registerMock.mockRejectedValueOnce(new ApiError('Email already in use', 409));

    render(<RegisterPage />);

    await fillAndSubmit();

    await screen.findByRole('alert');

    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe('RegisterPage submit payload', () => {
  it('trims surrounding whitespace from the name and email before submitting', async () => {
    registerMock.mockResolvedValueOnce(undefined);

    render(<RegisterPage />);

    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Name'), '  Jane Doe  ');
    await user.type(screen.getByLabelText('Email'), '  new@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(registerMock).toHaveBeenCalledExactlyOnceWith({
      displayName: 'Jane Doe',
      email: 'new@example.com',
      password: 'Password123!',
    });
  });
});

describe('RegisterPage error handling', () => {
  it('renders the API error message in an alert', async () => {
    registerMock.mockRejectedValueOnce(new ApiError('Email already in use', 409));

    render(<RegisterPage />);

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Email already in use');
  });

  it('falls back to the generic message for a non-Error rejection', async () => {
    registerMock.mockRejectedValueOnce({ notAnError: true });

    render(<RegisterPage />);

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('re-enables the submit button after a failed submission', async () => {
    registerMock.mockRejectedValueOnce(new ApiError('Email already in use', 409));

    render(<RegisterPage />);

    await fillAndSubmit();

    await screen.findByRole('alert');

    expect(screen.getByRole('button', { name: 'Create account' })).not.toBeDisabled();
  });
});
