import { installMockApi } from './fixtures/mock-api';
import { expect, test } from '@playwright/test';

test.describe('Batch 10 authentication flows', () => {
  test('redirects the public root to login when the session is missing', async ({ page }) => {
    await installMockApi(page, {
      authenticated: false,
    });

    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', {
        name: 'Welcome back',
      }),
    ).toBeVisible();
  });

  test('redirects protected dashboard access to login', async ({ page }) => {
    await installMockApi(page, {
      authenticated: false,
    });

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });

  test('logs in and opens the dashboard', async ({ page }) => {
    const state = await installMockApi(page, {
      authenticated: false,
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('owner@example.com');
    await page.getByLabel('Password').fill('StrongPassword123!');
    await page
      .getByRole('button', {
        name: 'Sign in',
      })
      .click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', {
        name: /Good (morning|afternoon|evening), Frontend Owner/,
      }),
    ).toBeVisible();

    const loginRequest = state.requests.find((request) => request.method === 'POST' && request.path === '/auth/login');

    expect(loginRequest?.body).toEqual({
      email: 'owner@example.com',
      password: 'StrongPassword123!',
    });
  });

  test('shows the backend login error without navigating', async ({ page }) => {
    await installMockApi(page, {
      authenticated: false,
      failures: {
        'POST /auth/login': {
          status: 401,
          message: 'Invalid email or password',
        },
      },
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('WrongPassword123!');
    await page
      .getByRole('button', {
        name: 'Sign in',
      })
      .click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('registers a new account with the expected request payload', async ({ page }) => {
    const state = await installMockApi(page, {
      authenticated: false,
    });

    await page.goto('/register');
    await page.getByLabel('Name').fill('  New Owner  ');
    await page.getByLabel('Email').fill('new-owner@example.com');
    await page.getByLabel('Password').fill('StrongPassword123!');
    await page
      .getByRole('button', {
        name: 'Create account',
      })
      .click();

    await expect(page).toHaveURL(/\/dashboard$/);

    const registerRequest = state.requests.find((request) => request.method === 'POST' && request.path === '/auth/register');

    expect(registerRequest?.body).toEqual({
      displayName: 'New Owner',
      email: 'new-owner@example.com',
      password: 'StrongPassword123!',
    });
  });

  test('uses browser validation for short registration passwords', async ({ page }) => {
    const state = await installMockApi(page, {
      authenticated: false,
    });

    await page.goto('/register');
    await page.getByLabel('Email').fill('new-owner@example.com');
    await page.getByLabel('Password').fill('short1');
    await page
      .getByRole('button', {
        name: 'Create account',
      })
      .click();

    await expect(page).toHaveURL(/\/register$/);
    const passwordValid = await page.getByLabel('Password').evaluate((input) => (input as HTMLInputElement).validity.valid);

    expect(passwordValid).toBe(false);
    expect(state.requests.some((request) => request.path === '/auth/register')).toBe(false);
  });

  test('redirects an authenticated user away from login', async ({ page }) => {
    await installMockApi(page);

    await page.goto('/login');

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('logs out and returns to login', async ({ page }) => {
    const state = await installMockApi(page);

    await page.goto('/dashboard');
    await page
      .getByRole('button', {
        name: 'Sign out',
      })
      .click();

    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    expect(state.requests.some((request) => request.method === 'POST' && request.path === '/auth/logout')).toBe(true);
  });
});
