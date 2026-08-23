import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopTelemetrySettings } from '@/features/desktop-apps/desktop-telemetry-settings';

export default async function DesktopSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; desktopAppId: string }>;
}) {
  const value = await params;

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <DesktopAppSubNav
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
      <DesktopTelemetrySettings
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
    </main>
  );
}