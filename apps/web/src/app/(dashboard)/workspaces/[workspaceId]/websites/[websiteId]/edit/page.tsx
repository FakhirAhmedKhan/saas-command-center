'use client';

import { getApplications } from '@/features/applications/application-api';
import type { SaasApplication } from '@/features/applications/application-types';
import { WebsiteForm } from '@/features/websites/components/website-form';
import { getWebsite, updateWebsite } from '@/features/websites/website-api';
import type { CreateWebsitePayload, Website } from '@/features/websites/website-types';
import { getWebsiteError } from '@/features/websites/website-utils';
import { Spinner } from '@command-center/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditWebsitePage() {
  const params = useParams<{
    workspaceId: string;
    websiteId: string;
  }>();

  const router = useRouter();

  const { workspaceId, websiteId } = params;

  const [website, setWebsite] = useState<Website | null>(null);

  const [applications, setApplications] = useState<SaasApplication[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const detailsHref = `/workspaces/${workspaceId}/websites/${websiteId}`;

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [websiteResponse, applicationsResponse] = await Promise.all([
          getWebsite(workspaceId, websiteId),

          getApplications(workspaceId, {
            archived: false,
            page: 1,
            limit: 100,
            sortBy: 'name',
            sortOrder: 'asc',
          }),
        ]);

        if (!cancelled) {
          setWebsite(websiteResponse);

          setApplications(applicationsResponse.data);

          setError(null);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getWebsiteError(loadError, 'Unable to load website.'));
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
  }, [workspaceId, websiteId]);

  async function handleUpdate(payload: CreateWebsitePayload): Promise<void> {
    await updateWebsite(workspaceId, websiteId, {
      name: payload.name,
      domain: payload.domain,
      timeZone: payload.timeZone,
      enabled: payload.enabled,
      allowedOrigins: payload.allowedOrigins,
    });

    router.push(detailsHref);

    router.refresh();
  }

  if (loading) {
    return (
      <div className='flex min-h-80 items-center justify-center'>
        <Spinner />
      </div>
    );
  }

  if (!website) {
    return <div className='rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700'>{error}</div>;
  }

  if (website.archivedAt) {
    return (
      <div className='rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800'>Restore this website before editing its configuration.</div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <Link href={detailsHref} className='inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900'>
        <ArrowLeft className='size-4' />
        Back to website
      </Link>

      <header>
        <h1 className='text-3xl font-bold tracking-tight text-slate-950'>Edit website</h1>

        <p className='mt-2 text-sm text-slate-500'>Update domain, time zone and allowed tracking origins.</p>
      </header>

      <WebsiteForm website={website} applications={applications} cancelHref={detailsHref} submitLabel='Save changes' onSubmit={handleUpdate} />
    </div>
  );
}
