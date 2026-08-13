// @vitest-environment jsdom
import { WebsiteSubNav } from './website-sub-nav';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

const WORKSPACE_ID = 'workspace-1';
const WEBSITE_ID = 'website-1';
const BASE_HREF = `/workspaces/${WORKSPACE_ID}/websites/${WEBSITE_ID}`;

describe('WebsiteSubNav', () => {
  it('marks Overview as current on the base website route only', () => {
    usePathnameMock.mockReturnValue(BASE_HREF);

    render(<WebsiteSubNav workspaceId={WORKSPACE_ID} websiteId={WEBSITE_ID} />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Analytics' })).not.toHaveAttribute('aria-current');
  });

  it('marks Installation as current on the installation sub-route', () => {
    usePathnameMock.mockReturnValue(`${BASE_HREF}/installation`);

    render(<WebsiteSubNav workspaceId={WORKSPACE_ID} websiteId={WEBSITE_ID} />);

    expect(screen.getByRole('link', { name: 'Installation' })).toHaveAttribute('aria-current', 'page');
  });

  // Regression test for a fixed prefix-collision bug: the "Analytics" tab's href is
  // `${BASE_HREF}/analytics`, and the component used to highlight a tab via
  // `pathname.startsWith(tab.href)` (website-sub-nav.tsx line 29). Because
  // `${BASE_HREF}/analytics-engine`.startsWith(`${BASE_HREF}/analytics`) is also true, visiting the
  // Analytics Engine page used to mark BOTH the "Analytics" and "Analytics engine" tabs as
  // aria-current="page" simultaneously. The check now requires an exact match or a `/`-bounded
  // sub-path, so a route can only activate one tab.
  it('marks only "Analytics engine" as current on the analytics-engine route, not "Analytics"', () => {
    usePathnameMock.mockReturnValue(`${BASE_HREF}/analytics-engine`);

    render(<WebsiteSubNav workspaceId={WORKSPACE_ID} websiteId={WEBSITE_ID} />);

    expect(screen.getByRole('link', { name: 'Analytics engine' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Analytics' })).not.toHaveAttribute('aria-current');
  });

  it('builds each tab href from the given workspaceId and websiteId', () => {
    usePathnameMock.mockReturnValue(BASE_HREF);

    render(<WebsiteSubNav workspaceId={WORKSPACE_ID} websiteId={WEBSITE_ID} />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', BASE_HREF);
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', `${BASE_HREF}/events`);
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', `${BASE_HREF}/settings`);
  });
});
