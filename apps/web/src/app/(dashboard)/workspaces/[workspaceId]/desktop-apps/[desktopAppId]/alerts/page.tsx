import { DesktopAlerts } from '@/features/desktop-apps/desktop-alerts';
import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';

interface Props {
  params: Promise<{
    workspaceId: string;
    desktopAppId: string;
  }>;
}

export default async function DesktopAlertsPage({ params }: Props) {
  const { workspaceId, desktopAppId } = await params;

  return (
    <div className='space-y-6'>
      <DesktopAppSubNav workspaceId={workspaceId} desktopAppId={desktopAppId} />

      <DesktopAlerts workspaceId={workspaceId} desktopAppId={desktopAppId} />
    </div>
  );
}
