'use client';

import { PageLoading } from '@/components/states/page-loading';
import { ActivityFeed } from '@/features/activity/components/activity-feed';
import { getApplication } from '@/features/applications/application-api';
import { CATEGORY_LABELS, PRIORITY_BADGE_VARIANTS, PRIORITY_LABELS, STATUS_BADGE_VARIANTS, STATUS_LABELS } from '@/features/applications/application-constants';
import type { SaasApplication } from '@/features/applications/application-types';
import { formatApplicationDate, getApplicationInitials, getErrorMessage } from '@/features/applications/application-utils';
import { ApplicationSubNav } from '@/features/applications/components/application-sub-nav';
import { LinkManager } from '@/features/applications/components/link-manager';
import { TechnologyManager } from '@/features/applications/components/technology-manager';
import { Progress, ErrorState, Card, CardContent, CardHeader, Badge } from '@command-center/ui';
import { ArrowLeft, Globe2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ApplicationDetailsPage() {
  const params = useParams<{
    workspaceId: string;
    applicationId: string;
  }>();
  const { workspaceId, applicationId } = params;
  const [application, setApplication] = useState<SaasApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadApplication(): Promise<void> {
      try {
        const response = await getApplication(workspaceId, applicationId);

        if (cancelled) {
          return;
        }

        setApplication(response);
        setError(null);
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(loadError, 'Unable to load application.'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadApplication();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, applicationId, reloadKey]);

  function reload(): void {
    setReloadKey((currentValue) => currentValue + 1);
  }

  if (loading) {
    return <PageLoading label='Loading application…' />;
  }

  if (error || !application) {
    return (
      <div className='mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8'>
        <ErrorState message={error ?? 'Application was not found.'} />
      </div>
    );
  }

  const baseHref = `/workspaces/${workspaceId}/applications/${applicationId}`;

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <div>
        <Link href={`/workspaces/${workspaceId}/applications`} className='inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800'>
          <ArrowLeft className='size-3.5' aria-hidden='true' />
          Back to applications
        </Link>

        <div className='mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700'>{getApplicationInitials(application.name)}</div>

            <div className='min-w-0'>
              <h1 className='truncate text-xl font-semibold tracking-tight text-slate-950'>{application.name}</h1>

              <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
                <Badge variant={STATUS_BADGE_VARIANTS[application.status]}>{STATUS_LABELS[application.status]}</Badge>
                <Badge variant={PRIORITY_BADGE_VARIANTS[application.priority]}>{PRIORITY_LABELS[application.priority]} priority</Badge>
                {application.archivedAt ? <Badge variant='slate'>Archived</Badge> : null}
              </div>

              <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>{application.shortDescription ?? 'No short description has been added.'}</p>
            </div>
          </div>

          {!application.archivedAt ? (
            <div className='flex shrink-0 gap-2'>
              <Link
                href={`/workspaces/${workspaceId}/websites/new?applicationId=${applicationId}`}
                className='inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
              >
                <Globe2 className='size-3.5' aria-hidden='true' />
                Connect website
              </Link>

              <Link
                href={`${baseHref}/edit`}
                className='inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
              >
                <Pencil className='size-3.5' aria-hidden='true' />
                Edit
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <ApplicationSubNav workspaceId={workspaceId} applicationId={applicationId} />

      <div className='grid gap-5 lg:grid-cols-3'>
        <div className='space-y-5 lg:col-span-2'>
          <Card>
            <CardHeader>
              <h2 className='text-[15px] font-semibold text-slate-950'>Overview</h2>
            </CardHeader>

            <CardContent>
              <p className='whitespace-pre-wrap text-sm leading-7 text-slate-600'>{application.longDescription ?? 'No detailed description has been added.'}</p>
            </CardContent>
          </Card>

          <TechnologyManager workspaceId={workspaceId} applicationId={applicationId} technologies={application.technologies} disabled={Boolean(application.archivedAt)} onChanged={reload} />

          <LinkManager workspaceId={workspaceId} applicationId={applicationId} links={application.links} disabled={Boolean(application.archivedAt)} onChanged={reload} />

          <ActivityFeed workspaceId={workspaceId} applicationId={applicationId} title='Recent activity' description='Review how this application changed over time.' />
        </div>

        <div className='space-y-5'>
          <Card>
            <CardHeader>
              <h2 className='text-[15px] font-semibold text-slate-950'>Progress</h2>
            </CardHeader>

            <CardContent>
              <Progress value={application.progressPercent} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className='text-[15px] font-semibold text-slate-950'>Timeline</h2>
            </CardHeader>

            <CardContent className='space-y-3'>
              <DetailRow label='Started' value={formatApplicationDate(application.startedAt)} />
              <DetailRow label='Target launch' value={formatApplicationDate(application.targetLaunchAt)} />
              <DetailRow label='Launched' value={formatApplicationDate(application.launchedAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className='text-[15px] font-semibold text-slate-950'>Details</h2>
            </CardHeader>

            <CardContent className='space-y-3'>
              <DetailRow label='Category' value={CATEGORY_LABELS[application.category]} />
              <DetailRow label='Slug' value={application.slug} />
              <DetailRow label='Created' value={formatApplicationDate(application.createdAt)} />
              <DetailRow label='Updated' value={formatApplicationDate(application.updatedAt)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-start justify-between gap-4 text-sm'>
      <span className='text-slate-500'>{label}</span>
      <span className='text-right font-medium text-slate-800'>{value}</span>
    </div>
  );
}
