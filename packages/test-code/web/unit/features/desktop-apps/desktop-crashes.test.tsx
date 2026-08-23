// @vitest-environment jsdom

import { DesktopCrashes } from '@/features/desktop-apps/desktop-crashes';
import { listDesktopCrashes } from '@/features/desktop-apps/desktop-apps-api';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  listDesktopCrashes: vi.fn(),
}));

const api = vi.mocked(listDesktopCrashes);

describe('DesktopCrashes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders crash impact', async () => {
    api.mockResolvedValue([
      {
        id: 'crash-1',
        workspaceId: 'workspace-1',
        desktopAppId: 'desktop-1',
        telemetryIntegrationId: 'integration-1',
        externalId: 'external-1',
        fingerprint: 'renderer-crash',
        message: 'Renderer process exited unexpectedly',
        count: 12,
        affectedUsers: 8,
        version: '2.4.0',
        platform: 'WINDOWS',
        architecture: 'X64',
        channel: 'STABLE',
        firstSeenAt: '2026-08-22T00:00:00.000Z',
        lastSeenAt: '2026-08-23T00:00:00.000Z',
        createdAt: '2026-08-22T00:00:00.000Z',
        updatedAt: '2026-08-23T00:00:00.000Z',
      },
    ]);

    render(
      <DesktopCrashes workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    expect(
      await screen.findByText('Renderer process exited unexpectedly'),
    ).toBeInTheDocument();
    expect(screen.getByText('12 events')).toBeInTheDocument();
    expect(screen.getByText('8 users')).toBeInTheDocument();
    expect(screen.getByText('2.4.0')).toBeInTheDocument();
  });
});