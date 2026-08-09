import { cn } from '@/features/lib/api/cn';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, label, error, hint, id, rows = 5, ...props }, ref) {
  const textareaId = id ?? props.name ?? undefined;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={cn(
          'w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition',
          'placeholder:text-slate-400',
          'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
          'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300',
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
});
