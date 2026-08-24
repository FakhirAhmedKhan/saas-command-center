// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationSubNav } from '@/features/applications/components/application-sub-nav';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

const WORKSPACE_ID = 'workspace-1';
const APPLICATION_ID = 'application-1';
const BASE_HREF = `/workspaces/${WORKSPACE_ID}/applications/${APPLICATION_ID}`;

describe('ApplicationSubNav', () => {
  it('marks Overview as current on the base application route only', () => {
    usePathnameMock.mockReturnValue(BASE_HREF);

    render(<ApplicationSubNav workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Development' })).not.toHaveAttribute('aria-current');
  });

  it('does not mark Overview as current on a sub-route, even though it prefix-matches', () => {
    usePathnameMock.mockReturnValue(`${BASE_HREF}/development`);

    render(<ApplicationSubNav workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} />);

    expect(screen.getByRole('link', { name: 'Development' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('marks Settings as current on the settings sub-route', () => {
    usePathnameMock.mockReturnValue(`${BASE_HREF}/settings`);

    render(<ApplicationSubNav workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} />);

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  });

  it('builds each tab href from the given workspaceId and applicationId', () => {
    usePathnameMock.mockReturnValue(BASE_HREF);

    render(<ApplicationSubNav workspaceId={WORKSPACE_ID} applicationId={APPLICATION_ID} />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', BASE_HREF);
    expect(screen.getByRole('link', { name: 'Releases' })).toHaveAttribute('href', `${BASE_HREF}/releases`);
  });
});
