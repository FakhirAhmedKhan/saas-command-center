// @vitest-environment jsdom
import { ActiveFilterChips } from '@/features/applications/components/active-filter-chips';
import type { ApplicationFilterValue } from '@/features/applications/components/application-filters';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const BASE_VALUE: ApplicationFilterValue = {
  search: '',
  status: '',
  priority: '',
  category: '',
  archiveView: 'active',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

describe('ActiveFilterChips', () => {
  it('renders nothing when no filters are active', () => {
    const { container } = render(<ActiveFilterChips value={BASE_VALUE} onChange={vi.fn()} onClearAll={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a chip per active filter with human-readable labels', () => {
    render(
      <ActiveFilterChips
        value={{ ...BASE_VALUE, search: '  PriceScout  ', status: 'LIVE', priority: 'HIGH', category: 'AI', archiveView: 'archived' }}
        onChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /"PriceScout"/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Live/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /High priority/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Artificial intelligence/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Archived/ })).toBeInTheDocument();
  });

  it('ignores a whitespace-only search value', () => {
    render(<ActiveFilterChips value={{ ...BASE_VALUE, search: '   ' }} onChange={vi.fn()} onClearAll={vi.fn()} />);

    expect(screen.queryByText(/"/)).not.toBeInTheDocument();
  });

  it('clears only the search field, leaving other filters when the search chip is removed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ActiveFilterChips value={{ ...BASE_VALUE, search: 'PriceScout', status: 'LIVE' }} onChange={onChange} onClearAll={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /"PriceScout"/ }));

    expect(onChange).toHaveBeenCalledWith({ ...BASE_VALUE, search: '', status: 'LIVE' });
  });

  it('resets archiveView to "active" rather than empty string when its chip is removed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ActiveFilterChips value={{ ...BASE_VALUE, archiveView: 'archived' }} onChange={onChange} onClearAll={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /^Archived/ }));

    expect(onChange).toHaveBeenCalledWith({ ...BASE_VALUE, archiveView: 'active' });
  });

  it('calls onClearAll when "Clear all" is clicked', async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();

    render(<ActiveFilterChips value={{ ...BASE_VALUE, status: 'LIVE' }} onChange={vi.fn()} onClearAll={onClearAll} />);

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
