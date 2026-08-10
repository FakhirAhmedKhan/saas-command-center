'use client';

import { Activity, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ActivityFeed } from '@/features/activity/components/activity-feed';

export default function WorkspaceActivityPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId = params.workspaceId;

  return (
    <div className='space-y-6'>
      <header>
        <Link href='/dashboard' className='inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900'>
          <ArrowLeft className='size-4' />
          Back to dashboard
        </Link>

        <div className='mt-6 flex items-start gap-4'>
          <div className='flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600'>
            <Activity className='size-6' />
          </div>

          <div>
            <p className='text-sm font-semibold text-brand-600'>Workspace history</p>

            <h1 className='mt-1 text-3xl font-bold tracking-tight text-slate-950'>Activity feed</h1>

            <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>Review changes across every application in this workspace.</p>
          </div>
        </div>
      </header>

      <ActivityFeed
        workspaceId={workspaceId}
        showApplication
        title='Workspace activity'
        description='Application, technology and link changes across this workspace.'
      />
    </div>
  );
}
