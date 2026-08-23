// @vitest-environment jsdom
it('renders disconnected state', async () => {
  mockedGetIntegration.mockResolvedValue(null);

  render(<MobileTelemetrySettings workspaceId='workspace-1' mobileAppId='mobile-1' />);

  expect(
    await screen.findByRole('button', {
      name: 'Connect Provider',
    }),
  ).toBeInTheDocument();
});

it('connects Sentry without displaying secret afterward', async () => {
  const user = userEvent.setup();

  mockedGetIntegration.mockResolvedValueOnce(null).mockResolvedValueOnce({
    id: 'integration-1',

    workspaceId: 'workspace-1',

    mobileAppId: 'mobile-1',

    provider: 'SENTRY',

    status: 'CONNECTED',

    externalProjectId: 'karwa-mobile',

    configuredAt: '2026-08-22T10:00:00Z',

    lastSyncedAt: null,

    createdAt: '2026-08-22T10:00:00Z',

    updatedAt: '2026-08-22T10:00:00Z',
  });

  render(<MobileTelemetrySettings workspaceId='workspace-1' mobileAppId='mobile-1' />);

  await user.type(await screen.findByLabelText('Telemetry project ID'), 'karwa-mobile');

  await user.type(screen.getByLabelText('Auth Token'), 'secret-token');

  await user.click(
    screen.getByRole('button', {
      name: 'Connect Provider',
    }),
  );

  await waitFor(() => {
    expect(mockedConnect).toHaveBeenCalled();
  });

  expect(screen.queryByDisplayValue('secret-token')).not.toBeInTheDocument();
});
