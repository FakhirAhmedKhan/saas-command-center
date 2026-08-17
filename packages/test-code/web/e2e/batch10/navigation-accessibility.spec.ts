import { installMockApi, PRIMARY_WORKSPACE_ID } from './fixtures/mock-api';
import { expect, test } from '@playwright/test';

test.describe('Batch 10 navigation, responsiveness, and accessibility', () => {
  test('restores an authenticated session from the public root', async ({ page }) => {
    await installMockApi(page);

    await page.goto('/');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', {
        name: /Good (morning|afternoon|evening), Frontend Owner/,
      }),
    ).toBeVisible();
  });

  test('exposes meaningful navigation landmarks and links', async ({ page }) => {
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);

    const nav = page.getByRole('navigation');

    await expect(nav).toBeVisible();
    await expect(
      nav.getByRole('link', {
        name: 'Applications',
      }),
    ).toBeVisible();
    await expect(
      nav.getByRole('link', {
        name: 'Websites',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Select workspace',
      }),
    ).toContainText('Command Center Team');
  });

  test('keeps the dashboard inside the mobile viewport', async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.locator('aside')).toBeHidden();

    await page
      .getByRole('button', {
        name: 'Open navigation',
      })
      .click();

    const mobileDrawer = page.getByRole('button', { name: 'Close navigation' }).last().locator('..');

    await expect(mobileDrawer.getByLabel('Select workspace')).toBeVisible();
  });

  test('provides accessible names for authentication controls', async ({ page }) => {
    await installMockApi(page, {
      authenticated: false,
    });

    await page.goto('/login');

    await expect(page.getByLabel('Email')).toHaveAttribute('type', 'email');
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password');
    await expect(
      page.getByRole('button', {
        name: 'Sign in',
      }),
    ).toBeEnabled();
    await expect(
      page.getByRole('link', {
        name: 'Create one',
      }),
    ).toBeVisible();
  });

  test('supports keyboard submission of the application filter form', async ({ page }) => {
    const state = await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);

    const search = page.getByLabel('Search applications');

    await search.fill('PriceScout');
    await search.press('Enter');

    await expect(
      page.getByRole('heading', {
        name: 'PriceScout AI',
      }),
    ).toBeVisible();

    const latestRequest = state.requests
      .filter((request) => request.method === 'GET' && request.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/applications`)
      .at(-1);

    expect(latestRequest?.search).toContain('search=PriceScout');
  });
});
