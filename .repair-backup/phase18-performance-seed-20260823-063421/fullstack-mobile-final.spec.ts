import { authorizedApiRequest, loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type APIRequestContext } from '@playwright/test';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

async function createMobileApplication(request: APIRequestContext, prefix: string): Promise<string> {
  const suffix = state.runId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, 20);

  const response = await authorizedApiRequest(request, state, state.owner.accessToken, `/workspaces/${state.owner.workspaceId}/mobile-apps`, {
    method: 'POST',
    data: {
      name: uniqueValue(prefix, state.runId),
      platform: 'ANDROID',
      framework: 'ANDROID_NATIVE',
      packageId: `com.commandcenter.phase18${suffix}`,
      minOsVersion: '26',
      targetOsVersion: '36',
      currentVersion: '1.0.0',
      currentBuildNumber: '100',
    },
  });

  expect(response.status()).toBe(201);

  const body = (await response.json()) as {
    id: string;
  };

  expect(body.id).toBeTruthy();

  return body.id;
}

test.describe('Mobile final verification', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('mobile performance survives refresh', async ({ page, request }) => {
    const mobileAppId = await createMobileApplication(request, 'Phase 18 Performance');

    await loginThroughUi(page, state.owner);

    await page.goto(`/workspaces/${state.owner.workspaceId}/mobile-apps/${mobileAppId}/performance`);

    await expect(
      page.getByRole('heading', {
        name: 'Performance',
      }),
    ).toBeVisible();

    await expect(page.getByText('Crash-free')).toBeVisible();

    await page.reload();

    await expect(page.getByText('Crash-free')).toBeVisible();
  });

  test('alert rule appears after refresh', async ({ page, request }) => {
    const mobileAppId = await createMobileApplication(request, 'Phase 18 Alerts');

    await loginThroughUi(page, state.owner);

    await page.goto(`/workspaces/${state.owner.workspaceId}/mobile-apps/${mobileAppId}/alerts`);

    await page.getByLabel('Alert name').fill('Final Crash Alert');

    await page
      .getByRole('button', {
        name: 'Create Alert',
      })
      .click();

    await expect(page.getByText('Final Crash Alert')).toBeVisible();

    await page.reload();

    await expect(page.getByText('Final Crash Alert')).toBeVisible();
  });

  test('AI analysis renders evidence', async ({ page, request }) => {
    const mobileAppId = await createMobileApplication(request, 'Phase 18 AI');

    await loginThroughUi(page, state.owner);

    await page.goto(`/workspaces/${state.owner.workspaceId}/mobile-apps/${mobileAppId}`);

    await page
      .getByRole('button', {
        name: 'Summarize release health',
      })
      .click();

    await expect(page.getByText('Supporting Evidence')).toBeVisible();
  });
});
