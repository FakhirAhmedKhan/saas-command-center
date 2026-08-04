import {
  expect,
  test,
} from '@playwright/test';

test.describe('Phase 4 frontend', () => {
  test('redirects unauthenticated dashboard access to login', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(
      /\/login$/,
    );

    await expect(
      page.getByRole('heading', {
        name: 'Sign in to continue',
      }),
    ).toBeVisible();
  });

  test('registers, shows dashboard, logs out and logs back in', async ({
    page,
  }) => {
    const uniqueId = Date.now();

    const email =
      `frontend-phase4-${uniqueId}@example.com`;

    const password =
      'StrongPassword123!';

    const workspaceName =
      `Frontend Workspace ${uniqueId}`;

    await page.goto('/register');

    await page
      .getByLabel('Your name')
      .fill('Frontend Test User');

    await page
      .getByLabel('Email address')
      .fill(email);

    await page
      .getByLabel('Password')
      .fill(password);

    await page
      .getByLabel('Workspace name')
      .fill(workspaceName);

    await page
      .getByRole('button', {
        name: 'Create account',
      })
      .click();

    await expect(page).toHaveURL(
      /\/dashboard$/,
    );

    await expect(
      page.getByRole('heading', {
        name: /Welcome back/,
      }),
    ).toBeVisible();

    await expect(
      page.getByText(workspaceName),
    ).toBeVisible();

    await page
      .getByRole('button', {
        name: 'Sign out',
      })
      .click();

    await expect(page).toHaveURL(
      /\/login$/,
    );

    await page
      .getByLabel('Email address')
      .fill(email);

    await page
      .getByLabel('Password')
      .fill(password);

    await page
      .getByRole('button', {
        name: 'Sign in',
      })
      .click();

    await expect(page).toHaveURL(
      /\/dashboard$/,
    );

    await expect(
      page.getByText(workspaceName),
    ).toBeVisible();
  });

  test('opens workspace settings and updates workspace information', async ({
    page,
  }) => {
    const uniqueId = Date.now();

    const email =
      `workspace-settings-${uniqueId}@example.com`;

    await page.goto('/register');

    await page
      .getByLabel('Your name')
      .fill('Workspace Owner');

    await page
      .getByLabel('Email address')
      .fill(email);

    await page
      .getByLabel('Password')
      .fill('StrongPassword123!');

    await page
      .getByLabel('Workspace name')
      .fill(`Workspace ${uniqueId}`);

    await page
      .getByRole('button', {
        name: 'Create account',
      })
      .click();

    await expect(page).toHaveURL(
      /\/dashboard$/,
    );

    await page
      .getByText(`Workspace ${uniqueId}`)
      .click();

    await expect(page).toHaveURL(
      /\/workspaces\/[^/]+$/,
    );

    await page
      .getByText('Workspace settings')
      .click();

    await expect(page).toHaveURL(
      /\/settings$/,
    );

    const updatedName =
      `Updated Workspace ${uniqueId}`;

    await page
      .getByLabel('Workspace name')
      .fill(updatedName);

    await page
      .getByRole('button', {
        name: 'Save changes',
      })
      .click();

    await expect(
      page.getByText(
        'Workspace updated successfully.',
      ),
    ).toBeVisible();
  });
});