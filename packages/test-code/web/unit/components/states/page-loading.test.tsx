// @vitest-environment jsdom
import { PageLoading } from '@/components/states/page-loading';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('PageLoading', () => {
  it('announces the default loading label via an accessible status region', () => {
    render(<PageLoading />);

    const status = screen.getByRole('status');

    expect(status).toHaveTextContent('Loading…');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('renders a caller-supplied label instead of the default', () => {
    render(<PageLoading label='Loading applications…' />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading applications…');
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });
});
