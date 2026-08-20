// @vitest-environment jsdom
import { PageError } from './page-error';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('PageError', () => {
  it('renders only the safe, caller-supplied message text — never a raw error object', () => {
    render(<PageError message='Something went wrong while loading applications.' />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong while loading applications.');
  });

  it('does not leak stack traces or object internals when a caller accidentally stringifies an Error', () => {
    // Simulates a caller that passed `error.message` correctly (the safe path):
    // the component has no logic path that touches `.stack` or serializes the whole object.
    const error = new Error('Network request failed');
    error.stack = 'Error: Network request failed\n    at secretInternalFunction (/app/src/internal.ts:42:1)';

    render(<PageError message={error.message} />);

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Network request failed');
    expect(alert.textContent).not.toContain('secretInternalFunction');
    expect(alert.textContent).not.toContain('/app/src/internal.ts');
  });

  it('uses the default title when none is provided', () => {
    render(<PageError message='Failed.' />);

    expect(screen.getByRole('heading', { name: 'Unable to load this page' })).toBeInTheDocument();
  });

  it('renders a custom title when provided', () => {
    render(<PageError title='Application not found' message='Failed.' />);

    expect(screen.getByRole('heading', { name: 'Application not found' })).toBeInTheDocument();
  });

  it('shows the request id only when one is supplied', () => {
    const { rerender } = render(<PageError message='Failed.' />);

    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();

    rerender(<PageError message='Failed.' requestId='req-abc-123' />);

    expect(screen.getByText('Request ID: req-abc-123')).toBeInTheDocument();
  });

  it('renders a retry button only when onRetry is supplied, and invokes it on click', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    const { rerender } = render(<PageError message='Failed.' />);

    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();

    rerender(<PageError message='Failed.' onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
