'use client';

import { MobileAppForm } from '@/features/mobile-apps/mobile-app-form';
import { createMobileApp } from '@/features/mobile-apps/mobile-apps-api';
import type { CreateMobileApplicationInput } from '@command-center/shared-types';
import { Smartphone } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function NewMobileAppPage() {
  const params = useParams<{
    workspaceId: string;
  }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;
  const listHref = `/workspaces/${workspaceId}/mobile-apps`;

  async function handleCreate(payload: CreateMobileApplicationInput): Promise<void> {
    const mobileApp = await createMobileApp(workspaceId, payload);

    router.push(`/workspaces/${workspaceId}/mobile-apps/${mobileApp.id}`);
  }

  return (
    <main className='mx-auto w-full max-w-5xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header>
        <div className='flex items-center gap-2 text-sm font-semibold text-brand-600'>
          <Smartphone className='size-4' />
          Mobile Application
        </div>

        <h1 className='mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'>Add Mobile App</h1>

        <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>Add an Android, iOS, or cross-platform application to this workspace.</p>
      </header>

      <MobileAppForm cancelHref={listHref} submitLabel='Create Mobile App' onSubmit={handleCreate} />
    </main>
  );
}
