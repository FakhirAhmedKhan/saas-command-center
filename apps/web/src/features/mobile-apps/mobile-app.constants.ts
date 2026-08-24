import type { ApplicationType, MobileFramework, MobilePlatform } from '@command-center/shared-types';

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  WEB: 'Web',
  API: 'API',
  MOBILE: 'Mobile',
  DESKTOP: 'Desktop',
  WORKER: 'Worker',
  OTHER: 'Other',
};

export const MOBILE_PLATFORM_LABELS: Record<MobilePlatform, string> = {
  ANDROID: 'Android',
  IOS: 'iOS',
  CROSS_PLATFORM: 'Cross-platform',
};

export const MOBILE_FRAMEWORK_LABELS: Record<MobileFramework, string> = {
  ANDROID_NATIVE: 'Native Android',
  IOS_NATIVE: 'Native iOS',
  FLUTTER: 'Flutter',
  REACT_NATIVE: 'React Native',
  KMP: 'Kotlin Multiplatform',
  OTHER: 'Other',
};
