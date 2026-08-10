import { ArrowRight, Clock3, Globe2, KeyRound, Link2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatWebsiteDate } from '../website-utils';
import type { Website } from '../website-types';

interface WebsiteCardProps {
  workspaceId: string;
  website: Website;
}

export function WebsiteCard({ workspaceId, website }: WebsiteCardProps) {
  const href = `/workspaces/${workspaceId}/websites/${website.id}`;

  return (
    <Card className='group flex h-full flex-col gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover'>
      <div className='flex items-start gap-3'>
        <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600'>
          <Globe2 className='size-4' aria-hidden='true' />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <h2 className='truncate text-[17px] font-semibold leading-tight text-slate-950'>{website.name}</h2>

            {website.archivedAt ? (
              <Badge variant='slate' className='shrink-0'>
                Archived
              </Badge>
            ) : website.enabled ? (
              <Badge variant='green' className='shrink-0'>
                Enabled
              </Badge>
            ) : (
              <Badge variant='orange' className='shrink-0'>
                Disabled
              </Badge>
            )}
          </div>

          <p className='mt-0.5 truncate text-sm text-slate-500'>{website.domain}</p>
        </div>
      </div>

      <div className='flex items-center gap-1.5 text-sm'>
        <Link2 className='size-3.5 shrink-0 text-slate-400' aria-hidden='true' />
        <span className='text-slate-500'>Application:</span>
        <span className='truncate font-medium text-slate-800'>{website.application?.name ?? 'Not connected'}</span>
      </div>

      <div className='grid grid-cols-2 gap-3 text-sm'>
        <div>
          <div className='flex items-center gap-1 text-xs text-slate-400'>
            <Clock3 className='size-3.5' aria-hidden='true' />
            Time zone
          </div>

          <p className='mt-0.5 truncate font-medium text-slate-700'>{website.timeZone}</p>
        </div>

        <div>
          <div className='flex items-center gap-1 text-xs text-slate-400'>
            <KeyRound className='size-3.5' aria-hidden='true' />
            Key prefix
          </div>

          <p className='mt-0.5 truncate font-mono text-xs font-medium text-slate-700'>{website.trackingKeyPrefix}</p>
        </div>
      </div>

      <div className='mt-auto flex items-center justify-between border-t border-slate-100 pt-3'>
        <span className='text-xs text-slate-400'>Last event: {formatWebsiteDate(website.lastEventAt)}</span>

        <Link href={href} className='inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition group-hover:gap-2.5 hover:text-brand-800'>
          View
          <ArrowRight className='size-4' aria-hidden='true' />
        </Link>
      </div>
    </Card>
  );
}
