test('mobile performance survives refresh', async ({ page }) => {
  await loginThroughUi(page, state.owner);

  await page.goto(`/workspaces/${state.owner.workspaceId}/mobile-apps/${state.mobile.id}/performance`);

  await expect(
    page.getByRole('heading', {
      name: 'Performance',
    }),
  ).toBeVisible();

  await expect(page.getByText('Crash-free')).toBeVisible();

  await page.reload();

  await expect(page.getByText('Crash-free')).toBeVisible();
});

test('alert rule appears after refresh', async ({ page }) => {
  await loginThroughUi(page, state.owner);

  await page.goto(`/workspaces/${state.owner.workspaceId}/mobile-apps/${state.mobile.id}/alerts`);

  await page.getByLabel('Alert name').fill('Final Crash Alert');

  await page
    .getByRole('button', {
      name: 'Create Alert',
    })
    .click();

  await expect(page.getByText('Final Crash Alert')).toBeVisible();

  await page.reload();

  await expect(page.getByText('Final Crash Alert')).toBeVisible();
});

test('AI analysis renders evidence', async ({ page }) => {
  await loginThroughUi(page, state.owner);

  await page.goto(`/workspaces/${state.owner.workspaceId}/mobile-apps/${state.mobile.id}`);

  await page
    .getByRole('button', {
      name: 'Summarize release health',
    })
    .click();

  await expect(page.getByText('Supporting Evidence')).toBeVisible();
});
