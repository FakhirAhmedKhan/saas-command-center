'use client';

import Link from 'next/link';

import {
    useParams,
} from 'next/navigation';

import {
    ArrowLeft,
} from 'lucide-react';

import {
    DevelopmentBoard,
} from '@/features/development/components/development-board';

export default function ApplicationDevelopmentPage() {
    const params =
        useParams<{
            workspaceId: string;
            applicationId: string;
        }>();

    const {
        workspaceId,
        applicationId,
    } = params;

    return (
        <div className="space-y-6">
            <Link
                href={`/workspaces/${workspaceId}/applications/${applicationId}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
                <ArrowLeft className="size-4" />
                Back to application
            </Link>

            <DevelopmentBoard
                workspaceId={workspaceId}
                applicationId={applicationId}
            />
        </div>
    );
}