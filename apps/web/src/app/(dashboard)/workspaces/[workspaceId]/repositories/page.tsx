'use client';

import {
    useParams,
} from 'next/navigation';

import {
    RepositoriesDashboard,
} from '@/features/repositories/repositories-dashboard';

type RouteParameters =
    Record<
        string,
        string | string[]
    > & {
        workspaceId:
        string;
    };

export default function RepositoriesPage() {
    const params =
        useParams<
            RouteParameters
        >();

    const workspaceId =
        params.workspaceId;

    return (
        <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">
            <RepositoriesDashboard
                workspaceId={
                    workspaceId
                }
            />
        </div>
    );
}