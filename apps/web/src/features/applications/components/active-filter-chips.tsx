'use client';

import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../application-constants';
import type { ApplicationFilterValue } from './application-filters';
import { X } from 'lucide-react';

interface ActiveFilterChip {
  key: 'search' | 'status' | 'priority' | 'category' | 'archiveView';
  label: string;
}

interface ActiveFilterChipsProps {
  value: ApplicationFilterValue;
  onChange: (value: ApplicationFilterValue) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({ value, onChange, onClearAll }: ActiveFilterChipsProps) {
  const chips: ActiveFilterChip[] = [];

  if (value.search.trim()) {
    chips.push({ key: 'search', label: `"${value.search.trim()}"` });
  }

  if (value.status) {
    chips.push({ key: 'status', label: STATUS_LABELS[value.status] });
  }

  if (value.priority) {
    chips.push({ key: 'priority', label: `${PRIORITY_LABELS[value.priority]} priority` });
  }

  if (value.category) {
    chips.push({ key: 'category', label: CATEGORY_LABELS[value.category] });
  }

  if (value.archiveView === 'archived') {
    chips.push({ key: 'archiveView', label: 'Archived' });
  }

  if (chips.length === 0) {
    return null;
  }

  function clearChip(key: ActiveFilterChip['key']): void {
    if (key === 'archiveView') {
      onChange({ ...value, archiveView: 'active' });
      return;
    }

    onChange({ ...value, [key]: '' });
  }

  return (
    <div className='flex flex-wrap items-center gap-2 text-sm'>
      <span className='text-xs font-medium text-slate-400'>Active filters:</span>

      {chips.map((chip) => (
        <button
          key={chip.key}
          type='button'
          onClick={() => clearChip(chip.key)}
          className='inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-2 text-xs font-medium text-brand-700 transition hover:bg-brand-100'
        >
          {chip.label}
          <X className='size-3.5' aria-hidden='true' />
          <span className='sr-only'>Remove filter</span>
        </button>
      ))}

      <button type='button' onClick={onClearAll} className='text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline'>
        Clear all
      </button>
    </div>
  );
}
