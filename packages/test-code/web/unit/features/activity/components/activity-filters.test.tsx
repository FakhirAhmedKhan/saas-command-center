// @vitest-environment jsdom
import { ActivityFilters, type ActivityFilterValue } from '@/features/activity/components/activity-filters';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const EMPTY_FILTERS: ActivityFilterValue = {
  search: '',
  activityType: '',
  actorType: '',
  entityType: '',
  dateFrom: '',
  dateTo: '',
};

describe('ActivityFilters', () => {
  it('calls onChange with the updated search value, keeping other fields intact', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ActivityFilters value={EMPTY_FILTERS} onChange={onChange} onApply={vi.fn()} onReset={vi.fn()} />);

    await user.type(screen.getByLabelText('Search activity'), 'x');

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, search: 'x' });
  });

  it('calls onApply exactly once when the form is submitted', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();

    render(<ActivityFilters value={EMPTY_FILTERS} onChange={vi.fn()} onApply={onApply} onReset={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('calls onReset when the reset button is clicked, without calling onApply', async () => {
    const onApply = vi.fn();
    const onReset = vi.fn();
    const user = userEvent.setup();

    render(<ActivityFilters value={EMPTY_FILTERS} onChange={vi.fn()} onApply={onApply} onReset={onReset} />);

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('updates the activityType field independently when the select changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ActivityFilters value={EMPTY_FILTERS} onChange={onChange} onApply={vi.fn()} onReset={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Activity type'), 'APPLICATION_CREATED');

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, activityType: 'APPLICATION_CREATED' });
  });

  it('reflects controlled date values back into the date inputs', () => {
    render(
      <ActivityFilters value={{ ...EMPTY_FILTERS, dateFrom: '2026-01-01', dateTo: '2026-01-31' }} onChange={vi.fn()} onApply={vi.fn()} onReset={vi.fn()} />,
    );

    expect(screen.getByLabelText('From date')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('To date')).toHaveValue('2026-01-31');
  });
});
