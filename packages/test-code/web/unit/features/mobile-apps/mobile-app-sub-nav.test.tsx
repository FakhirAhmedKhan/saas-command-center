// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileAppSubNav } from '@/features/mobile-apps/mobile-app-sub-nav';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

describe('MobileAppSubNav', () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it('renders all mobile tabs', () => {
    usePathnameMock.mockReturnValue('/workspaces/workspace-1/mobile-apps/mobile-1');

    render(<MobileAppSubNav workspaceId='workspace-1' mobileAppId='mobile-1' />);

    expect(screen.getByText('Overview')).toBeInTheDocument();

    expect(screen.getByText('Code')).toBeInTheDocument();

    expect(screen.getByText('Builds')).toBeInTheDocument();

    expect(screen.getByText('Tests')).toBeInTheDocument();

    expect(screen.getByText('Releases')).toBeInTheDocument();

    expect(screen.getByText('Performance')).toBeInTheDocument();

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('links Code to mobile code route', () => {
    usePathnameMock.mockReturnValue('/workspaces/workspace-1/mobile-apps/mobile-1');

    render(<MobileAppSubNav workspaceId='workspace-1' mobileAppId='mobile-1' />);

    expect(
      screen.getByRole('link', {
        name: /Code/i,
      }),
    ).toHaveAttribute('href', '/workspaces/workspace-1/mobile-apps/mobile-1/code');
  });

  it('keeps future tabs disabled', () => {
    usePathnameMock.mockReturnValue('/workspaces/workspace-1/mobile-apps/mobile-1');

    render(<MobileAppSubNav workspaceId='workspace-1' mobileAppId='mobile-1' />);

    expect(screen.getByText('Builds')).toHaveAttribute('aria-disabled', 'true');
  });
});
