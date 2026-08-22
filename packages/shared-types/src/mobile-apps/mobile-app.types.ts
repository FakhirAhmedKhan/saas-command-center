export const MOBILE_PLATFORMS = ['ANDROID', 'IOS', 'CROSS_PLATFORM'] as const;

export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

export const MOBILE_FRAMEWORKS = ['ANDROID_NATIVE', 'IOS_NATIVE', 'FLUTTER', 'REACT_NATIVE', 'KMP', 'OTHER'] as const;

export type MobileFramework = (typeof MOBILE_FRAMEWORKS)[number];

export interface MobileApplication {
  id: string;
  applicationId: string;

  platform: MobilePlatform;
  framework: MobileFramework;

  packageId: string | null;
  bundleId: string | null;

  minOsVersion: string | null;
  targetOsVersion: string | null;

  currentVersion: string | null;
  currentBuildNumber: string | null;

  createdAt: string;
  updatedAt: string;
}

export const MOBILE_DETECTION_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'] as const;

export type MobileDetectionConfidence = (typeof MOBILE_DETECTION_CONFIDENCE)[number];

export type MobileBuildSystem = 'GRADLE' | 'XCODE' | 'FLUTTER' | 'NODE' | 'SWIFT_PACKAGE' | 'OTHER';

export interface MobileProjectDetection {
  applicationType: 'MOBILE';

  projectRoot: string;

  platform: MobilePlatform;

  framework: MobileFramework;

  packageId: string | null;

  bundleId: string | null;

  minOsVersion: string | null;

  targetOsVersion: string | null;

  currentVersion: string | null;

  currentBuildNumber: string | null;

  buildSystem: MobileBuildSystem;

  confidence: MobileDetectionConfidence;

  evidence: string[];

  warnings: string[];
}

export interface MobileProjectDetectionResponse {
  repository: {
    id: string;

    fullName: string;

    defaultBranch: string;
  };

  mobileDetected: boolean;

  primaryProject: MobileProjectDetection | null;

  projects: MobileProjectDetection[];

  truncated: boolean;

  warnings: string[];
}
