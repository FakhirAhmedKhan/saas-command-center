'use client';

import { DesktopBuilds } from '@/features/desktop-apps/desktop-builds';
import { useParams } from 'next/navigation';

export default function DesktopBuildsPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  return <DesktopBuilds workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />;
}
