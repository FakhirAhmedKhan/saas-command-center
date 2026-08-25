import { DesktopPerformance } from '@/features/desktop-apps/desktop-performance';

export default async function DesktopPerformancePage({ params }: { params: Promise<{ workspaceId: string; desktopAppId: string }> }) {
  const value = await params;

  return <DesktopPerformance workspaceId={value.workspaceId} desktopAppId={value.desktopAppId} />;
}
