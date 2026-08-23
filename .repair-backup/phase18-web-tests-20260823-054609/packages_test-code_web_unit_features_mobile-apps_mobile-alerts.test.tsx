// @vitest-environment jsdom
it('renders rules and incidents', async () => {
  mockedRules.mockResolvedValue([
    {
      id: 'rule-1',
      workspaceId: 'workspace-1',
      mobileAppId: 'mobile-1',
      name: 'Crash rate > 2%',
      type: 'CRASH_RATE',
      operator: 'GT',
      threshold: 2,
      cooldownMinutes: 60,
      enabled: true,
      createdAt: '2026-08-22',
      updatedAt: '2026-08-22',
    },
  ]);

  mockedIncidents.mockResolvedValue([
    {
      id: 'incident-1',
      ruleId: 'rule-1',
      status: 'OPEN',
      title: 'Crash rate alert',
      message: 'Crash rate 3 exceeds 2.',
      actualValue: 3,
      threshold: 2,
      version: '6.14.0',
      buildId: null,
      triggeredAt: '2026-08-22',
      resolvedAt: null,
    },
  ]);

  render(<MobileAlerts workspaceId='workspace-1' mobileAppId='mobile-1' />);

  expect(await screen.findByText('Crash rate > 2%')).toBeInTheDocument();

  expect(screen.getByText('Crash rate alert')).toBeInTheDocument();
});
