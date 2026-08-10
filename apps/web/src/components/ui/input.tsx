import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/features/lib/api/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, label, error, hint, leadingIcon, id, ...props }, ref) {
  const inputId = id ?? props.name ?? undefined;

  return (
    <div className='space-y-1.5'>
      {label ? (
        <label htmlFor={inputId} className='block text-[13px] font-medium text-slate-700'>
          {label}
        </label>
      ) : null}

      <div className='relative'>
        {leadingIcon ? <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400'>{leadingIcon}</div> : null}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition',
            'placeholder:text-slate-400',
            'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
            'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
            leadingIcon && 'pl-10',
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
      </div>

      {error ? <p className='text-xs text-red-600'>{error}</p> : hint ? <p className='text-xs text-slate-500'>{hint}</p> : null}
    </div>
  );
});
