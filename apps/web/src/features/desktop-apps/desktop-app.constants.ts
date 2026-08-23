import type { DesktopArchitecture, DesktopFramework, DesktopPlatform } from '@command-center/shared-types';

export const DESKTOP_PLATFORM_LABELS: Record<DesktopPlatform, string> = {
  WINDOWS: 'Windows',
  MACOS: 'macOS',
  LINUX: 'Linux',
  CROSS_PLATFORM: 'Cross-platform',
};

export const DESKTOP_FRAMEWORK_LABELS: Record<DesktopFramework, string> = {
  ELECTRON: 'Electron',
  TAURI: 'Tauri',
  DOTNET: '.NET',
  QT: 'Qt',
  JAVA: 'Java',
  NATIVE_WINDOWS: 'Native Windows',
  NATIVE_MACOS: 'Native macOS',
  OTHER: 'Other',
};

export const DESKTOP_ARCHITECTURE_LABELS: Record<DesktopArchitecture, string> = {
  X64: 'x64',
  ARM64: 'ARM64',
  X86: 'x86',
  UNIVERSAL: 'Universal',
};
