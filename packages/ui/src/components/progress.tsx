import { cn } from '../lib/cn';

export interface ProgressProps {
  value: number;
  label?: string;
  className?: string;
  barClassName?: string;
}

export function Progress({ value, label, className, barClassName }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <div className='flex items-center justify-between text-xs'>
          <span className='font-medium text-slate-500'>{label}</span>

          <span className='font-semibold text-slate-700'>{clampedValue}%</span>
        </div>
      ) : null}

      <div
        role='progressbar'
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className='h-1.5 w-full overflow-hidden rounded-full bg-slate-100'
      >
        <div className={cn('h-full rounded-full bg-brand-500 transition-[width]', barClassName)} style={{ width: `${clampedValue}%` }} />
      </div>
    </div>
  );
}
