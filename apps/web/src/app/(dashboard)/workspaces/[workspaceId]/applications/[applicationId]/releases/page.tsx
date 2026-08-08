'use client';

import {
    useParams,
} from 'next/navigation';

import {
    ReleaseDeploymentDashboard,
} from '@/features/releases/release-deployment-dashboard';

interface RouteParameters extends Record<string, string> {
    workspaceId:
    string;

    applicationId:
    string;
}

export default function ApplicationReleasesPage() {
    const params =
        useParams<
            RouteParameters
        >();

    return (
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            <ReleaseDeploymentDashboard
                workspaceId={
                    params.workspaceId
                }
                applicationId={
                    params.applicationId
                }
            />
        </div>
    );
}