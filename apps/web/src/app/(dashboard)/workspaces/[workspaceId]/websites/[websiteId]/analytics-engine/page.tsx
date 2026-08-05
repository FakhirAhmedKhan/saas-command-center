'use client';

import Link from 'next/link';

import {
    useParams,
} from 'next/navigation';

import {
    ArrowLeft,
} from 'lucide-react';

import {
    AnalyticsEnginePanel,
} from '@/features/analytics-engine/components/analytics-engine-panel';

export default function AnalyticsEnginePage() {
    const params =
        useParams<{
            workspaceId: string;
            websiteId: string;
        }>();

    const {
        workspaceId,
        websiteId,
    } = params;

    return (
        <div className="space-y-6">
            <Link
                href={`/workspaces/${workspaceId}/websites/${websiteId}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
                <ArrowLeft className="size-4" />
                Back to website
            </Link>

            <AnalyticsEnginePanel
                workspaceId={
                    workspaceId
                }
                websiteId={
                    websiteId
                }
            />
        </div>
    );
}