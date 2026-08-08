import Link from 'next/link';

import { ArrowRight, Clock3, Globe2, KeyRound, Link2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

import type { Website } from '../website-types';

import { formatWebsiteDate } from '../website-utils';

interface WebsiteCardProps {
  workspaceId: string;
  website: Website;
}

export function WebsiteCard({ workspaceId, website }: WebsiteCardProps) {
  return (
    <Card className="flex h-full flex-col transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Globe2 className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-950">{website.name}</h2>

                <p className="mt-1 truncate text-sm text-slate-500">{website.domain}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {website.archivedAt ? (
                  <Badge variant="slate">Archived</Badge>
                ) : website.enabled ? (
                  <Badge variant="green">Enabled</Badge>
                ) : (
                  <Badge variant="orange">Disabled</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Link2 className="size-3.5" />
            Application
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-800">
            {website.application?.name ?? 'Not connected'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock3 className="size-3.5" />
              Time zone
            </div>

            <p className="mt-1 truncate text-sm font-medium text-slate-700">{website.timeZone}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <KeyRound className="size-3.5" />
              Key prefix
            </div>

            <p className="mt-1 truncate font-mono text-sm font-medium text-slate-700">
              {website.trackingKeyPrefix}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Last event: {formatWebsiteDate(website.lastEventAt)}
        </p>
      </CardContent>

      <CardFooter>
        <Link
          href={`/workspaces/${workspaceId}/websites/${website.id}`}
          className="inline-flex w-full items-center justify-between text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          View website
          <ArrowRight className="size-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
