// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GlobalError from '@/app/global-error';

describe('GlobalError boundary', () => {
  it('renders a friendly fallback message and calls reset on retry', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<GlobalError error={new Error('root layout exploded')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('root layout exploded')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
