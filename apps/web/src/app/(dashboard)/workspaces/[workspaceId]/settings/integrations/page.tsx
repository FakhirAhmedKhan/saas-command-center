'use client';

import {
    useParams,
} from 'next/navigation';

import {
    WebhookIntegrationsDashboard,
} from '@/features/integrations/webhook-integrations-dashboard';

export default function IntegrationsPage() {
    const params =
        useParams<{
            workspaceId:
            string;
        }>();

    return (
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
            <WebhookIntegrationsDashboard
                workspaceId={
                    params.workspaceId
                }
            />
        </div>
    );
}