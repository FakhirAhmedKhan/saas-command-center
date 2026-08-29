import { answerGuidedFlow, generateAndConfirm } from './guided-workspace-builder';
import { loginThroughUi } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test } from '@playwright/test';

let state: FullStackState;

test.describe('Guided workspace builder', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('creates a multi-application workspace', async ({ page }) => {
    await loginThroughUi(page, state.owner);
    await page.goto('/workspaces/new/guided');

    await answerGuidedFlow(page, {
      name: 'TodoFlow',
      applications: ['Web', 'Mobile', 'Desktop'],
      mobilePlatforms: ['Android', 'iOS'],
      desktopPlatforms: ['Windows'],
      repositories: 'Connect later',
    });

    await generateAndConfirm(page);

    await expect(page.getByText('TodoFlow')).toBeVisible();
  });

  test('remains usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await loginThroughUi(page, state.owner);
    await page.goto('/workspaces/new/guided');

    await expect(page.getByRole('main')).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Continue',
      }),
    ).toBeVisible();
  });
});
