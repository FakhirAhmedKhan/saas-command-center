import type {
  ActivityActorType,
  ActivityEntityType,
  ApplicationActivityType,
} from 'src/generated/prisma/enums';

export interface ActivityWriteInput {
  workspaceId: string;

  applicationId?: string | null;

  /**
   * Snapshot used after permanent deletion.
   */
  applicationName: string;

  actorType: ActivityActorType;

  actorUserId?: string | null;

  activityType: ApplicationActivityType;

  entityType: ActivityEntityType;

  entityId?: string | null;

  title: string;

  description?: string | null;

  metadata?: Record<string, unknown>;
}
