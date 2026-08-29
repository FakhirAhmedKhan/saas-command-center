import { expect, test } from '@playwright/test';

test('reviews, edits and transactionally creates a multi-application workspace', async ({ page }) => {
  await loginAsOwner(page);
  await page.goto('/workspaces/new/guided');

  await answerText(page, 'What are you building?', 'Cross-platform task management');
  await answerText(page, 'What should the workspace be called?', 'TodoFlow');
  await choose(page, 'What type of product is it?', 'Productivity SaaS');
  await chooseMany(page, 'Who will use the product?', ['Consumers']);
  await chooseMany(page, 'Which applications do you need?', ['Web', 'Mobile', 'Desktop']);
  await chooseMany(page, 'Which mobile platforms do you need?', ['Android', 'iOS']);
  await chooseMany(page, 'Which desktop platforms do you need?', ['Windows']);
  await chooseMany(page, 'Which core features are required?', ['Dashboard']);
  await chooseBoolean(page, 'Does the product require user accounts?', true);
  await choose(page, 'Do repositories already exist?', 'Connect later');
  await chooseMany(page, 'Which environments are required?', ['Development', 'Production']);
  await chooseMany(page, 'Which engineering systems are required?', ['CI/CD', 'Monitoring', 'Security']);

  await page
    .getByRole('button', {
      name: 'Generate guided recommendations',
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name: 'Review guided recommendations',
    }),
  ).toBeVisible();
  await expect(page.getByText('TodoFlow Web')).toBeVisible();
  await expect(page.getByText('TodoFlow Mobile')).toBeVisible();
  await expect(page.getByText('TodoFlow Desktop')).toBeVisible();

  await page.getByRole('group', { name: 'TodoFlow Desktop' }).getByRole('button', { name: 'ELECTRON' }).click();

  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByText('Resolve these blueprint issues')).not.toBeVisible();

  await page.getByRole('button', { name: 'Confirm and create' }).click();
  await expect(page).toHaveURL(/\/workspaces\/[a-z0-9-]+$/);

  await expect(page.getByText('TodoFlow')).toBeVisible();
  await expect(page.getByText('Web')).toBeVisible();
  await expect(page.getByText('Mobile')).toBeVisible();
  await expect(page.getByText('Desktop')).toBeVisible();
});

test('remains usable on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsOwner(page);
  await page.goto('/workspaces/new/guided');

  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});
