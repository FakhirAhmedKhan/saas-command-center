import { CATEGORY_LABELS, PRIORITY_BADGE_VARIANTS, PRIORITY_LABELS, STATUS_BADGE_VARIANTS, STATUS_LABELS } from '../application-constants';
import type { SaasApplication } from '../application-types';
import { formatApplicationDate, formatRelativeApplicationDate, getApplicationInitials } from '../application-utils';
import { Badge, Card, Progress } from '@command-center/ui';
import { ArrowRight, CalendarDays, Link2 } from 'lucide-react';
import Link from 'next/link';

interface ApplicationCardProps {
  workspaceId: string;
  application: SaasApplication;
}

const MAX_VISIBLE_TECHNOLOGIES = 4;

export function ApplicationCard({ workspaceId, application }: ApplicationCardProps) {
  const technologies = application.technologies.slice(0, MAX_VISIBLE_TECHNOLOGIES);

  const extraTechnologyCount = application.technologies.length - technologies.length;

  const updatedLabel = formatRelativeApplicationDate(application.updatedAt);

  const href = `/workspaces/${workspaceId}/applications/${application.id}`;

  return (
    <Card className='group flex h-full flex-col gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover'>
      <div className='flex items-start gap-3'>
        <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700'>
          {getApplicationInitials(application.name)}
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <h2 className='truncate text-[17px] font-semibold leading-tight text-slate-950'>{application.name}</h2>

            {application.archivedAt ? (
              <Badge variant='slate' className='shrink-0'>
                Archived
              </Badge>
            ) : null}
          </div>

          <p className='mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400'>{CATEGORY_LABELS[application.category]}</p>
        </div>
      </div>

      <p className='line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-500'>{application.shortDescription ?? 'No description has been added yet.'}</p>

      <div className='flex flex-wrap gap-1.5'>
        <Badge variant={STATUS_BADGE_VARIANTS[application.status]}>{STATUS_LABELS[application.status]}</Badge>

        <Badge variant={PRIORITY_BADGE_VARIANTS[application.priority]}>{PRIORITY_LABELS[application.priority]} priority</Badge>
      </div>

      {technologies.length > 0 ? (
        <div>
          <p className='mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400'>Tech stack</p>

          <div className='flex flex-wrap gap-1.5'>
            {technologies.map((technology) => (
              <span key={technology.id} className='rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'>
                {technology.name}
              </span>
            ))}

            {extraTechnologyCount > 0 ? (
              <span className='rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'>+{extraTechnologyCount}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      <Progress value={application.progressPercent} label='Progress' />

      <div className='grid grid-cols-2 gap-3 text-sm'>
        <div>
          <div className='flex items-center gap-1 text-xs text-slate-400'>
            <CalendarDays className='size-3.5' aria-hidden='true' />
            Launch
          </div>

          <p className='mt-0.5 truncate font-medium text-slate-700'>{formatApplicationDate(application.targetLaunchAt)}</p>
        </div>

        <div>
          <div className='flex items-center gap-1 text-xs text-slate-400'>
            <Link2 className='size-3.5' aria-hidden='true' />
            Links
          </div>

          <p className='mt-0.5 font-medium text-slate-700'>{application.links.length}</p>
        </div>
      </div>

      <div className='mt-auto flex items-center justify-between border-t border-slate-100 pt-3'>
        {updatedLabel ? <span className='text-xs text-slate-400'>{updatedLabel}</span> : <span />}

        <Link href={href} className='inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition group-hover:gap-2.5 hover:text-brand-800'>
          View application
          <ArrowRight className='size-4' aria-hidden='true' />
        </Link>
      </div>
    </Card>
  );
}
