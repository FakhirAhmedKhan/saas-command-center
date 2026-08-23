// @vitest-environment jsdom
import { MobileReleases } from '@/features/mobile-apps/mobile-releases';
import { createMobileRelease, listMobileBuilds, listMobileReleases, updateMobileReleaseStatus } from '@/features/mobile-apps/mobile-apps-api';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/mobile-apps/mobile-apps-api', () => ({
  createMobileRelease: vi.fn(),
  listMobileBuilds: vi.fn(),
  listMobileReleases: vi.fn(),
  updateMobileReleaseStatus: vi.fn(),
}));

const mockedListReleases = vi.mocked(listMobileReleases);
const mockedListBuilds = vi.mocked(listMobileBuilds);
const mockedCreateRelease = vi.mocked(createMobileRelease);
const mockedUpdateRelease = vi.mocked(updateMobileReleaseStatus);

describe('MobileReleases', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedListReleases.mockResolvedValue([] as never);
    mockedListBuilds.mockResolvedValue([] as never);
    mockedCreateRelease.mockResolvedValue({} as never);
    mockedUpdateRelease.mockResolvedValue({} as never);
  });

  it('renders release history', async () => {
    mockedListReleases.mockResolvedValue([
      {
        id: 'release-1',
        workspaceId: 'workspace-1',
        mobileAppId: 'mobile-1',
        buildId: 'build-1',
        version: '6.14.0',
        buildNumber: '815',
        environment: 'PRODUCTION',
        status: 'RELEASED',
        commitSha: 'a93f142',
        releaseNotes: 'Production release',
        releasedAt: '2026-08-21T10:00:00Z',
        createdAt: '2026-08-21T09:00:00Z',
        updatedAt: '2026-08-21T10:00:00Z',
      },
    ] as never);

    render(<MobileReleases workspaceId='workspace-1' mobileAppId='mobile-1' />);

    expect(await screen.findByText('6.14.0')).toBeInTheDocument();

    expect(screen.getByText(/Build 815/)).toBeInTheDocument();

    expect(screen.getByText(/Production/)).toBeInTheDocument();
  });
});
