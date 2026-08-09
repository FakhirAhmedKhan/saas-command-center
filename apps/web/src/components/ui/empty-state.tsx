import { Link, Plus } from 'lucide-react';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>

      <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>

      {action ? <div className="mt-6">{action}</div> : null}

      <Link
        href="/workspaces/new"
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        <Plus className="size-4" />
        Create workspace
      </Link>
    </div>
  );
}
