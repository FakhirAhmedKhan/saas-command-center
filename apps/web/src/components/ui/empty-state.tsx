import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className='flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center'>
      <div className='flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600'>{icon}</div>

      <h3 className='mt-4 text-[15px] font-semibold text-slate-900'>{title}</h3>

      <p className='mt-1.5 max-w-md text-sm leading-6 text-slate-500'>{description}</p>

      {action ? <div className='mt-5'>{action}</div> : null}
    </div>
  );
}
