// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listDesktopDependencies, scanDesktopDependencies } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopDependencies } from '@/features/desktop-apps/desktop-dependencies';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  listDesktopDependencies: vi.fn(),
  scanDesktopDependencies: vi.fn(),
}));

const listMock = vi.mocked(listDesktopDependencies);
const scanMock = vi.mocked(scanDesktopDependencies);
const dependency = {
  id: 'dependency-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  ecosystem: 'NPM',
  manifestPath: 'package.json',
  name: 'electron',
  currentVersion: '31.2.0',
  latestVersion: null,
  direct: true,
  riskStatus: 'VULNERABLE',
  severity: 'HIGH',
  advisoryIds: ['GHSA-example'],
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
} as const;

describe('DesktopDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([]);
    scanMock.mockResolvedValue([dependency as never]);
  });

  it('scans and renders dependency inventory', async () => {
    const user = userEvent.setup();

    render(<DesktopDependencies workspaceId='workspace-1' desktopAppId='desktop-1' />);

    await screen.findByText('No dependency inventory yet. Run a repository scan.');
    await user.click(screen.getByRole('button', { name: 'Scan Repository' }));

    await waitFor(() => {
      expect(scanMock).toHaveBeenCalledWith('workspace-1', 'desktop-1');
    });

    expect(await screen.findByText('electron')).toBeInTheDocument();
    expect(screen.getByText('31.2.0')).toBeInTheDocument();
    expect(screen.getByText('VULNERABLE')).toBeInTheDocument();
  });
});
