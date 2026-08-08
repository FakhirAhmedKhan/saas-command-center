'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { useParams } from 'next/navigation';

import { ArrowLeft, CalendarDays, Globe2, ListChecks, Pencil, Plus, Settings } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

import { getApplication } from '@/features/applications/application-api';

import { TechnologyManager } from '@/features/applications/components/technology-manager';
import { LinkManager } from '@/features/applications/components/link-manager';

import {
  CATEGORY_LABELS,
  PRIORITY_BADGE_VARIANTS,
  PRIORITY_LABELS,
  STATUS_BADGE_VARIANTS,
  STATUS_LABELS,
} from '@/features/applications/application-constants';

import type { SaasApplication } from '@/features/applications/application-types';

import { formatApplicationDate, getErrorMessage } from '@/features/applications/application-utils';
import { ActivityFeed } from '@/features/activity/components/activity-feed';

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
    return (
      <div className="flex min-h-80 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Spinner />
          Loading application...
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Unable to load application</h2>

          <p className="mt-2 text-sm text-slate-500">{error ?? 'Application was not found.'}</p>
        </CardContent>
      </Card>
    );
  }

  const baseHref = `/workspaces/${workspaceId}/applications/${applicationId}`;

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/workspaces/${workspaceId}/applications`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Back to applications
        </Link>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_BADGE_VARIANTS[application.status]}>
                {STATUS_LABELS[application.status]}
              </Badge>

              <Badge variant={PRIORITY_BADGE_VARIANTS[application.priority]}>
                {PRIORITY_LABELS[application.priority]} priority
              </Badge>

              {application.archivedAt ? <Badge variant="slate">Archived</Badge> : null}
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {application.name}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {application.shortDescription ?? 'No short description has been added.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!application.archivedAt ? (
              <Link
                href={`${baseHref}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="size-4" />
                Edit
              </Link>
            ) : null}

            <Link
              href={`${baseHref}/settings`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Settings className="size-4" />
              Settings
            </Link>
            <Link
              href={`/workspaces/${workspaceId}/websites`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Globe2 className="size-4" />
              Websites
            </Link>
            <Link
              href={`${baseHref}/development`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <ListChecks className="size-4" />
              Development
            </Link>

            <Link
              href={`/workspaces/${workspaceId}/websites/new?applicationId=${applicationId}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Plus className="size-4" />
              Connect website
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold text-slate-950">Overview</h2>
          </CardHeader>

          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {application.longDescription ?? 'No detailed description has been added.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-950">Application details</h2>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Category" value={CATEGORY_LABELS[application.category]} />

            <DetailRow label="Slug" value={application.slug} />

            <DetailRow label="Created" value={formatApplicationDate(application.createdAt)} />

            <DetailRow label="Updated" value={formatApplicationDate(application.updatedAt)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-brand-600" />

            <h2 className="font-semibold text-slate-950">Timeline</h2>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-3">
          <TimelineItem label="Started" value={formatApplicationDate(application.startedAt)} />

          <TimelineItem
            label="Target launch"
            value={formatApplicationDate(application.targetLaunchAt)}
          />

          <TimelineItem label="Launched" value={formatApplicationDate(application.launchedAt)} />
        </CardContent>
      </Card>

      <TechnologyManager
        workspaceId={workspaceId}
        applicationId={applicationId}
        technologies={application.technologies}
        disabled={Boolean(application.archivedAt)}
        onChanged={reload}
      />

      <LinkManager
        workspaceId={workspaceId}
        applicationId={applicationId}
        links={application.links}
        disabled={Boolean(application.archivedAt)}
        onChanged={reload}
      />

      <ActivityFeed
        workspaceId={workspaceId}
        applicationId={applicationId}
        title="Application history"
        description="Review how this application changed over time."
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-slate-500">{label}</span>

      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>

      <p className="mt-2 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
