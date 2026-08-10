import { Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ApplicationsHeaderProps {
  workspaceId: string;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function ApplicationsHeader({ workspaceId, onRefresh, refreshing = false }: ApplicationsHeaderProps) {
  return (
    <header className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
      <div>
        <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>SaaS registry</p>

        <h1 className='mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]'>Applications</h1>

        <p className='mt-1.5 max-w-2xl text-sm leading-6 text-slate-500'>
          Manage your SaaS products, technology stacks, important links, status and launch dates.
        </p>
      </div>

      <div className='flex shrink-0 gap-2.5'>
        <Button variant='outline' size='md' onClick={onRefresh} loading={refreshing} aria-label='Refresh applications'>
          <RefreshCw className='size-4' />
          Refresh
        </Button>

        <Link
          href={`/workspaces/${workspaceId}/applications/new`}
          className='inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700'
        >
          <Plus className='size-4' />
          New application
        </Link>
      </div>
    </header>
  );
}
