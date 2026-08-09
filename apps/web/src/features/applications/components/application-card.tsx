import Link from 'next/link';

import { ArrowRight, CalendarDays, ExternalLink, Layers3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

import { CATEGORY_LABELS, PRIORITY_BADGE_VARIANTS, PRIORITY_LABELS, STATUS_BADGE_VARIANTS, STATUS_LABELS } from '../application-constants';

import type { SaasApplication } from '../application-types';

import { formatApplicationDate, getApplicationInitials } from '../application-utils';

interface ApplicationCardProps {
  workspaceId: string;
  application: SaasApplication;
}

export function ApplicationCard({ workspaceId, application }: ApplicationCardProps) {
  const technologies = application.technologies.slice(0, 4);

  const extraTechnologyCount = application.technologies.length - technologies.length;

  return (
    <Card className="flex h-full flex-col transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700">
            {getApplicationInitials(application.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-950">{application.name}</h2>

                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{CATEGORY_LABELS[application.category]}</p>
              </div>

              {application.archivedAt ? <Badge variant="slate">Archived</Badge> : null}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        <p className="line-clamp-3 min-h-16 text-sm leading-6 text-slate-600">{application.shortDescription ?? 'No description has been added yet.'}</p>

        <div className="flex flex-wrap gap-2">
          <Badge variant={STATUS_BADGE_VARIANTS[application.status]}>{STATUS_LABELS[application.status]}</Badge>

          <Badge variant={PRIORITY_BADGE_VARIANTS[application.priority]}>{PRIORITY_LABELS[application.priority]} priority</Badge>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Layers3 className="size-3.5" />
            Technology
          </div>

          {technologies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {technologies.map((technology) => (
                <span key={technology.id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {technology.name}
                </span>
              ))}

              {extraTechnologyCount > 0 ? (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">+{extraTechnologyCount}</span>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No technology added</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CalendarDays className="size-3.5" />
              Target launch
            </div>

            <p className="mt-1 font-medium text-slate-700">{formatApplicationDate(application.targetLaunchAt)}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ExternalLink className="size-3.5" />
              Links
            </div>

            <p className="mt-1 font-medium text-slate-700">{application.links.length}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Link
          href={`/workspaces/${workspaceId}/applications/${application.id}`}
          className="inline-flex w-full items-center justify-between rounded-xl px-1 py-1 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
        >
          View application
          <ArrowRight className="size-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
