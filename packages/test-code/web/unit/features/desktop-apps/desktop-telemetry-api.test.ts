import {
  connectDesktopTelemetry,
  disconnectDesktopTelemetry,
  getDesktopPerformance,
  getDesktopSecurity,
  listDesktopCrashes,
  listDesktopDependencies,
  listDesktopTelemetryIntegrations,
  previewDesktopTelemetry,
  scanDesktopDependencies,
  scanDesktopSecurity,
  syncDesktopTelemetry,
} from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const api = vi.mocked(apiRequest);
const workspaceId = 'workspace-1';
const desktopAppId = 'desktop-1';
const integrationId = 'integration-1';
const base = `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;

describe('desktop runtime/security APIs', () => {
  beforeEach(() => api.mockReset());

  it('lists telemetry integrations', () => {
    listDesktopTelemetryIntegrations(workspaceId, desktopAppId);
    expect(api).toHaveBeenCalledWith(`${base}/telemetry`);
  });

  it('connects telemetry without changing the caller payload', () => {
    const input = {
      provider: 'SENTRY' as const,
      externalProjectId: 'org/project',
      endpointUrl: 'https://telemetry.example.com/snapshot',
      secret: 'provider-secret',
    };

    connectDesktopTelemetry(workspaceId, desktopAppId, input);

    expect(api).toHaveBeenCalledWith(`${base}/telemetry`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('previews and syncs telemetry', () => {
    previewDesktopTelemetry(workspaceId, desktopAppId, integrationId);
    syncDesktopTelemetry(workspaceId, desktopAppId, integrationId);

    expect(api).toHaveBeenNthCalledWith(
      1,
      `${base}/telemetry/${integrationId}/preview`,
      { method: 'POST' },
    );
    expect(api).toHaveBeenNthCalledWith(
      2,
      `${base}/telemetry/${integrationId}/sync`,
      { method: 'POST' },
    );
  });

  it('disconnects telemetry', () => {
    disconnectDesktopTelemetry(workspaceId, desktopAppId, integrationId);
    expect(api).toHaveBeenCalledWith(`${base}/telemetry/${integrationId}`, {
      method: 'DELETE',
    });
  });

  it('passes runtime filters in the query string', () => {
    getDesktopPerformance(workspaceId, desktopAppId, {
      version: '2.4.0',
      platform: 'WINDOWS',
      architecture: 'X64',
      channel: 'STABLE',
    });

    expect(api).toHaveBeenCalledWith(
      `${base}/performance?version=2.4.0&platform=WINDOWS&architecture=X64&channel=STABLE`,
    );
  });

  it('lists crashes and dependency/security health', () => {
    listDesktopCrashes(workspaceId, desktopAppId, { version: '2.4.0' });
    listDesktopDependencies(workspaceId, desktopAppId);
    scanDesktopDependencies(workspaceId, desktopAppId);
    getDesktopSecurity(workspaceId, desktopAppId);
    scanDesktopSecurity(workspaceId, desktopAppId);

    expect(api).toHaveBeenCalledWith(`${base}/crashes?version=2.4.0`);
    expect(api).toHaveBeenCalledWith(`${base}/dependencies`);
    expect(api).toHaveBeenCalledWith(`${base}/dependencies/scan`, {
      method: 'POST',
    });
    expect(api).toHaveBeenCalledWith(`${base}/security`);
    expect(api).toHaveBeenCalledWith(`${base}/security/scan`, {
      method: 'POST',
    });
  });
});