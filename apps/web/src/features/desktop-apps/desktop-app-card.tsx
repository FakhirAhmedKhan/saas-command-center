import { DESKTOP_ARCHITECTURE_LABELS, DESKTOP_FRAMEWORK_LABELS, DESKTOP_PLATFORM_LABELS } from './desktop-app.constants';
import type { DesktopApplicationDetails } from '@command-center/shared-types';
import { ArrowRight, Monitor, Pencil } from 'lucide-react';
import Link from 'next/link';

interface DesktopAppCardProps {
  workspaceId: string;

  desktopApp: DesktopApplicationDetails;
}

export function DesktopAppCard({ workspaceId, desktopApp }: DesktopAppCardProps) {
  const detailsHref = `/workspaces/${workspaceId}` + `/desktop-apps/${desktopApp.id}`;

  return (
    <article className='group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex min-w-0 items-start gap-3'>
          <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700'>
            <Monitor className='size-5' aria-hidden='true' />
          </div>

          <div className='min-w-0'>
            <h2 className='truncate text-base font-semibold text-slate-950'>{desktopApp.application.name}</h2>

            <p className='mt-1 truncate text-xs text-slate-500'>{desktopApp.packageName ?? desktopApp.application.slug}</p>
          </div>
        </div>

        <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700'>Active</span>
      </div>

      <div className='mt-5 flex flex-wrap gap-2'>
        <span className='rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700'>{DESKTOP_PLATFORM_LABELS[desktopApp.platform]}</span>

        <span className='rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700'>{DESKTOP_FRAMEWORK_LABELS[desktopApp.framework]}</span>

        <span className='rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'>{DESKTOP_ARCHITECTURE_LABELS[desktopApp.architecture]}</span>
      </div>

      <dl className='mt-5 grid grid-cols-2 gap-3'>
        <div className='rounded-xl bg-slate-50 p-3'>
          <dt className='text-[11px] font-medium uppercase tracking-wide text-slate-400'>Version</dt>

          <dd className='mt-1 truncate text-sm font-semibold text-slate-900'>{desktopApp.currentVersion ?? 'Not set'}</dd>
        </div>

        <div className='rounded-xl bg-slate-50 p-3'>
          <dt className='text-[11px] font-medium uppercase tracking-wide text-slate-400'>Build</dt>

          <dd className='mt-1 truncate text-sm font-semibold text-slate-900'>{desktopApp.currentBuildNumber ?? 'Not set'}</dd>
        </div>
      </dl>

      <div className='mt-auto flex items-center gap-2 border-t border-slate-100 pt-5'>
        <Link
          href={detailsHref}
          className='inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800'
        >
          Open
          <ArrowRight className='size-4' aria-hidden='true' />
        </Link>

        <Link
          href={`${detailsHref}#edit`}
          className='inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
        >
          <Pencil className='size-4' aria-hidden='true' />
          Edit
        </Link>
      </div>
    </article>
  );
}
