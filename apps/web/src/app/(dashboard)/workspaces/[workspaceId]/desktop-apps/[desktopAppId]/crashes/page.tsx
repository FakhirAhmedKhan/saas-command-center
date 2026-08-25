import { DesktopCrashes } from '@/features/desktop-apps/desktop-crashes';

export default async function DesktopCrashesPage({ params }: { params: Promise<{ workspaceId: string; desktopAppId: string }> }) {
  const value = await params;

  return <DesktopCrashes workspaceId={value.workspaceId} desktopAppId={value.desktopAppId} />;
}
