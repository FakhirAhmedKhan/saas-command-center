import { expect, test } from '@playwright/test';

import {
  APPLICATION_ID,
  installMockApi,
  makeWorkspace,
  PRIMARY_WORKSPACE_ID,
} from './fixtures/mock-api';

function viewerWorkspace() {
  return makeWorkspace({
    members: [
      {
        role: 'VIEWER',
      },
    ],
  });
}

test.describe('Batch 10 frontend role authorization', () => {
  test('allows an owner to open application creation', async ({ page }) => {
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);

    await expect(
      page.getByRole('link', {
        name: 'New application',
      }),
    ).toBeVisible();
  });

  test('does not expose application creation to a viewer', async ({ page }) => {
    await installMockApi(page, {
      workspaces: [viewerWorkspace()],
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);

    await expect(
      page.getByRole('link', {
        name: 'New application',
      }),
    ).toHaveCount(0);
  });

  test('does not expose website creation to a viewer', async ({ page }) => {
    await installMockApi(page, {
      workspaces: [viewerWorkspace()],
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);

    await expect(
      page.getByRole('link', {
        name: 'New website',
      }),
    ).toHaveCount(0);
  });

  test('keeps lifecycle controls read-only for a viewer', async ({ page }) => {
    await installMockApi(page, {
      workspaces: [viewerWorkspace()],
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}/settings`);

    await expect(
      page.getByText(
        'Only workspace owners and administrators can archive or restore applications.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText('Only the workspace owner can permanently delete an application.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Archive application',
      }),
    ).toHaveCount(0);
  });
});
