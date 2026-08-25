import { DesktopTelemetrySettings } from '@/features/desktop-apps/desktop-telemetry-settings';

export default async function DesktopSettingsPage({ params }: { params: Promise<{ workspaceId: string; desktopAppId: string }> }) {
  const value = await params;

  return <DesktopTelemetrySettings workspaceId={value.workspaceId} desktopAppId={value.desktopAppId} />;
}
