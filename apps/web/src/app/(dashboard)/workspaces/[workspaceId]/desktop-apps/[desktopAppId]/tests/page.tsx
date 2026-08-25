'use client';

import { DesktopTests } from '@/features/desktop-apps/desktop-tests';
import { useParams } from 'next/navigation';

export default function DesktopTestsPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  return <DesktopTests workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />;
}
