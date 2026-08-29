'use client';

import type { WorkspaceQuestionDefinition } from '@command-center/shared-types';
import { useState } from 'react';

interface Props {
  question: WorkspaceQuestionDefinition;
  disabled?: boolean;
  onSubmit: (value: unknown) => Promise<void>;
}

function minimumTextLength(question: WorkspaceQuestionDefinition): number {
  if (question.key === 'productIdea') {
    return 3;
  }

  if (question.key === 'workspaceName') {
    return 2;
  }

  return 1;
}

function isValidAnswer(question: WorkspaceQuestionDefinition, value: unknown): boolean {
  if (question.type === 'TEXT') {
    return typeof value === 'string' && value.trim().length >= minimumTextLength(question);
  }

  if (question.type === 'MULTI_SELECT') {
    return Array.isArray(value) && value.length > 0;
  }

  if (question.type === 'BOOLEAN') {
    return typeof value === 'boolean';
  }

  return typeof value === 'string' && value.length > 0;
}

export function OnboardingQuestionCard({ question, disabled = false, onSubmit }: Props) {
  const [value, setValue] = useState<unknown>(question.type === 'MULTI_SELECT' ? [] : '');
  const valid = isValidAnswer(question, value);
  const minimumLength = minimumTextLength(question);
  const toggle = (option: string) => {
    const selected = Array.isArray(value) ? (value as string[]) : [];

    setValue(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <section aria-labelledby={`question-${question.key}`} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <h2 className='text-lg font-semibold' id={`question-${question.key}`}>
        {question.prompt}
      </h2>

      {question.type === 'TEXT' && (
        <>
          <textarea
            aria-label={question.prompt}
            className='mt-4 min-h-28 w-full rounded-xl border p-3'
            disabled={disabled}
            maxLength={question.key === 'workspaceName' ? 80 : 500}
            minLength={minimumLength}
            onChange={(event) => {
              setValue(event.target.value);
            }}
            value={String(value)}
          />

          {!valid && String(value).length > 0 && <p className='mt-2 text-sm text-amber-700'>Enter at least {minimumLength} characters.</p>}
        </>
      )}

      {question.type === 'BOOLEAN' && (
        <div className='mt-4 grid grid-cols-2 gap-3'>
          {[true, false].map((option) => (
            <button
              aria-pressed={value === option}
              className='rounded-xl border p-3 aria-pressed:border-slate-900 aria-pressed:bg-slate-50'
              disabled={disabled}
              key={String(option)}
              onClick={() => {
                setValue(option);
              }}
              type='button'
            >
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
                onClick={() => {
                  if (question.type === 'MULTI_SELECT') {
                    toggle(option.value);
                  } else {
                    setValue(option.value);
                  }
                }}
                type='button'
              >
                <span className='block font-medium'>{option.label}</span>

                {option.description && <span className='text-sm text-slate-600'>{option.description}</span>}
              </button>
            );
          })}
        </div>
      )}

      <button className='mt-5 rounded-xl bg-slate-950 px-5 py-3 font-medium text-white disabled:opacity-50' disabled={disabled || !valid} onClick={() => onSubmit(value)} type='button'>
        Continue
      </button>
    </section>
  );
}
