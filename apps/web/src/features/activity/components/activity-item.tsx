import Link from 'next/link';

import {
  Archive,
  Boxes,
  Code2,
  ExternalLink,
  FilePenLine,
  Globe2,
  Link2,
  RefreshCcw,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import {
  Badge,
} from '@/components/ui/badge';

import {
  ACTIVITY_BADGE_VARIANTS,
  ACTIVITY_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
} from '../activity-constants';

import type {
  ApplicationActivity,
} from '../activity-types';

import {
  formatActivityDate,
  formatRelativeActivityDate,
  getActivityActorName,
  getMetadataSummary,
} from '../activity-utils';

interface ActivityItemProps {
  workspaceId: string;

  activity:
  ApplicationActivity;

  showApplication?: boolean;
}

function getActivityIcon(
  activity:
    ApplicationActivity,
) {
  switch (
  activity.activityType
  ) {
    case 'APPLICATION_CREATED':
      return Boxes;

    case 'APPLICATION_UPDATED':
      return FilePenLine;

    case 'APPLICATION_STATUS_CHANGED':
    case 'APPLICATION_PRIORITY_CHANGED':
      return RefreshCcw;

    case 'APPLICATION_ARCHIVED':
      return Archive;

    case 'APPLICATION_RESTORED':
      return RotateCcw;

    case 'APPLICATION_DELETED':
      return Trash2;

    case 'TECHNOLOGY_ADDED':
    case 'TECHNOLOGY_UPDATED':
    case 'TECHNOLOGY_REMOVED':
      return Code2;

    case 'LINK_ADDED':
    case 'LINK_UPDATED':
    case 'LINK_REMOVED':
      return Link2;

    default:
      return FilePenLine;
  }
}
case 'WEBSITE_CREATED':
case 'WEBSITE_UPDATED':
case 'WEBSITE_ENABLED':
case 'WEBSITE_DISABLED':
case 'WEBSITE_ARCHIVED':
case 'WEBSITE_RESTORED':
case 'WEBSITE_TRACKING_KEY_ROTATED':
case 'WEBSITE_CONNECTED':
case 'WEBSITE_DISCONNECTED':
return Globe2;
export function ActivityItem({
  workspaceId,
  activity,
  showApplication = false,
}: ActivityItemProps) {
  const Icon =
    getActivityIcon(
      activity,
    );

  const metadataSummary =
    getMetadataSummary(
      activity,
    );

  return (
    <article className="relative flex gap-4 pb-8 last:pb-0">
      <div className="absolute left-5 top-11 bottom-0 w-px bg-slate-200 last:hidden" />

      <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
        <Icon className="size-4.5" />
      </div>

      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-950">
                {activity.title}
              </h3>

              <Badge
                variant={
                  ACTIVITY_BADGE_VARIANTS[
                  activity.activityType
                  ]
                }
              >
                {
                  ACTIVITY_TYPE_LABELS[
                  activity.activityType
                  ]
                }
              </Badge>

              <Badge variant="slate">
                {
                  ENTITY_TYPE_LABELS[
                  activity.entityType
                  ]
                }
              </Badge>
            </div>

            {activity.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {
                  activity.description
                }
              </p>
            ) : null}

            {metadataSummary ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                {metadataSummary}
              </p>
            ) : null}

            {showApplication ? (
              activity.applicationId ? (
                <Link
                  href={`/workspaces/${workspaceId}/applications/${activity.applicationId}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                >
                  {
                    activity.applicationName
                  }

                  <ExternalLink className="size-3.5" />
                </Link>
              ) : (
                <p className="mt-3 text-sm font-medium text-slate-500">
                  {
                    activity.applicationName
                  }{' '}
                  — deleted
                </p>
              )
            ) : null}
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p
              className="text-xs font-medium text-slate-500"
              title={formatActivityDate(
                activity.createdAt,
              )}
            >
              {formatRelativeActivityDate(
                activity.createdAt,
              )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              by{' '}
              {getActivityActorName(
                activity,
              )}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}