import { DesktopPermissionGate } from '@/features/desktop-apps/desktop-permission-gate';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const viewer = {
  role: 'VIEWER' as const,
  canRead: true as const,
  canWrite: false,
  canManage: false,
  canAnalyze: false,
  canConfigureSecrets: false,
};

const admin = {
  role: 'ADMIN' as const,
  canRead: true as const,
  canWrite: true,
  canManage: true,
  canAnalyze: true,
  canConfigureSecrets: true,
};

describe('DesktopPermissionGate', () => {
  it('allows viewer read UI but hides write UI', () => {
    const { rerender } = render(
      <DesktopPermissionGate permissions={viewer} require='read'>
        <span>Readable</span>
      </DesktopPermissionGate>,
    );

    expect(screen.getByText('Readable')).toBeInTheDocument();

    rerender(
      <DesktopPermissionGate permissions={viewer} require='write'>
        <span>Writable</span>
      </DesktopPermissionGate>,
    );

    expect(screen.queryByText('Writable')).not.toBeInTheDocument();
  });

  it('allows admin management and secret configuration UI', () => {
    render(
      <>
        <DesktopPermissionGate permissions={admin} require='manage'>
          <span>Manage</span>
        </DesktopPermissionGate>
        <DesktopPermissionGate permissions={admin} require='secrets'>
          <span>Secrets</span>
        </DesktopPermissionGate>
      </>,
    );

    expect(screen.getByText('Manage')).toBeInTheDocument();
    expect(screen.getByText('Secrets')).toBeInTheDocument();
  });
});