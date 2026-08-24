'use client';

import { createApplication } from '@/features/applications/application-api';
import type { CreateApplicationPayload } from '@/features/applications/application-types';
import { ApplicationForm } from '@/features/applications/components/application-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function NewApplicationPage() {
  const params = useParams<{
    workspaceId: string;
  }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;
  const applicationsHref = `/workspaces/${workspaceId}/applications`;

  async function handleCreate(payload: CreateApplicationPayload): Promise<void> {
    const application = await createApplication(workspaceId, payload);

    router.push(`/workspaces/${workspaceId}/applications/${application.id}`);

    router.refresh();
  }

  return (
    <div className='mx-auto w-full max-w-2xl space-y-5 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header>
        <Link href={applicationsHref} className='inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800'>
          <ArrowLeft className='size-3.5' aria-hidden='true' />
          Back to applications
        </Link>

        <h1 className='mt-4 text-2xl font-semibold tracking-tight text-slate-950'>Create application</h1>

        <p className='mt-1.5 text-sm leading-6 text-slate-500'>Register a SaaS product in your command center.</p>
      </header>

      <ApplicationForm cancelHref={applicationsHref} submitLabel='Create application' onSubmit={handleCreate} />
    </div>
  );
}
