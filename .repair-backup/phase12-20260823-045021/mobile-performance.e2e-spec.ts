it('calculates normalized summary', async () => {
  await createMetric('6.14.0', 'CRASH_RATE', 0.14, '%');

  await createMetric('6.14.0', 'COLD_STARTUP_MS', 1700, 'ms');

  const response = await owner.agent
    .get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/summary?version=6.14.0`)
    .set(withBearer(owner.accessToken))
    .expect(200);

  expect(response.body.metrics.CRASH_RATE.value).toBe(0.14);

  expect(response.body.metrics.COLD_STARTUP_MS.value).toBe(1700);
});

it('compares versions correctly', async () => {
  await createMetric('6.13.1', 'COLD_STARTUP_MS', 1100, 'ms');

  await createMetric('6.14.0', 'COLD_STARTUP_MS', 1700, 'ms');

  const response = await owner.agent
    .get(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/performance/compare?fromVersion=6.13.1&toVersion=6.14.0`)
    .set(withBearer(owner.accessToken))
    .expect(200);

  const startup = response.body.metrics.find((metric: { metric: string }) => metric.metric === 'COLD_STARTUP_MS');

  expect(startup.before).toBe(1100);

  expect(startup.after).toBe(1700);

  expect(startup.direction).toBe('DEGRADED');
});
