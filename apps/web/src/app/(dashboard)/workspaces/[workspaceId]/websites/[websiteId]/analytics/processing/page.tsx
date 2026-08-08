'use client';

import {
    useParams,
} from 'next/navigation';

import {
    AnalyticsProcessingPanel,
} from '@/features/analytics-processing/analytics-processing-panel';

interface RouteParameters {
    workspaceId:
    string;

    websiteId:
    string;
}

export default function AnalyticsProcessingPage() {
    const params =
        useParams<
            RouteParameters
        >();

    return (
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            <AnalyticsProcessingPanel
                workspaceId={
                    params.workspaceId
                }
                websiteId={
                    params.websiteId
                }
            />
        </div>
    );
}