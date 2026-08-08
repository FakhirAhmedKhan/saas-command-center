'use client';

import {
    useEffect,
    useState,
} from 'react';

import {
    apiRequest,
} from '@/lib/api/http-client';

import {
    HealthStatusBadge,
} from './health-status-badge';

import type {
    HealthCheckStatus,
} from './monitoring.types';

interface ApplicationHealthSummary {
    status:
    HealthCheckStatus;

    checks:
    number;

    averageResponseTimeMs:
    number | null;

    lastCheckedAt:
    string | null;
}

export function ApplicationHealthBadge({
    workspaceId,
    applicationId,
}: {
    workspaceId:
    string;

    applicationId:
    string;
}) {
    const [
        summary,
        setSummary,
    ] =
        useState<
            ApplicationHealthSummary | null
        >(null);

    useEffect(
        () => {
            const controller =
                new AbortController();

            void apiRequest<
                ApplicationHealthSummary
            >(
                `/workspaces/${workspaceId}/monitoring/applications/${applicationId}/summary`,

                {
                    method:
                        'GET',

                    signal:
                        controller.signal,
                },
            )
                .then(
                    setSummary,
                )
                .catch(
                    () => {
                        setSummary(
                            null,
                        );
                    },
                );

            return () => {
                controller.abort();
            };
        },
        [
            workspaceId,
            applicationId,
        ],
    );

    if (!summary) {
        return null;
    }

    return (
        <HealthStatusBadge
            status={
                summary.status
            }
        />
    );
}