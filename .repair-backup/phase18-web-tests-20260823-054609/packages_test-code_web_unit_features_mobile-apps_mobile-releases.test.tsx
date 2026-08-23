// @vitest-environment jsdom
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
  ]);

  mockedListBuilds.mockResolvedValue([]);

  render(<MobileReleases workspaceId='workspace-1' mobileAppId='mobile-1' />);

  expect(await screen.findByText('6.14.0')).toBeInTheDocument();

  expect(screen.getByText(/Build 815/)).toBeInTheDocument();

  expect(screen.getByText(/Production/)).toBeInTheDocument();
});
