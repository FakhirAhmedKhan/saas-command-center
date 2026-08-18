// @vitest-environment jsdom
import DashboardError from '@/app/(dashboard)/error';
import { ApiError } from '@/features/lib/api/api-error';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('DashboardError boundary', () => {
  it('renders a friendly fallback message', () => {
    render(<DashboardError error={new Error('boom')} reset={vi.fn()} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls reset when the retry button is clicked', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<DashboardError error={new Error('boom')} reset={reset} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('does not expose the raw message or stack of a generic error', () => {
    render(<DashboardError error={new Error('leaked database connection string')} reset={vi.fn()} />);

    expect(screen.queryByText('leaked database connection string')).not.toBeInTheDocument();
  });

  it('shows the safe message and requestId for an ApiError', () => {
    const apiError = new ApiError('Workspace access denied', 403, undefined, 'req-123');

    render(<DashboardError error={apiError} reset={vi.fn()} />);

    expect(screen.getByText('Workspace access denied')).toBeInTheDocument();
    expect(screen.getByText(/req-123/)).toBeInTheDocument();
  });
});
