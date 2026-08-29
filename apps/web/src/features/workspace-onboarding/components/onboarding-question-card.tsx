'use client';

import type { WorkspaceQuestionDefinition } from '@command-center/shared-types';
import { useState } from 'react';

interface Props {
  question: WorkspaceQuestionDefinition;
  disabled?: boolean;
  onSubmit: (value: unknown) => Promise<void>;
}

export function OnboardingQuestionCard({ question, disabled = false, onSubmit }: Props) {
  const [value, setValue] = useState<unknown>(question.type === 'MULTI_SELECT' ? [] : '');
  const toggle = (option: string) => {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    setValue(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <section aria-labelledby={`question-${question.key}`} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <h2 id={`question-${question.key}`} className='text-lg font-semibold'>
        {question.prompt}
      </h2>

      {question.type === 'TEXT' && (
        <textarea aria-label={question.prompt} className='mt-4 min-h-28 w-full rounded-xl border p-3' disabled={disabled} maxLength={500} onChange={(event) => setValue(event.target.value)} value={String(value)} />
      )}

      {question.type === 'BOOLEAN' && (
        <div className='mt-4 grid grid-cols-2 gap-3'>
          {[true, false].map((option) => (
            <button className='rounded-xl border p-3' disabled={disabled} key={String(option)} onClick={() => setValue(option)} type='button'>
              {option ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      )}

      {(question.type === 'SINGLE_SELECT' || question.type === 'MULTI_SELECT') && (
        <div className='mt-4 grid gap-3 sm:grid-cols-2'>
          {question.options?.map((option) => {
            const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value;

            return (
              <button
                aria-pressed={selected}
                className='rounded-xl border p-3 text-left aria-pressed:border-slate-900 aria-pressed:bg-slate-50'
                disabled={disabled}
                key={option.value}
                onClick={() => (question.type === 'MULTI_SELECT' ? toggle(option.value) : setValue(option.value))}
                type='button'
              >
                <span className='block font-medium'>{option.label}</span>
                {option.description && <span className='text-sm text-slate-600'>{option.description}</span>}
              </button>
            );
          })}
        </div>
      )}

      <button
        className='mt-5 rounded-xl bg-slate-950 px-5 py-3 font-medium text-white disabled:opacity-50'
        disabled={disabled || value === '' || (Array.isArray(value) && value.length === 0)}
        onClick={() => onSubmit(value)}
        type='button'
      >
        Continue
      </button>
    </section>
  );
}
