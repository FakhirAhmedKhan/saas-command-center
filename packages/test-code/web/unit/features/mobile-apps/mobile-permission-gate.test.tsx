// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MobilePermissionGate } from '@/features/mobile-apps/mobile-permission-gate';

const viewer = {
  role: 'VIEWER' as const,

  canRead: true as const,

  canWrite: false,

  canAdmin: false,

  canManageSecrets: false,
};
const admin = {
  role: 'ADMIN' as const,

  canRead: true as const,

  canWrite: true,

  canAdmin: true,

  canManageSecrets: true,
};

it('hides write control from viewer', () => {
  render(
    <MobilePermissionGate permissions={viewer} permission='write' fallback={<span>Read only</span>}>
      <button>Edit</button>
    </MobilePermissionGate>,
  );

  expect(
    screen.queryByRole('button', {
      name: 'Edit',
    }),
  ).not.toBeInTheDocument();

  expect(screen.getByText('Read only')).toBeInTheDocument();
});

it('shows admin secret controls', () => {
  render(
    <MobilePermissionGate permissions={admin} permission='secrets'>
      <button>Connect Provider</button>
    </MobilePermissionGate>,
  );

  expect(
    screen.getByRole('button', {
      name: 'Connect Provider',
    }),
  ).toBeInTheDocument();
});
