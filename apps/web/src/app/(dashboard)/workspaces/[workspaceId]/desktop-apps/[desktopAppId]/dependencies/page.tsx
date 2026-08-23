import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopDependencies } from '@/features/desktop-apps/desktop-dependencies';

export default async function DesktopDependenciesPage({
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
      <DesktopDependencies
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
    </main>
  );
}