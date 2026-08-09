'use client';

import type { FormEvent } from 'react';

import { RotateCcw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import {
  APPLICATION_CATEGORIES,
  APPLICATION_PRIORITIES,
  APPLICATION_STATUSES,
  type ApplicationCategory,
  type ApplicationPriority,
  type ApplicationStatus,
} from '../application-types';

import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../application-constants';

export interface ApplicationFilterValue {
  search: string;
  status: ApplicationStatus | '';
  priority: ApplicationPriority | '';
  category: ApplicationCategory | '';
  archiveView: 'active' | 'archived';
  sortBy: 'name' | 'status' | 'priority' | 'createdAt' | 'updatedAt' | 'targetLaunchAt';
  sortOrder: 'asc' | 'desc';
}

interface ApplicationFiltersProps {
  value: ApplicationFilterValue;
  onChange: (value: ApplicationFilterValue) => void;
  onApply: () => void;
  onReset: () => void;
}

export function ApplicationFilters({ value, onChange, onApply, onReset }: ApplicationFiltersProps) {
  function updateValue<Key extends keyof ApplicationFilterValue>(key: Key, fieldValue: ApplicationFilterValue[Key]): void {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onApply();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="grid gap-4 xl:grid-cols-[minmax(240px,1.5fr)_repeat(5,minmax(140px,1fr))]">
        <Input
          aria-label="Search applications"
          placeholder="Search applications..."
          value={value.search}
          leadingIcon={<Search className="size-4" />}
          onChange={(event) => updateValue('search', event.target.value)}
        />

        <Select aria-label="Status" value={value.status} onChange={(event) => updateValue('status', event.target.value as ApplicationStatus | '')}>
          <option value="">All statuses</option>

          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>

        <Select aria-label="Priority" value={value.priority} onChange={(event) => updateValue('priority', event.target.value as ApplicationPriority | '')}>
          <option value="">All priorities</option>

          {APPLICATION_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>

        <Select aria-label="Category" value={value.category} onChange={(event) => updateValue('category', event.target.value as ApplicationCategory | '')}>
          <option value="">All categories</option>

          {APPLICATION_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Archive view"
          value={value.archiveView}
          onChange={(event) => updateValue('archiveView', event.target.value as 'active' | 'archived')}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>

        <Select
          aria-label="Sort applications"
          value={`${value.sortBy}:${value.sortOrder}`}
          onChange={(event) => {
            const [sortBy, sortOrder] = event.target.value.split(':') as [ApplicationFilterValue['sortBy'], ApplicationFilterValue['sortOrder']];

            onChange({
              ...value,
              sortBy,
              sortOrder,
            });
          }}
        >
          <option value="updatedAt:desc">Recently updated</option>
          <option value="createdAt:desc">Recently created</option>
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
          <option value="priority:desc">Highest priority</option>
          <option value="targetLaunchAt:asc">Launch date</option>
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onReset}>
          <RotateCcw className="size-4" />
          Reset
        </Button>

        <Button type="submit">
          <Search className="size-4" />
          Apply filters
        </Button>
      </div>
    </form>
  );
}
