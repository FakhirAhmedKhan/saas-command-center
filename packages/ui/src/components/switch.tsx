import { cn } from '../lib/cn';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch({ className, label, id, ...props }, ref) {
  const switchId = id ?? props.name ?? undefined;
  const control = (
    <span className='relative inline-flex h-5 w-9 shrink-0 items-center'>
      <input ref={ref} id={switchId} type='checkbox' role='switch' className='peer sr-only' {...props} />

      <span
        aria-hidden='true'
        className={cn(
          'h-5 w-9 rounded-full bg-slate-200 transition-colors',
          'peer-checked:bg-brand-600',
          'peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
          className,
        )}
      />

      <span aria-hidden='true' className='pointer-events-none absolute left-0.5 size-4 translate-x-0 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4' />
    </span>
  );

  if (!label) {
    return control;
  }

  return (
    <label htmlFor={switchId} className='inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-700'>
      {control}
      {label}
    </label>
  );
});
