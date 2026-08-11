import type { ActivityActorType, ActivityEntityType, ApplicationActivityType } from '@command-center/shared-types';

export { ACTIVITY_ACTOR_TYPES, ACTIVITY_ENTITY_TYPES, APPLICATION_ACTIVITY_TYPES } from '@command-center/shared-types';

export type {
  ActivityActor,
  ActivityActorType,
  ActivityApplication,
  ActivityEntityType,
  ActivityListResponse,
  ActivityPagination,
  ApplicationActivity,
  ApplicationActivityType,
} from '@command-center/shared-types';

/**
 * Frontend filter model.
 *
 * This intentionally remains frontend-local because the API transport
 * currently accepts `from` / `to`, while the UI works with
 * `dateFrom` / `dateTo`.
 */
export interface ActivityListQuery {
  search?: string;
  activityType?: ApplicationActivityType;
  actorType?: ActivityActorType;
  entityType?: ActivityEntityType;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
