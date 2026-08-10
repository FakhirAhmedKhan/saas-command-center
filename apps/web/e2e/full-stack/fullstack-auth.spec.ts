import { expect, test } from '@playwright/test';
import { loginThroughUi } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';

let state: FullStackState;

test.describe('Batch 11 real authentication', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('redirects an anonymous browser to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs in against the real NestJS API', async ({ page }) => {
    await loginThroughUi(page, state.owner);

    await expect(
      page.getByRole('heading', {
        name: `Welcome back, ${state.owner.displayName}`,
      }),
    ).toBeVisible();
  });

  test('shows a real invalid-credentials response', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email address').fill(state.owner.email);

    await page.getByLabel('Password').fill('WrongBatch11Password!');

    await page
      .getByRole('button', {
        name: 'Sign in',
      })
      .click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('registers a fifth real account and workspace', async ({ page }) => {
    const email = `batch11-new-${state.runId}@example.test`;

    await page.goto('/register');

    await page.getByLabel('Your name').fill('Batch 11 New Owner');

    await page.getByLabel('Email address').fill(email);

    await page.getByLabel('Password').fill('StrongBatch11Password123!');

    await page.getByLabel('Workspace name').fill('Batch 11 Registered Workspace');

    await page
      .getByRole('button', {
        name: 'Create account',
      })
      .click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByText(email)).toBeVisible();
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

    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
  });
});
