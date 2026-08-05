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
};