import {
    apiRequest,
} from '@/lib/api/http-client';

export interface WorkspaceActivity {
    id: string;

    activityType:
    string;

    actorType:
    string;

    entityType:
    string;

    entityId:
    string | null;

    description:
    string;

    createdAt:
    string;

    actorUser: {
        id: string;
        name:
        string | null;
        email: string;
    } | null;

    application: {
        id: string;
        name: string;
    } | null;
}

export interface ActivityFilters {
    search?: string;
    activityType?:
    string;
    actorUserId?:
    string;
    entityType?:
    string;
    entityId?:
    string;
    from?: string;
    to?: string;
}

export function getWorkspaceActivities(
    workspaceId: string,

    filters:
        ActivityFilters,

    signal?:
        AbortSignal,
) {
    const params =
        new URLSearchParams({
            page: '1',
            limit: '100',
        });

    for (
        const [
            key,
            value,
        ] of Object.entries(
            filters,
        )
    ) {
        if (value) {
            params.set(
                key,
                value,
            );
        }
    }

    return apiRequest<{
        items:
        WorkspaceActivity[];

        pagination: {
            total: number;
        };
    }>(
        `/workspaces/${workspaceId}/activities?${params.toString()}`,

        {
            method:
                'GET',

            signal,
        },
    );
}