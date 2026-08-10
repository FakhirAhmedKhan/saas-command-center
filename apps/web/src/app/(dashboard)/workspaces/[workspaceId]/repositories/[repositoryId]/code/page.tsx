'use client';

import { useParams } from 'next/navigation';
import { CodeExplorer } from '@/features/repositories/code-explorer';

type RouteParameters = Record<string, string | string[]> & {
  workspaceId: string;
  repositoryId: string;
};

export default function RepositoryCodePage() {
  const params = useParams<RouteParameters>();

  return (
    <div className='h-[calc(100vh-56px)] p-3'>
      <CodeExplorer workspaceId={params.workspaceId} repositoryId={params.repositoryId} />
    </div>
  );
}
