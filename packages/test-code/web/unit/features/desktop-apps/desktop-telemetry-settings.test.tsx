// @vitest-environment jsdom

import { DesktopTelemetrySettings } from '@/features/desktop-apps/desktop-telemetry-settings';
import {
  connectDesktopTelemetry,
  disconnectDesktopTelemetry,
  listDesktopTelemetryIntegrations,
  previewDesktopTelemetry,
  syncDesktopTelemetry,
} from '@/features/desktop-apps/desktop-apps-api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  connectDesktopTelemetry: vi.fn(),
  disconnectDesktopTelemetry: vi.fn(),
  listDesktopTelemetryIntegrations: vi.fn(),
  previewDesktopTelemetry: vi.fn(),
  syncDesktopTelemetry: vi.fn(),
}));

const listMock = vi.mocked(listDesktopTelemetryIntegrations);
const connectMock = vi.mocked(connectDesktopTelemetry);
const previewMock = vi.mocked(previewDesktopTelemetry);
const syncMock = vi.mocked(syncDesktopTelemetry);
const disconnectMock = vi.mocked(disconnectDesktopTelemetry);

const integration = {
  id: 'integration-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  provider: 'SENTRY',
  status: 'CONNECTED',
  externalProjectId: 'org/desktop',
  endpointUrl: 'https://telemetry.example.com/snapshot',
  configuredAt: '2026-08-23T00:00:00.000Z',
  lastSyncedAt: null,
  lastError: null,
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  hasSecret: true,
} as const;

describe('DesktopTelemetrySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([]);
    connectMock.mockResolvedValue(integration as never);
    previewMock.mockResolvedValue({
      performance: [],
      crashes: [],
      versions: [],
    });
    syncMock.mockResolvedValue({} as never);
    disconnectMock.mockResolvedValue({ success: true });
  });

  it('renders an empty state', async () => {
    render(<DesktopTelemetrySettings workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('No telemetry provider configured.')).toBeInTheDocument();
  });

  it('submits provider settings and keeps secret in a password input', { timeout: 15000 }, async () => {
    const user = userEvent.setup();

    render(<DesktopTelemetrySettings workspaceId='workspace-1' desktopAppId='desktop-1' />);

    await screen.findByText('No telemetry provider configured.');

    await user.selectOptions(screen.getByLabelText('Telemetry provider'), 'SENTRY');
    await user.type(screen.getByLabelText('External project ID'), 'org/desktop');
    await user.type(screen.getByLabelText('Telemetry endpoint URL'), 'https://telemetry.example.com/snapshot');
    await user.type(screen.getByLabelText('Telemetry provider secret'), 'provider-secret');

    expect(screen.getByLabelText('Telemetry provider secret')).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Connect Provider' }));

    await waitFor(() => {
      expect(connectMock).toHaveBeenCalledWith('workspace-1', 'desktop-1', {
        provider: 'SENTRY',
        externalProjectId: 'org/desktop',
        endpointUrl: 'https://telemetry.example.com/snapshot',
        secret: 'provider-secret',
      });
    });
  });

  it('previews, syncs and disconnects a configured integration', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([integration as never]);

    render(<DesktopTelemetrySettings workspaceId='workspace-1' desktopAppId='desktop-1' />);

    await screen.findByText(/org\/desktop/);

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => {
      expect(previewMock).toHaveBeenCalledWith('workspace-1', 'desktop-1', 'integration-1');
    });

    await user.click(screen.getByRole('button', { name: 'Sync Now' }));
    await waitFor(() => {
      expect(syncMock).toHaveBeenCalledWith('workspace-1', 'desktop-1', 'integration-1');
    });

    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledWith('workspace-1', 'desktop-1', 'integration-1');
    });
  });
});
