import Link from 'next/link';
import { createElement } from 'react';

import {
  Archive,
  ArrowUpDown,
  Boxes,
  CircleCheckBig,
  Code2,
  ExternalLink,
  FilePenLine,
  Flag,
  Globe2,
  LayoutTemplate,
  Link2,
  ListTodo,
  Move,
  OctagonAlert,
  RefreshCcw,
  RotateCcw,
  SkipForward,
  Trash2,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import {
  ACTIVITY_BADGE_VARIANTS,
  ACTIVITY_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
} from '../activity-constants';

import type {
  ApplicationActivity,
  ApplicationActivityType,
} from '../activity-types';

import {
  formatActivityDate,
  formatRelativeActivityDate,
  getActivityActorName,
  getMetadataSummary,
} from '../activity-utils';

interface ActivityItemProps {
  workspaceId: string;
  activity: ApplicationActivity;
  showApplication?: boolean;
}

/**
 * Keeping this as a typed record makes TypeScript report an error whenever
 * a new ApplicationActivityType is added without assigning an icon.
 */
const ACTIVITY_ICONS = {
  // Application
  APPLICATION_CREATED: Boxes,
  APPLICATION_UPDATED: FilePenLine,
  APPLICATION_STATUS_CHANGED: RefreshCcw,
  APPLICATION_PRIORITY_CHANGED: RefreshCcw,
  APPLICATION_ARCHIVED: Archive,
  APPLICATION_RESTORED: RotateCcw,
  APPLICATION_DELETED: Trash2,

  // Technology
  TECHNOLOGY_ADDED: Code2,
  TECHNOLOGY_UPDATED: Code2,
  TECHNOLOGY_REMOVED: Code2,

  // Link
  LINK_ADDED: Link2,
  LINK_UPDATED: Link2,
  LINK_REMOVED: Link2,

  // Milestone
  MILESTONE_CREATED: Flag,
  MILESTONE_UPDATED: Flag,
  MILESTONE_COMPLETED: CircleCheckBig,
  MILESTONE_REOPENED: RotateCcw,
  MILESTONE_SKIPPED: SkipForward,
  MILESTONE_DELETED: Trash2,
  MILESTONE_REORDERED: ArrowUpDown,

  // Task
  TASK_CREATED: ListTodo,
  TASK_UPDATED: FilePenLine,
  TASK_STATUS_CHANGED: RefreshCcw,
  TASK_COMPLETED: CircleCheckBig,
  TASK_REOPENED: RotateCcw,
  TASK_SKIPPED: SkipForward,
  TASK_MOVED: Move,
  TASK_DELETED: Trash2,
  TASK_REORDERED: ArrowUpDown,

  // Blocker
  BLOCKER_CREATED: OctagonAlert,
  BLOCKER_UPDATED: FilePenLine,
  BLOCKER_RESOLVED: CircleCheckBig,
  BLOCKER_REOPENED: OctagonAlert,
  BLOCKER_DELETED: Trash2,

  // Development template
  DEVELOPMENT_TEMPLATE_APPLIED: LayoutTemplate,

  // Website
  WEBSITE_CREATED: Globe2,
  WEBSITE_UPDATED: Globe2,
  WEBSITE_ENABLED: Globe2,
  WEBSITE_DISABLED: Globe2,
  WEBSITE_ARCHIVED: Archive,
  WEBSITE_RESTORED: RotateCcw,
  WEBSITE_TRACKING_KEY_ROTATED: RefreshCcw,
  WEBSITE_CONNECTED: Globe2,
  WEBSITE_DISCONNECTED: Globe2,
} satisfies Record<ApplicationActivityType, LucideIcon>;

export function ActivityItem({
  workspaceId,
  activity,
  showApplication = false,
}: ActivityItemProps) {
const metadataSummary = getMetadataSummary(activity);

  const activityLabel =
    ACTIVITY_TYPE_LABELS[activity.activityType];

  const entityLabel =
    ENTITY_TYPE_LABELS[activity.entityType];

  const badgeVariant =
    ACTIVITY_BADGE_VARIANTS[activity.activityType];

  const formattedDate = formatActivityDate(
    activity.createdAt,
  );

  const relativeDate = formatRelativeActivityDate(
    activity.createdAt,
  );

  const actorName = getActivityActorName(activity);

  const applicationUrl = activity.applicationId
    ? `/workspaces/${encodeURIComponent(
      workspaceId,
    )}/applications/${encodeURIComponent(
      activity.applicationId,
    )}`
    : null;

  return (
    <article className="group relative flex gap-4 pb-8 last:pb-0">
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-5 top-11 w-px bg-slate-200 group-last:hidden"
      />

      <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
        {createElement(
          ACTIVITY_ICONS[
            activity.activityType
          ],
          {
            'aria-hidden': true,
            className: 'size-[18px]',
            strokeWidth: 1.8,
          },
        )}
      </div>

      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words font-semibold text-slate-950">
                {activity.title}
              </h3>

              <Badge variant={badgeVariant}>
                {activityLabel}
              </Badge>

              <Badge variant="slate">
                {entityLabel}
              </Badge>
            </div>

            {activity.description ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {activity.description}
              </p>
            ) : null}

            {metadataSummary ? (
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                <p className="break-words text-xs font-medium leading-5 text-slate-600">
                  {metadataSummary}
                </p>
              </div>
            ) : null}

            {showApplication ? (
              applicationUrl ? (
                <Link
                  href={applicationUrl}
                  className="mt-3 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  <span className="truncate">
                    {activity.applicationName}
                  </span>

                  <ExternalLink
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                  />
                </Link>
              ) : (
                <p className="mt-3 text-sm font-medium text-slate-500">
                  {activity.applicationName}
                  <span className="font-normal">
                    {' '}
                    — deleted
                  </span>
                </p>
              )
            ) : null}
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <time
              dateTime={activity.createdAt}
              title={formattedDate}
              className="text-xs font-medium text-slate-500"
            >
              {relativeDate}
            </time>

            <p className="mt-1 text-xs text-slate-400">
              by {actorName}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}