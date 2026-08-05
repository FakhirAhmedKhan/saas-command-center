import {
    apiRequest,
} from '@/features/lib/api/api-client';

import type {
    RawEventQuery,
    RawEventsResponse,
    TrackingStatus,
} from './tracking-types';

function basePath(
    workspaceId: string,
    websiteId: string,
): string {
    return `/workspaces/${workspaceId}/websites/${websiteId}/tracking`;
}

function buildQuery(
    query: RawEventQuery = {},
): string {
    const parameters =
        new URLSearchParams();

    Object.entries(query).forEach(
        ([key, value]) => {
            if (
                value === undefined ||
                value === null ||
                value === ''
            ) {
                return;
            }

            parameters.set(
                key,
                String(value),
            );
        },
    );

    const result =
        parameters.toString();

    return result
        ? `?${result}`
        : '';
}

export function getTrackingStatus(
    workspaceId: string,
    websiteId: string,
) {
    return apiRequest<TrackingStatus>(
        `${basePath(
            workspaceId,
            websiteId,
        )}/status`,
    );
}

export function getRawTrackingEvents(
    workspaceId: string,
    websiteId: string,
    query?: RawEventQuery,
) {
    return apiRequest<RawEventsResponse>(
        `${basePath(
            workspaceId,
            websiteId,
        )}/events${buildQuery(
            query,
        )}`,
    );
}