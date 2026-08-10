'use client';

import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ACTIVITY_TYPE_LABELS, ACTOR_TYPE_LABELS, ENTITY_TYPE_LABELS } from '../activity-constants';
import {
  ACTIVITY_ACTOR_TYPES,
  ACTIVITY_ENTITY_TYPES,
  APPLICATION_ACTIVITY_TYPES,
  type ActivityActorType,
  type ActivityEntityType,
  type ApplicationActivityType,
} from '../activity-types';
import type { FormEvent } from 'react';

export interface ActivityFilterValue {
  search: string;

  activityType: ApplicationActivityType | '';

  actorType: ActivityActorType | '';

  entityType: ActivityEntityType | '';

  dateFrom: string;

  dateTo: string;
}

interface ActivityFiltersProps {
  value: ActivityFilterValue;

  onChange: (value: ActivityFilterValue) => void;

  onApply: () => void;

  onReset: () => void;
}

export function ActivityFilters({ value, onChange, onApply, onReset }: ActivityFiltersProps) {
  function update<Key extends keyof ActivityFilterValue>(key: Key, fieldValue: ActivityFilterValue[Key]): void {
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
    <form onSubmit={handleSubmit} className='rounded-2xl border border-slate-200 bg-white p-4 shadow-card'>
      <div className='grid gap-4 xl:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,1fr))_170px_170px]'>
        <Input
          aria-label='Search activity'
          placeholder='Search activity...'
          value={value.search}
          leadingIcon={<Search className='size-4' />}
          onChange={(event) => update('search', event.target.value)}
        />

        <Select
          aria-label='Activity type'
          value={value.activityType}
          onChange={(event) => update('activityType', event.target.value as ApplicationActivityType | '')}
        >
          <option value=''>All activities</option>

          {APPLICATION_ACTIVITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACTIVITY_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>

        <Select aria-label='Actor type' value={value.actorType} onChange={(event) => update('actorType', event.target.value as ActivityActorType | '')}>
          <option value=''>All actors</option>

          {ACTIVITY_ACTOR_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACTOR_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>

        <Select aria-label='Entity type' value={value.entityType} onChange={(event) => update('entityType', event.target.value as ActivityEntityType | '')}>
          <option value=''>All entities</option>

          {ACTIVITY_ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {ENTITY_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>

        <Input type='date' aria-label='From date' value={value.dateFrom} onChange={(event) => update('dateFrom', event.target.value)} />

        <Input type='date' aria-label='To date' value={value.dateTo} onChange={(event) => update('dateTo', event.target.value)} />
      </div>

      <div className='mt-4 flex flex-wrap justify-end gap-3'>
        <Button type='button' variant='ghost' onClick={onReset}>
          <RotateCcw className='size-4' />
          Reset
        </Button>

        <Button type='submit'>
          <Search className='size-4' />
          Apply filters
        </Button>
      </div>
    </form>
  );
}
