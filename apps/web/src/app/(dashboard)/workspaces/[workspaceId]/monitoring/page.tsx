'use client';

import { useParams } from 'next/navigation';
import { MonitoringDashboard } from '@/features/monitoring/monitoring-dashboard';

interface RouteParameters extends Record<string, string> {
  workspaceId: string;
}

export default function MonitoringPage() {
  const params = useParams<RouteParameters>();

  return <MonitoringDashboard workspaceId={params.workspaceId} />;
}
