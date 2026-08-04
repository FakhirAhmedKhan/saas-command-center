import {
  forwardRef,
  type SelectHTMLAttributes,
} from 'react';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/features/lib/api/cn';


export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectProps
>(function Select(
  {
    className,
    label,
    error,
    hint,
    id,
    children,
    ...props
  },
  ref,
) {
  const selectId =
    id ?? props.name ?? undefined;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition',
            'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
            'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
              : 'border-slate-300',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});