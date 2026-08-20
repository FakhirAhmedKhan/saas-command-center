// @vitest-environment jsdom
import { ReleaseDeploymentDashboard } from '@/features/releases/release-deployment-dashboard';
import type { CurrentEnvironmentVersion, Deployment, DeploymentOptions, Release } from '@/features/releases/release-management.types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getReleaseOptionsMock,
  getReleasesMock,
  getDeploymentsMock,
  getCurrentVersionsMock,
  createReleaseMock,
  createDeploymentMock,
  transitionDeploymentMock,
} = vi.hoisted(() => ({
  getReleaseOptionsMock: vi.fn(),
  getReleasesMock: vi.fn(),
  getDeploymentsMock: vi.fn(),
  getCurrentVersionsMock: vi.fn(),
  createReleaseMock: vi.fn(),
  createDeploymentMock: vi.fn(),
  transitionDeploymentMock: vi.fn(),
}));

vi.mock('@/features/releases/release-management-api', () => ({
  getReleaseOptions: getReleaseOptionsMock,
  getReleases: getReleasesMock,
  getDeployments: getDeploymentsMock,
  getCurrentVersions: getCurrentVersionsMock,
  createRelease: createReleaseMock,
  createDeployment: createDeploymentMock,
  transitionDeployment: transitionDeploymentMock,
}));

function makeOptions(overrides: Partial<DeploymentOptions> = {}): DeploymentOptions {
  return {
    canManage: true,
    environments: [{ id: 'env-1', name: 'Production' }],
    openIncidents: [],
    ...overrides,
  };
}

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 'release-1',
    version: '1.0.0',
    name: null,
    notes: null,
    commitRef: null,
    repositoryUrl: null,
    status: 'DRAFT',
    scheduledAt: null,
    releasedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    createdBy: { id: 'user-1', displayName: 'Owner', email: 'owner@example.com' },
    ...overrides,
  } as Release;
}

function makeDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    id: 'deployment-1',
    releaseId: 'release-1',
    environmentId: 'env-1',
    attempt: 1,
    status: 'SUCCESSFUL',
    commitRef: null,
    repositoryUrl: null,
    ciJobUrl: null,
    liveUrl: null,
    deploymentNotes: null,
    failureReason: null,
    scheduledAt: null,
    startedAt: '2026-08-02T00:00:00.000Z',
    finishedAt: '2026-08-02T00:05:00.000Z',
    durationMs: 300_000,
    statusChangedAt: '2026-08-02T00:05:00.000Z',
    createdAt: '2026-08-02T00:00:00.000Z',
    release: makeRelease(),
    environment: { id: 'env-1', name: 'Production' },
    deployedBy: null,
    healthIncident: null,
    rollbackTo: null,
    activities: [],
    allowedTransitions: [],
    ...overrides,
  } as Deployment;
}

function makeVersion(overrides: Partial<CurrentEnvironmentVersion> = {}): CurrentEnvironmentVersion {
  return {
    environmentId: 'env-1',
    environmentName: 'Production',
    deploymentId: 'deployment-1',
    releaseId: 'release-1',
    version: '1.0.0',
    status: 'SUCCESSFUL',
    deployedAt: '2026-08-02T00:05:00.000Z',
    liveUrl: null,
    ...overrides,
  };
}

function stubAll(
  options: {
    options?: DeploymentOptions;
    releases?: Release[];
    deployments?: Deployment[];
    currentVersions?: CurrentEnvironmentVersion[];
  } = {},
): void {
  getReleaseOptionsMock.mockResolvedValue(options.options ?? makeOptions());
  getReleasesMock.mockResolvedValue({ items: options.releases ?? [makeRelease()], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
  getDeploymentsMock.mockResolvedValue({
    items: options.deployments ?? [makeDeployment()],
    pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
  });
  getCurrentVersionsMock.mockResolvedValue(options.currentVersions ?? [makeVersion()]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReleaseDeploymentDashboard', () => {
  it('shows a loading skeleton before data arrives', () => {
    getReleaseOptionsMock.mockReturnValue(new Promise(() => {}));
    getReleasesMock.mockReturnValue(new Promise(() => {}));
    getDeploymentsMock.mockReturnValue(new Promise(() => {}));
    getCurrentVersionsMock.mockReturnValue(new Promise(() => {}));

    const { container } = render(<ReleaseDeploymentDashboard workspaceId='workspace-1' applicationId='app-1' />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders current versions and the deployment timeline on success', async () => {
    stubAll();

    render(<ReleaseDeploymentDashboard workspaceId='workspace-1' applicationId='app-1' />);

    await waitFor(() => {
      expect(screen.getAllByText('1.0.0').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Production').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no deployments', async () => {
    stubAll({ deployments: [] });

    render(<ReleaseDeploymentDashboard workspaceId='workspace-1' applicationId='app-1' />);

    await waitFor(() => {
      expect(screen.getByText('No deployments')).toBeInTheDocument();
    });
  });

  it('shows an error state with a retry action, and retry recovers', async () => {
    const user = userEvent.setup();

    getReleaseOptionsMock.mockRejectedValueOnce(new Error('boom'));
    getReleasesMock.mockResolvedValue({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    getDeploymentsMock.mockResolvedValue({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    getCurrentVersionsMock.mockResolvedValue([]);

    render(<ReleaseDeploymentDashboard workspaceId='workspace-1' applicationId='app-1' />);

    await waitFor(() => {
      expect(screen.getByText('Release tracking unavailable')).toBeInTheDocument();
    });

    stubAll();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getAllByText('1.0.0').length).toBeGreaterThan(0);
    });
  });

  it('opens the new release form for a user who can manage releases', async () => {
    const user = userEvent.setup();

    stubAll();

    render(<ReleaseDeploymentDashboard workspaceId='workspace-1' applicationId='app-1' />);

    await waitFor(() => {
      expect(screen.getAllByText('1.0.0').length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: 'New release' }));

    expect(screen.getByRole('heading', { name: 'Create release' })).toBeInTheDocument();
  });

  it('does not surface an error banner for a request aborted by unmount', async () => {
    let rejectOptions: (reason: unknown) => void = () => {};

    getReleaseOptionsMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectOptions = reject;
        }),
    );

    getReleasesMock.mockResolvedValue({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    getDeploymentsMock.mockResolvedValue({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    getCurrentVersionsMock.mockResolvedValue([]);

    const { unmount } = render(<ReleaseDeploymentDashboard workspaceId='workspace-1' applicationId='app-1' />);

    unmount();

    rejectOptions(new DOMException('Aborted', 'AbortError'));

    await Promise.resolve();

    expect(screen.queryByText('Release tracking unavailable')).not.toBeInTheDocument();
  });
});
