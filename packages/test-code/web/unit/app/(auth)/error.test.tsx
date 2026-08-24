// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AuthError from '@/app/(auth)/error';

describe('AuthError boundary', () => {
  it('renders a friendly fallback message with a retry action', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<AuthError error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
