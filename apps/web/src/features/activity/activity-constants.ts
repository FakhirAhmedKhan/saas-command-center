import type {
  ActivityActorType,
  ActivityEntityType,
  ApplicationActivityType,
} from './activity-types';

export type ActivityBadgeVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'purple'
  | 'slate';

export const ACTIVITY_TYPE_LABELS:
  Record<
    ApplicationActivityType,
    string
  > = {
  APPLICATION_CREATED:
    'Application created',

  APPLICATION_UPDATED:
    'Application updated',

  APPLICATION_STATUS_CHANGED:
    'Status changed',

  APPLICATION_PRIORITY_CHANGED:
    'Priority changed',

  APPLICATION_ARCHIVED:
    'Application archived',

  APPLICATION_RESTORED:
    'Application restored',

  APPLICATION_DELETED:
    'Application deleted',

  TECHNOLOGY_ADDED:
    'Technology added',

  TECHNOLOGY_UPDATED:
    'Technology updated',

  TECHNOLOGY_REMOVED:
    'Technology removed',

  LINK_ADDED:
    'Link added',

  LINK_UPDATED:
    'Link updated',

  LINK_REMOVED:
    'Link removed',
};

export const ACTIVITY_BADGE_VARIANTS:
  Record<
    ApplicationActivityType,
    ActivityBadgeVariant
  > = {
  APPLICATION_CREATED:
    'green',

  APPLICATION_UPDATED:
    'blue',

  APPLICATION_STATUS_CHANGED:
    'purple',

  APPLICATION_PRIORITY_CHANGED:
    'orange',

  APPLICATION_ARCHIVED:
    'slate',

  APPLICATION_RESTORED:
    'green',

  APPLICATION_DELETED:
    'red',

  TECHNOLOGY_ADDED:
    'green',

  TECHNOLOGY_UPDATED:
    'blue',

  TECHNOLOGY_REMOVED:
    'red',

  LINK_ADDED:
    'green',

  LINK_UPDATED:
    'blue',

  LINK_REMOVED:
    'red',
  WEBSITE_CREATED: 'green',
  WEBSITE_UPDATED: 'blue',
  WEBSITE_ENABLED: 'green',
  WEBSITE_DISABLED: 'orange',
  WEBSITE_ARCHIVED: 'slate',
  WEBSITE_RESTORED: 'green',
  WEBSITE_TRACKING_KEY_ROTATED: 'purple',
  WEBSITE_CONNECTED: 'blue',
  WEBSITE_DISCONNECTED: 'orange',
  WEBSITE_CREATED:
    'Website created',

  WEBSITE_UPDATED:
    'Website updated',

  WEBSITE_ENABLED:
    'Website enabled',

  WEBSITE_DISABLED:
    'Website disabled',

  WEBSITE_ARCHIVED:
    'Website archived',

  WEBSITE_RESTORED:
    'Website restored',

  WEBSITE_TRACKING_KEY_ROTATED:
    'Tracking key rotated',

  WEBSITE_CONNECTED:
    'Website connected',

  WEBSITE_DISCONNECTED:
    'Website disconnected',
  MILESTONE_CREATED: 'Milestone created',
  MILESTONE_UPDATED: 'Milestone updated',
  MILESTONE_COMPLETED: 'Milestone completed',
  MILESTONE_REOPENED: 'Milestone reopened',
  MILESTONE_SKIPPED: 'Milestone skipped',
  MILESTONE_DELETED: 'Milestone deleted',
  MILESTONE_REORDERED: 'Milestones reordered',

  TASK_CREATED: 'Task created',
  TASK_UPDATED: 'Task updated',
  TASK_STATUS_CHANGED: 'Task status changed',
  TASK_COMPLETED: 'Task completed',
  TASK_REOPENED: 'Task reopened',
  TASK_SKIPPED: 'Task skipped',
  TASK_MOVED: 'Task moved',
  TASK_DELETED: 'Task deleted',
  TASK_REORDERED: 'Tasks reordered',

  BLOCKER_CREATED: 'Blocker created',
  BLOCKER_UPDATED: 'Blocker updated',
  BLOCKER_RESOLVED: 'Blocker resolved',
  BLOCKER_REOPENED: 'Blocker reopened',
  BLOCKER_DELETED: 'Blocker deleted',

  DEVELOPMENT_TEMPLATE_APPLIED: 'Template applied',
};

export const ACTOR_TYPE_LABELS:
  Record<
    ActivityActorType,
    string
  > = {
  USER: 'User',
  SYSTEM: 'System',
};

export const ENTITY_TYPE_LABELS:
  Record<
    ActivityEntityType,
    string
  > = {
  APPLICATION:
    'Application',

  TECHNOLOGY:
    'Technology',

  LINK:
    'Link',
  MILESTONE: 'Milestone',
  TASK: 'Task',
  BLOCKER: 'Blocker',
};