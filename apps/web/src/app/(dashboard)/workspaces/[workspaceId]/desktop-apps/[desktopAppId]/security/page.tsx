import { DesktopSecurity } from '@/features/desktop-apps/desktop-security';

export default async function DesktopSecurityPage({ params }: { params: Promise<{ workspaceId: string; desktopAppId: string }> }) {
  const value = await params;

  return <DesktopSecurity workspaceId={value.workspaceId} desktopAppId={value.desktopAppId} />;
}
