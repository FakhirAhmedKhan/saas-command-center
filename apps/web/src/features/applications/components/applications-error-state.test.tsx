// @vitest-environment jsdom
import { ApplicationsErrorState } from './applications-error-state';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('ApplicationsErrorState', () => {
  it('renders the provided error message', () => {
    render(<ApplicationsErrorState message='Applications service is unavailable' onRetry={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Unable to load applications' })).toBeInTheDocument();
    expect(screen.getByText('Applications service is unavailable')).toBeInTheDocument();
  });

  it('calls onRetry exactly once when the retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ApplicationsErrorState message='Network error' onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
