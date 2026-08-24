'use client';

import { PageLoading } from '@/components/states/page-loading';
import { WebsiteSubNav } from '@/features/websites/components/website-sub-nav';
import { getWebsite } from '@/features/websites/website-api';
import type { Website } from '@/features/websites/website-types';
import { formatWebsiteDate, getWebsiteError } from '@/features/websites/website-utils';
import { ErrorState, Card, CardContent, CardHeader, Badge } from '@command-center/ui';
import { ArrowLeft, Clock3, Code2, Globe2, KeyRound, Link2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WebsiteDetailsPage() {
  const params = useParams<{
    workspaceId: string;
    websiteId: string;
  }>();
  const { workspaceId, websiteId } = params;
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await getWebsite(workspaceId, websiteId);

        if (!cancelled) {
          setWebsite(response);
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

  if (loading) {
    return <PageLoading label='Loading website…' />;
  }

  if (!website) {
    return (
      <div className='mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8'>
        <ErrorState message={error ?? 'Website was not found.'} />
      </div>
    );
  }

  const baseHref = `/workspaces/${workspaceId}/websites/${websiteId}`;

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <div>
        <Link href={`/workspaces/${workspaceId}/websites`} className='inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800'>
          <ArrowLeft className='size-3.5' aria-hidden='true' />
          Back to websites
        </Link>

        <div className='mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-1.5'>
              {website.archivedAt ? <Badge variant='slate'>Archived</Badge> : website.enabled ? <Badge variant='green'>Tracking enabled</Badge> : <Badge variant='orange'>Tracking disabled</Badge>}

              {website.application ? <Badge variant='blue'>{website.application.name}</Badge> : <Badge variant='slate'>Not connected</Badge>}
            </div>

            <h1 className='mt-2 truncate text-xl font-semibold tracking-tight text-slate-950'>{website.name}</h1>

            <a href={`https://${website.domain}`} target='_blank' rel='noreferrer' className='mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline'>
              <Globe2 className='size-3.5' aria-hidden='true' />
              {website.domain}
            </a>
          </div>

          <div className='flex shrink-0 gap-2'>
            {!website.archivedAt ? (
              <Link
                href={`${baseHref}/edit`}
                className='inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
              >
                <Pencil className='size-3.5' aria-hidden='true' />
                Edit
              </Link>
            ) : null}

            <Link href={`${baseHref}/installation`} className='inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white transition hover:bg-brand-700'>
              <Code2 className='size-3.5' aria-hidden='true' />
              Installation
            </Link>
          </div>
        </div>
      </div>

      <WebsiteSubNav workspaceId={workspaceId} websiteId={websiteId} />

      <div className='grid gap-5 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <h2 className='text-[15px] font-semibold text-slate-950'>Allowed origins</h2>
          </CardHeader>

          <CardContent>
            <div className='space-y-2'>
              {website.allowedOrigins.map((origin) => (
                <div key={origin} className='flex items-center gap-2.5 rounded-lg bg-slate-50 px-3.5 py-2.5'>
                  <Globe2 className='size-3.5 shrink-0 text-slate-400' aria-hidden='true' />

                  <code className='break-all text-sm text-slate-700'>{origin}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className='text-[15px] font-semibold text-slate-950'>Configuration</h2>
          </CardHeader>

          <CardContent className='space-y-3'>
            <DetailRow icon={<Clock3 className='size-3.5' />} label='Time zone' value={website.timeZone} />

            <DetailRow icon={<KeyRound className='size-3.5' />} label='Key prefix' value={website.trackingKeyPrefix} mono />

            <DetailRow icon={<Link2 className='size-3.5' />} label='Application' value={website.application?.name ?? 'Not connected'} />

            <DetailRow label='Key rotated' value={formatWebsiteDate(website.trackingKeyRotatedAt)} />

            <DetailRow label='Last event' value={formatWebsiteDate(website.lastEventAt)} />

            <DetailRow label='Created' value={formatWebsiteDate(website.createdAt)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, mono = false }: { icon?: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className='flex items-center gap-1.5 text-xs font-medium text-slate-400'>
        {icon}
        {label}
      </div>

      <p className={`mt-0.5 break-all text-sm font-medium text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
