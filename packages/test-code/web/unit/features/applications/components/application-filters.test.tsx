// @vitest-environment jsdom
import { ApplicationFilters, type ApplicationFilterValue } from '@/features/applications/components/application-filters';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const DEFAULT_VALUE: ApplicationFilterValue = {
  search: '',
  status: '',
  priority: '',
  category: '',
  archiveView: 'active',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

describe('ApplicationFilters', () => {
  it('calls onChange with an updated search field, preserving the rest of the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ApplicationFilters value={DEFAULT_VALUE} onChange={onChange} onApply={vi.fn()} onReset={vi.fn()} />);

    await user.type(screen.getByLabelText('Search applications'), 'x');

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_VALUE, search: 'x' });
  });

  it('calls onChange with the selected status while leaving other fields untouched', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ApplicationFilters value={DEFAULT_VALUE} onChange={onChange} onApply={vi.fn()} onReset={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Status'), 'LIVE');

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_VALUE, status: 'LIVE' });
  });

  it('splits the combined sort option into sortBy and sortOrder', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ApplicationFilters value={DEFAULT_VALUE} onChange={onChange} onApply={vi.fn()} onReset={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Sort applications'), 'name:asc');

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_VALUE, sortBy: 'name', sortOrder: 'asc' });
  });

  it('calls onApply and prevents a page reload when the form is submitted', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(<ApplicationFilters value={DEFAULT_VALUE} onChange={vi.fn()} onApply={onApply} onReset={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('calls onReset when the reset button is clicked, without calling onApply', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const onApply = vi.fn();

    render(<ApplicationFilters value={DEFAULT_VALUE} onChange={vi.fn()} onApply={onApply} onReset={onReset} />);

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});
