import { loginThroughUi } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test } from '@playwright/test';

let state: FullStackState;

test.describe('Batch 11 real authentication', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('redirects an anonymous browser to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?/);

    const redirectedUrl = new URL(page.url());

    expect(redirectedUrl.pathname).toBe('/login');
    expect(redirectedUrl.searchParams.get('next')).toBe('/dashboard');
  });

  test('logs in against the real NestJS API', async ({ page }) => {
    await loginThroughUi(page, state.owner);
  });

  test('shows a real invalid-credentials response', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill(state.owner.email);

    await page.getByLabel('Password').fill('WrongBatch11Password!');

    await page
      .getByRole('button', {
        name: 'Sign in',
      })
      .click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('registers a fifth real account and opens workspace onboarding', async ({ page }) => {
    const email = `batch11-new-${state.runId}@example.test`;

    await page.goto('/register');

    await page.getByLabel('Name').fill('Batch 11 New Owner');

    await page.getByLabel('Email').fill(email);

    await page.getByLabel('Password').fill('StrongBatch11Password123!');

    await page
      .getByRole('button', {
        name: 'Create account',
      })
      .click();

    await expect(page).toHaveURL(/\/workspaces\/new$/);

    await page.reload();

    await expect(page).toHaveURL(/\/workspaces\/new$/);
  });

  test('restores the browser session from the real refresh-token cookie', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: state.owner.storageStatePath,
    });

    const page = await context.newPage();

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByText(state.owner.email)).toBeVisible();

    await context.close();
  });

  test('logs out and protects the dashboard again', async ({ page }) => {
    await loginThroughUi(page, state.owner);

    await page
      .getByRole('button', {
        name: 'Sign out',
      })
      .click();

    await expect(page).toHaveURL(/\/login\?/);

    const logoutUrl = new URL(page.url());

    expect(logoutUrl.pathname).toBe('/login');
    expect(logoutUrl.searchParams.get('next')).toBe('/dashboard');

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?/);

    const redirectedUrl = new URL(page.url());

    expect(redirectedUrl.pathname).toBe('/login');
    expect(redirectedUrl.searchParams.get('next')).toBe('/dashboard');
  });
});
