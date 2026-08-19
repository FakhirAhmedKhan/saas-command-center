import { expect, test } from '@playwright/test';

test.describe('Phase 4 frontend', () => {
  test('redirects unauthenticated dashboard access to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

    await expect(
      page.getByRole('heading', {
        name: 'Welcome back',
      }),
    ).toBeVisible();
  });
});