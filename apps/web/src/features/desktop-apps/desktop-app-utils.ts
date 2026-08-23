import type { DesktopApplicationDetails, DesktopFramework, DesktopPlatform } from '@command-center/shared-types';

export const DESKTOP_FRAMEWORKS_BY_PLATFORM: Record<DesktopPlatform, readonly DesktopFramework[]> = {
  WINDOWS: ['ELECTRON', 'TAURI', 'DOTNET', 'QT', 'JAVA', 'NATIVE_WINDOWS', 'OTHER'],

  MACOS: ['ELECTRON', 'TAURI', 'QT', 'JAVA', 'NATIVE_MACOS', 'OTHER'],

  LINUX: ['ELECTRON', 'TAURI', 'DOTNET', 'QT', 'JAVA', 'OTHER'],

  CROSS_PLATFORM: ['ELECTRON', 'TAURI', 'DOTNET', 'QT', 'JAVA', 'OTHER'],
};

export function getDesktopFrameworksForPlatform(platform: DesktopPlatform): readonly DesktopFramework[] {
  return DESKTOP_FRAMEWORKS_BY_PLATFORM[platform];
}

export function isDesktopFrameworkAllowed(platform: DesktopPlatform, framework: DesktopFramework): boolean {
  return DESKTOP_FRAMEWORKS_BY_PLATFORM[platform].includes(framework);
}

export function getDesktopPrimaryIdentifier(desktopApp: DesktopApplicationDetails): string {
  return desktopApp.packageName ?? desktopApp.application.slug;
}
