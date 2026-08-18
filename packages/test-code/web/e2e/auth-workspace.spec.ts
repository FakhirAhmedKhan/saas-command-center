import { expect, test } from '@playwright/test';

async function registerAccount(page: import('@playwright/test').Page, options: { name: string; email: string; password: string }): Promise<void> {
  await page.goto('/register');

  await page.getByLabel('Name').fill(options.name);

  await page.getByLabel('Email').fill(options.email);

  await page.getByLabel('Password').fill(options.password);

  await page
    .getByRole('button', {
      name: 'Create account',
    })
    .click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

async function createWorkspace(page: import('@playwright/test').Page, workspaceName: string): Promise<void> {
  await page
    .getByRole('link', {
      name: 'Create workspace',
    })
    .click();

  await expect(page).toHaveURL(/\/workspaces\/new$/);

  await page
    .getByRole('button', {
      name: 'Create Manually',
    })
    .click();

  await page.getByLabel('Workspace name').fill(workspaceName);

  await page
    .getByRole('button', {
      name: 'Create workspace',
    })
    .click();

  await expect(page).toHaveURL(/\/workspaces\/[^/]+\/applications$/);
}

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

  test('registers, shows dashboard, logs out and logs back in', async ({ page }) => {
    const uniqueId = Date.now();

    const email = `frontend-phase4-${uniqueId}@example.com`;

    const password = 'StrongPassword123!';

    const workspaceName = `Frontend Workspace ${uniqueId}`;

    await registerAccount(page, {
      name: 'Frontend Test User',
      email,
      password,
    });

    await createWorkspace(page, workspaceName);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(workspaceName)).toBeVisible();

    await page
      .getByRole('button', {
        name: 'Sign out',
      })
      .click();

    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('Email').fill(email);

    await page.getByLabel('Password').fill(password);

    await page
      .getByRole('button', {
        name: 'Sign in',
      })
      .click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByText(workspaceName)).toBeVisible();
  });

  test('opens workspace settings and updates workspace information', async ({ page }) => {
    const uniqueId = Date.now();

    const email = `workspace-settings-${uniqueId}@example.com`;

    const workspaceName = `Workspace ${uniqueId}`;

    await registerAccount(page, {
      name: 'Workspace Owner',
      email,
      password: 'StrongPassword123!',
    });

    await createWorkspace(page, workspaceName);

    await expect(page).toHaveURL(/\/workspaces\/[^/]+\/applications$/);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', {
        name: 'Select workspace',
      })
      .click();

    await page
      .getByRole('link', {
        name: 'Workspace settings',
      })
      .click();

    await expect(page).toHaveURL(/\/settings$/);

    const updatedName = `Updated Workspace ${uniqueId}`;

    await page.getByLabel('Workspace name').fill(updatedName);

    await page
      .getByRole('button', {
        name: 'Save changes',
      })
      .click();

    await expect(page.getByText('Workspace updated successfully.')).toBeVisible();
  });
});
