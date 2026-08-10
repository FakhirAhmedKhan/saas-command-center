import { Check } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/features/lib/api/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, label, id, ...props }, ref) {
  const checkboxId = id ?? props.name ?? undefined;

  const input = (
    <span className='relative inline-flex size-4 shrink-0 items-center justify-center'>
      <input
        ref={ref}
        id={checkboxId}
        type='checkbox'
        className={cn(
          'peer size-4 shrink-0 appearance-none rounded-[5px] border border-slate-300 bg-white outline-none transition',
          'checked:border-brand-600 checked:bg-brand-600',
          'focus-visible:ring-4 focus-visible:ring-brand-500/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />

      <Check className='pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100' aria-hidden='true' strokeWidth={3} />
    </span>
  );

  if (!label) {
    return input;
  }

  return (
    <label htmlFor={checkboxId} className='inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700'>
      {input}
      {label}
    </label>
  );
});
