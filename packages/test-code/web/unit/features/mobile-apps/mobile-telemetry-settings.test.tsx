// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectMobileTelemetry, disconnectMobileTelemetry, getMobileTelemetryIntegration, syncMobileTelemetry } from '@/features/mobile-apps/mobile-apps-api';
import { MobileTelemetrySettings } from '@/features/mobile-apps/mobile-telemetry-settings';

vi.mock('@/features/mobile-apps/mobile-apps-api', () => ({
  connectMobileTelemetry: vi.fn(),
  disconnectMobileTelemetry: vi.fn(),
  getMobileTelemetryIntegration: vi.fn(),
  syncMobileTelemetry: vi.fn(),
}));

const mockedGetIntegration = vi.mocked(getMobileTelemetryIntegration);
const mockedConnect = vi.mocked(connectMobileTelemetry);
const mockedDisconnect = vi.mocked(disconnectMobileTelemetry);
const mockedSync = vi.mocked(syncMobileTelemetry);
const connectedIntegration = {
  id: 'integration-1',
  workspaceId: 'workspace-1',
  mobileAppId: 'mobile-1',
  provider: 'SENTRY',
  status: 'CONNECTED',
  externalProjectId: 'karwa-mobile',
  configuredAt: '2026-08-22T10:00:00Z',
  lastSyncedAt: null,
  createdAt: '2026-08-22T10:00:00Z',
  updatedAt: '2026-08-22T10:00:00Z',
};

describe('MobileTelemetrySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetIntegration.mockResolvedValue(null);
    mockedConnect.mockResolvedValue(connectedIntegration as never);
    mockedDisconnect.mockResolvedValue({} as never);
    mockedSync.mockResolvedValue({} as never);
  });

  it('renders disconnected state', async () => {
    render(<MobileTelemetrySettings workspaceId='workspace-1' mobileAppId='mobile-1' />);

    expect(
      await screen.findByRole('button', {
        name: 'Connect Provider',
      }),
    ).toBeInTheDocument();
  });

  it('connects Sentry without displaying secret afterward', async () => {
    const user = userEvent.setup();

    mockedGetIntegration.mockResolvedValueOnce(null).mockResolvedValueOnce(connectedIntegration as never);

    render(<MobileTelemetrySettings workspaceId='workspace-1' mobileAppId='mobile-1' />);

    await user.type(await screen.findByLabelText('Telemetry project ID'), 'karwa-mobile');

    await user.type(screen.getByLabelText('Auth Token'), 'secret-token');

    await user.click(
      screen.getByRole('button', {
        name: 'Connect Provider',
      }),
    );

    await waitFor(() => {
      expect(mockedConnect).toHaveBeenCalledWith('workspace-1', 'mobile-1', {
        provider: 'SENTRY',
        externalProjectId: 'karwa-mobile',
        config: {
          authToken: 'secret-token',
        },
      });
    });

    await waitFor(() => {
      expect(screen.queryByDisplayValue('secret-token')).not.toBeInTheDocument();
    });
  });
});
