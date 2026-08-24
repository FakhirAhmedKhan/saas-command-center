import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopCrashes } from '@/features/desktop-apps/desktop-crashes';

export default async function DesktopCrashesPage({ params }: { params: Promise<{ workspaceId: string; desktopAppId: string }> }) {
  const value = await params;

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <DesktopAppSubNav workspaceId={value.workspaceId} desktopAppId={value.desktopAppId} />
      <DesktopCrashes workspaceId={value.workspaceId} desktopAppId={value.desktopAppId} />
    </main>
  );
}
