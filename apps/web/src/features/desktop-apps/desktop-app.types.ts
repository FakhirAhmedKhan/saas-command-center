export type DesktopReleaseChannel = 'DEV' | 'ALPHA' | 'BETA' | 'STABLE' | 'LTS';

export type DesktopReleaseStatus = 'DRAFT' | 'READY' | 'PUBLISHED' | 'FAILED' | 'ROLLED_BACK';

export interface DesktopReleaseBuildSummary extends DesktopBuild {
  artifacts: DesktopBuildArtifact[];
}

export interface DesktopRelease {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  buildId: string;
  version: string;
  buildNumber: string;
  channel: DesktopReleaseChannel;
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  status: DesktopReleaseStatus;
  releaseNotes: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  build: DesktopReleaseBuildSummary;
}

export interface DesktopReleaseFilters {
  channel?: DesktopReleaseChannel;
  status?: DesktopReleaseStatus;
  platform?: DesktopPlatform;
  architecture?: DesktopArchitecture;
}

export interface CreateDesktopReleaseInput {
  buildId: string;
  channel: DesktopReleaseChannel;
  version?: string;
  buildNumber?: string;
  releaseNotes?: string | null;
}
