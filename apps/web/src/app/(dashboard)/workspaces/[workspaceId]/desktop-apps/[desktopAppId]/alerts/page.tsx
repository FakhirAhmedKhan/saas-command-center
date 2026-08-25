import { DesktopAlerts } from '@/features/desktop-apps/desktop-alerts';

interface Props {
  params: Promise<{
    workspaceId: string;
    desktopAppId: string;
  }>;
}

export default async function DesktopAlertsPage({ params }: Props) {
  const { workspaceId, desktopAppId } = await params;

  return <DesktopAlerts workspaceId={workspaceId} desktopAppId={desktopAppId} />;
}
