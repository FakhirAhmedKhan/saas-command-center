import type { MobileFramework, MobilePlatform } from '@command-center/shared-types';

export const FRAMEWORKS_BY_PLATFORM: Record<MobilePlatform, MobileFramework[]> = {
  ANDROID: ['ANDROID_NATIVE', 'FLUTTER', 'REACT_NATIVE', 'KMP', 'OTHER'],

  IOS: ['IOS_NATIVE', 'FLUTTER', 'REACT_NATIVE', 'KMP', 'OTHER'],

  CROSS_PLATFORM: ['FLUTTER', 'REACT_NATIVE', 'KMP', 'OTHER'],
};

export function isFrameworkAllowed(platform: MobilePlatform, framework: MobileFramework): boolean {
  return FRAMEWORKS_BY_PLATFORM[platform].includes(framework);
}

export function getPrimaryIdentifier(input: {
  platform: MobilePlatform;

  packageId: string | null;

  bundleId: string | null;
}): string {
  if (input.platform === 'ANDROID') {
    return input.packageId ?? 'No Package ID';
  }

  if (input.platform === 'IOS') {
    return input.bundleId ?? 'No Bundle ID';
  }

  return input.packageId ?? input.bundleId ?? 'No application identifier';
}
