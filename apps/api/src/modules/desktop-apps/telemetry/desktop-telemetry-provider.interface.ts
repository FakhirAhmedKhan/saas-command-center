import type { DesktopTelemetryProvider, DesktopTelemetrySnapshot } from '@command-center/shared-types';

export interface DesktopTelemetryProviderContext {
  provider: DesktopTelemetryProvider;
  workspaceId: string;
  desktopAppId: string;
  externalProjectId: string;
  endpointUrl: string;
  secret: string;
}

export interface DesktopTelemetryProviderAdapter {
  getSnapshot(context: DesktopTelemetryProviderContext): Promise<DesktopTelemetrySnapshot>;
}
