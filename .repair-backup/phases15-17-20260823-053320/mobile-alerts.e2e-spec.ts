it('metric below threshold creates no incident', async () => {
  await createCrashRule(2);

  await createCrashRate(1);

  await evaluate();

  expect(await prisma.mobileAlertIncident.count()).toBe(0);
});

it('metric above threshold creates one incident and notifications', async () => {
  await createCrashRule(2);

  await createCrashRate(3);

  await evaluate();

  expect(await prisma.mobileAlertIncident.count()).toBe(1);

  expect(await prisma.notification.count()).toBeGreaterThan(0);
});

it('duplicate evaluation does not duplicate active incident', async () => {
  await createCrashRule(2);

  await createCrashRate(3);

  await evaluate();
  await evaluate();
  await evaluate();

  expect(
    await prisma.mobileAlertIncident.count({
      where: {
        status: 'OPEN',
      },
    }),
  ).toBe(1);
});

it('recovery resolves incident', async () => {
  await createCrashRule(2);

  await createCrashRate(3);

  await evaluate();

  await prisma.mobilePerformanceMetric.deleteMany();

  await createCrashRate(1);

  await evaluate();

  expect((await prisma.mobileAlertIncident.findFirstOrThrow()).status).toBe('RESOLVED');
});

it('disabled rule does not trigger', async () => {
  const rule = await createCrashRule(2);

  await prisma.mobileAlertRule.update({
    where: {
      id: rule.id,
    },

    data: {
      enabled: false,
    },
  });

  await createCrashRate(10);

  await evaluate();

  expect(await prisma.mobileAlertIncident.count()).toBe(0);
});

it('failed build triggers build-failure incident', async () => {
  await createBuildFailureRule();

  await createBuild({
    status: 'FAILED',
  });

  await evaluate();

  expect(
    await prisma.mobileAlertIncident.count({
      where: {
        status: 'OPEN',
      },
    }),
  ).toBe(1);
});
