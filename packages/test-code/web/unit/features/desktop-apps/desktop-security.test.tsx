// @vitest-environment jsdom

import { DesktopSecurity } from '@/features/desktop-apps/desktop-security';
import {
  getDesktopSecurity,
  scanDesktopSecurity,
} from '@/features/desktop-apps/desktop-apps-api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  getDesktopSecurity: vi.fn(),
  scanDesktopSecurity: vi.fn(),
}));

const getMock = vi.mocked(getDesktopSecurity);
const scanMock = vi.mocked(scanDesktopSecurity);

const summary = {
  windowsSigning: 'PASS',
  macosSigning: 'PASS',
  notarization: 'PASS',
  criticalRisks: 0,
  highRisks: 1,
  findings: [
    {
      id: 'finding-1',
      workspaceId: 'workspace-1',
      desktopAppId: 'desktop-1',
      findingKey: 'dependency:package.json:electron',
      type: 'DEPENDENCY_VULNERABILITY',
      status: 'FAIL',
      severity: 'HIGH',
      title: 'Vulnerable dependency: electron',
      message: 'A vulnerability report contains this dependency.',
      sourcePath: 'package.json',
      evidence: ['GHSA-example'],
      createdAt: '2026-08-23T00:00:00.000Z',
      updatedAt: '2026-08-23T00:00:00.000Z',
    },
  ],
} as const;

describe('DesktopSecurity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue(summary as never);
    scanMock.mockResolvedValue(summary as never);
  });

  it('renders signing/notarization and risk summary', async () => {
    render(
      <DesktopSecurity workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    expect(await screen.findByText('Vulnerable dependency: electron')).toBeInTheDocument();
    expect(screen.getAllByText('PASS').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('runs a security scan', async () => {
    const user = userEvent.setup();

    render(
      <DesktopSecurity workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    await screen.findByText('Vulnerable dependency: electron');
    await user.click(screen.getByRole('button', { name: 'Run Security Scan' }));

    await waitFor(() => {
      expect(scanMock).toHaveBeenCalledWith('workspace-1', 'desktop-1');
    });
  });
});