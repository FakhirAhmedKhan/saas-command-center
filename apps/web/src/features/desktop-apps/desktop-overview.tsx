import type { DesktopAppOverview } from '@command-center/shared-types';
import { GitBranch, Package, MonitorCog, Workflow } from 'lucide-react';
import Link from 'next/link';

interface Props {
  workspaceId: string;
  desktopAppId: string;
  overview: DesktopAppOverview;
}

function value(value: string | null | undefined): string {
  return value?.trim() || 'Not set';
}

export function DesktopOverview({ workspaceId, desktopAppId, overview }: Props) {
  const { desktopApp, repository, latestBuild } = overview;

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex items-center gap-2'>
          <MonitorCog className='size-5 text-slate-500' aria-hidden='true' />
          <h2 className='font-semibold text-slate-950'>Desktop metadata</h2>
        </div>

        <dl className='mt-4 grid gap-4 sm:grid-cols-2'>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Platform</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{desktopApp.platform}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Framework</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{desktopApp.framework}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Architecture</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{desktopApp.architecture}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Package</dt>
            <dd className='mt-1 break-all text-sm font-medium text-slate-800'>{value(desktopApp.packageName)}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Version</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{value(desktopApp.currentVersion)}</dd>
          </div>
          <div>
            <dt className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Build</dt>
            <dd className='mt-1 text-sm font-medium text-slate-800'>{value(desktopApp.currentBuildNumber)}</dd>
          </div>
        </dl>
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex items-center gap-2'>
          <GitBranch className='size-5 text-slate-500' aria-hidden='true' />
          <h2 className='font-semibold text-slate-950'>Repository</h2>
        </div>

        {repository ? (
          <div className='mt-4'>
            <p className='font-semibold text-slate-900'>{repository.fullName}</p>
            <p className='mt-1 text-sm text-slate-500'>Default branch: {repository.defaultBranch}</p>
            <Link href={`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/code`} className='mt-4 inline-flex text-sm font-semibold text-brand-600'>
              Browse code
            </Link>
          </div>
        ) : (
          <p className='mt-4 text-sm text-slate-500'>No repository is connected.</p>
        )}
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2'>
        <div className='flex items-center gap-2'>
          <Workflow className='size-5 text-slate-500' aria-hidden='true' />
          <h2 className='font-semibold text-slate-950'>Latest build</h2>
        </div>

        {latestBuild ? (
          <div className='mt-4 flex flex-wrap items-center gap-3 text-sm'>
            <span className='rounded-full bg-slate-100 px-3 py-1 font-semibold'>{latestBuild.status}</span>
            <span>{latestBuild.platform}</span>
            <span>{latestBuild.architecture}</span>
            <span>{latestBuild.branch}</span>
            <Link href={`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${latestBuild.id}`} className='font-semibold text-brand-600'>
              Build details
            </Link>
          </div>
        ) : (
          <div className='mt-4 flex items-center gap-2 text-sm text-slate-500'>
            <Package className='size-4' aria-hidden='true' />
            No builds have been recorded yet.
          </div>
        )}
      </section>
    </div>
  );
}
