'use client';

import { DesktopAppForm } from '@/features/desktop-apps/desktop-app-form';
import { createDesktopApp } from '@/features/desktop-apps/desktop-apps-api';
import type { CreateDesktopApplicationInput } from '@command-center/shared-types';
import { ArrowLeft, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function NewDesktopAppPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const router = useRouter();

  const workspaceId = params.workspaceId;

  const listHref = `/workspaces/${workspaceId}/desktop-apps`;

  async function handleCreate(payload: CreateDesktopApplicationInput): Promise<void> {
    const desktopApp = await createDesktopApp(workspaceId, payload);

    router.push(`/workspaces/${workspaceId}/desktop-apps/${desktopApp.id}`);

    router.refresh();
  }

  return (
    <main className='mx-auto w-full max-w-3xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header>
        <Link href={listHref} className='inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900'>
          <ArrowLeft className='size-4' />
          Desktop Apps
        </Link>

        <div className='mt-6 flex items-start gap-4'>
          <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600'>
            <Monitor className='size-6' />
          </div>

          <div>
            <h1 className='text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'>Add Desktop App</h1>

            <p className='mt-2 text-sm leading-6 text-slate-500'>Register a desktop application and its current platform, framework and version information.</p>
          </div>
        </div>
      </header>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <DesktopAppForm cancelHref={listHref} submitLabel='Create Desktop App' onSubmit={handleCreate} />
      </section>
    </main>
  );
}
