'use client';

import { ArrowLeft, Globe2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { getApplications } from '@/features/applications/application-api';
import type { SaasApplication } from '@/features/applications/application-types';
import { WebsiteForm } from '@/features/websites/components/website-form';
import { createWebsite } from '@/features/websites/website-api';
import type { CreateWebsitePayload } from '@/features/websites/website-types';
import { websiteKeyStorageName } from '@/features/websites/website-utils';

export default function NewWebsitePage() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-80 items-center justify-center'>
          <Spinner />
        </div>
      }
    >
      <NewWebsiteContent />
    </Suspense>
  );
}

function NewWebsiteContent() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const router = useRouter();

  const searchParams = useSearchParams();

  const workspaceId = params.workspaceId;

  const initialApplicationId = searchParams.get('applicationId') ?? '';

  const [applications, setApplications] = useState<SaasApplication[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await getApplications(workspaceId, {
          archived: false,
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
        });

        if (!cancelled) {
          setApplications(response.data);

          setError(null);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load applications');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const listHref = `/workspaces/${workspaceId}/websites`;

  async function handleCreate(payload: CreateWebsitePayload): Promise<void> {
    const response = await createWebsite(workspaceId, payload);

    sessionStorage.setItem(websiteKeyStorageName(response.website.id), response.trackingKey);

    router.push(`/workspaces/${workspaceId}/websites/${response.website.id}/installation`);

    router.refresh();
  }

  if (loading) {
    return (
      <div className='flex min-h-80 items-center justify-center'>
        <Spinner />
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <header>
        <Link href={listHref} className='inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900'>
          <ArrowLeft className='size-4' />
          Back to websites
        </Link>

        <div className='mt-6 flex items-start gap-4'>
          <div className='flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600'>
            <Globe2 className='size-6' />
          </div>

          <div>
            <h1 className='text-3xl font-bold tracking-tight text-slate-950'>Create website</h1>

            <p className='mt-2 text-sm leading-6 text-slate-500'>Register an analytics website and generate its first secure tracking key.</p>
          </div>
        </div>
      </header>

      {error ? (
        <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>Applications could not be loaded: {error}</div>
      ) : null}

      <WebsiteForm
        applications={applications}
        initialApplicationId={initialApplicationId}
        cancelHref={listHref}
        submitLabel='Create website'
        onSubmit={handleCreate}
      />
    </div>
  );
}
