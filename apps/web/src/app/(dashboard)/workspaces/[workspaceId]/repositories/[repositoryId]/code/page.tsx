'use client';

import {
    useParams,
} from 'next/navigation';

import {
    CodeExplorer,
} from '@/features/repositories/code-explorer';

type RouteParameters =
    Record<
        string,
        string | string[]
    > & {
        workspaceId:
        string;

        repositoryId:
        string;
    };

export default function RepositoryCodePage() {
    const params =
        useParams<
            RouteParameters
        >();

    return (
        <div className="p-4">
            <CodeExplorer
                workspaceId={
                    params.workspaceId
                }
                repositoryId={
                    params.repositoryId
                }
            />
        </div>
    );
}