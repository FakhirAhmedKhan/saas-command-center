import { getPrimaryIdentifier } from './mobile-app-utils';
import { MOBILE_FRAMEWORK_LABELS, MOBILE_PLATFORM_LABELS } from './mobile-app.constants';
import type { MobileApplicationDetails } from '@command-center/shared-types';
import { ArrowRight, Pencil, Smartphone } from 'lucide-react';
import Link from 'next/link';

interface MobileAppCardProps {
  workspaceId: string;

  mobileApp: MobileApplicationDetails;
}

export function MobileAppCard({ workspaceId, mobileApp }: MobileAppCardProps) {
  const href = `/workspaces/${workspaceId}` + `/mobile-apps/${mobileApp.id}`;

  return (
    <article className='group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex min-w-0 items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600'>
            <Smartphone className='size-5' />
          </div>

          <div className='min-w-0'>
            <h2 className='truncate font-semibold text-slate-950'>{mobileApp.application.name}</h2>

            <p className='mt-1 text-sm text-slate-500'>
              {MOBILE_PLATFORM_LABELS[mobileApp.platform]}
              {' â€¢ '}
              {MOBILE_FRAMEWORK_LABELS[mobileApp.framework]}
            </p>
          </div>
        </div>
      </div>

      <div className='mt-5 space-y-3'>
        <div>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>Identifier</p>

          <p className='mt-1 truncate font-mono text-sm text-slate-700'>{getPrimaryIdentifier(mobileApp)}</p>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div>
            <p className='text-xs text-slate-400'>Version</p>

            <p className='mt-1 text-sm font-medium text-slate-700'>{mobileApp.currentVersion ?? 'â€”'}</p>
          </div>

          <div>
            <p className='text-xs text-slate-400'>Build</p>

            <p className='mt-1 text-sm font-medium text-slate-700'>{mobileApp.currentBuildNumber ?? 'â€”'}</p>
          </div>
        </div>
      </div>

      <div className='mt-5 flex items-center gap-2 border-t border-slate-100 pt-4'>
        <Link href={href} className='inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700'>
          Open
          <ArrowRight className='size-4' />
        </Link>

        <Link href={`${href}#edit`} className='ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800'>
          <Pencil className='size-3.5' />
          Edit
        </Link>
      </div>
    </article>
  );
}
