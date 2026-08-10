'use client';

import { useParams } from 'next/navigation';
import { RepositoriesDashboard } from '@/features/repositories/repositories-dashboard';

type RouteParameters = Record<string, string | string[]> & {
  workspaceId: string;
};

export default function RepositoriesPage() {
  const params = useParams<RouteParameters>();

  const workspaceId = params.workspaceId;

  return <RepositoriesDashboard workspaceId={workspaceId} />;
}
