'use client';

import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { ApplicationForm } from '@/features/applications/components/application-form';

import { createApplication } from '@/features/applications/application-api';

import type { CreateApplicationPayload } from '@/features/applications/application-types';

export default function NewApplicationPage() {
    const params = useParams<{
        workspaceId: string;
    }>();

    const router = useRouter();
    const workspaceId = params.workspaceId;

    const applicationsHref =
        `/workspaces/${workspaceId}/applications`;

    async function handleCreate(
        payload: CreateApplicationPayload,
    ): Promise<void> {
        const application =
            await createApplication(
                workspaceId,
                payload,
            );

        router.push(
            `/workspaces/${workspaceId}/applications/${application.id}`,
        );

        router.refresh();
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <header>
                <Link
                    href={applicationsHref}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                >
                    <ArrowLeft className="size-4" />
                    Back to applications
                </Link>

                <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                    Create application
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Register a SaaS product in your
                    command center.
                </p>
            </header>

            <ApplicationForm
                cancelHref={applicationsHref}
                submitLabel="Create application"
                onSubmit={handleCreate}
            />
        </div>
    );
}