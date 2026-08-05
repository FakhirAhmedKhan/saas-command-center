export const ACTIVITY_ACTOR_TYPES = [
    'USER',
    'SYSTEM',
] as const;

export type ActivityActorType =
    (typeof ACTIVITY_ACTOR_TYPES)[number];

export const ACTIVITY_ENTITY_TYPES = [
    'APPLICATION',
    'TECHNOLOGY',
    'LINK',
    'MILESTONE',
    'TASK',
    'BLOCKER',
] as const;

export type ActivityEntityType =
    (typeof ACTIVITY_ENTITY_TYPES)[number];

export const APPLICATION_ACTIVITY_TYPES = [
    'APPLICATION_CREATED',
    'APPLICATION_UPDATED',
    'APPLICATION_STATUS_CHANGED',
    'APPLICATION_PRIORITY_CHANGED',
    'APPLICATION_ARCHIVED',
    'APPLICATION_RESTORED',
    'APPLICATION_DELETED',

    'TECHNOLOGY_ADDED',
    'TECHNOLOGY_UPDATED',
    'TECHNOLOGY_REMOVED',

    'LINK_ADDED',
    'LINK_UPDATED',
    'LINK_REMOVED',

    'MILESTONE_CREATED',
    'MILESTONE_UPDATED',
    'MILESTONE_COMPLETED',
    'MILESTONE_REOPENED',
    'MILESTONE_SKIPPED',
    'MILESTONE_DELETED',
    'MILESTONE_REORDERED',

    'TASK_CREATED',
    'TASK_UPDATED',
    'TASK_STATUS_CHANGED',
    'TASK_COMPLETED',
    'TASK_REOPENED',
    'TASK_SKIPPED',
    'TASK_MOVED',
    'TASK_DELETED',
    'TASK_REORDERED',

    'BLOCKER_CREATED',
    'BLOCKER_UPDATED',
    'BLOCKER_RESOLVED',
    'BLOCKER_REOPENED',
    'BLOCKER_DELETED',

    'DEVELOPMENT_TEMPLATE_APPLIED',
    'APPLICATION_CREATED',
    'APPLICATION_UPDATED',
    'APPLICATION_STATUS_CHANGED',
    'APPLICATION_PRIORITY_CHANGED',
    'APPLICATION_ARCHIVED',
    'APPLICATION_RESTORED',
    'APPLICATION_DELETED',
    'TECHNOLOGY_ADDED',
    'TECHNOLOGY_UPDATED',
    'TECHNOLOGY_REMOVED',
    'LINK_ADDED',
    'LINK_UPDATED',
    'LINK_REMOVED',
    'WEBSITE_CREATED',
    'WEBSITE_UPDATED',
    'WEBSITE_ENABLED',
    'WEBSITE_DISABLED',
    'WEBSITE_ARCHIVED',
    'WEBSITE_RESTORED',
    'WEBSITE_TRACKING_KEY_ROTATED',
    'WEBSITE_CONNECTED',
    'WEBSITE_DISCONNECTED',
] as const;

export type ApplicationActivityType =
    (typeof APPLICATION_ACTIVITY_TYPES)[number];

export interface ActivityActor {
    id: string;
    email: string;
    displayName: string | null;
}

export interface ActivityApplication {
    id: string;
    name: string;
    slug: string;
    archivedAt: string | null;
}

export interface ApplicationActivity {
    id: string;
    workspaceId: string;
    applicationId: string | null;
    applicationName: string;
    actorUserId: string | null;
    actorType: ActivityActorType;
    activityType: ApplicationActivityType;
    entityType: ActivityEntityType;
    entityId: string | null;
    title: string;
    description: string | null;
    metadata: Record<
        string,
        unknown
    > | null;
    createdAt: string;
    actor: ActivityActor | null;
    application:
    ActivityApplication | null;
}

export interface ActivityPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface ActivityListResponse {
    data: ApplicationActivity[];
    meta: ActivityPagination;
}

export interface ActivityListQuery {
    search?: string;

    activityType?:
    ApplicationActivityType;

    actorType?:
    ActivityActorType;

    entityType?:
    ActivityEntityType;

    actorUserId?: string;

    dateFrom?: string;

    dateTo?: string;

    page?: number;

    limit?: number;
}