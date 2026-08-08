'use client';

import {
    useParams,
} from 'next/navigation';

import {
    MonitoringDashboard,
} from '@/features/monitoring/monitoring-dashboard';

interface RouteParameters extends Record<string, string> {
    workspaceId:
    string;
}

export default function MonitoringPage() {
    const params =
        useParams<
            RouteParameters
        >();

    return (
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            <MonitoringDashboard
                workspaceId={
                    params.workspaceId
                }
            />
        </div>
    );
}