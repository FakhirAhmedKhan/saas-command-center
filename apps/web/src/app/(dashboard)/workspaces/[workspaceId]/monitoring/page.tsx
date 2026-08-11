'use client';

import { MonitoringDashboard } from '@/features/monitoring/monitoring-dashboard';
import { useParams } from 'next/navigation';

interface RouteParameters extends Record<string, string> {
  workspaceId: string;
}

export default function MonitoringPage() {
  const params = useParams<RouteParameters>();

  return <MonitoringDashboard workspaceId={params.workspaceId} />;
}
