import { DesktopDependencies } from '@/features/desktop-apps/desktop-dependencies';

export default async function DesktopDependenciesPage({ params }: { params: Promise<{ workspaceId: string; desktopAppId: string }> }) {
  const value = await params;

  return <DesktopDependencies workspaceId={value.workspaceId} desktopAppId={value.desktopAppId} />;
}
