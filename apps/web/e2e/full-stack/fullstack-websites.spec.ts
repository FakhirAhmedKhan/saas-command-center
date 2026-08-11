import { loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

test.describe('Batch 11 real website flows', () => {
  let context: BrowserContext;
  let page: Page;
  let websiteId = '';

  let domain = '';

  test.beforeAll(async ({ browser }) => {
    state = readFullStackState();

    domain = `${uniqueValue('batch11-site', state.runId)}.example.test`;

    context = await browser.newContext();
    page = await context.newPage();

    await loginThroughUi(page, state.owner);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('creates a connected website and displays its real one-time key', async () => {
    await page.goto(`/workspaces/${state.owner.workspaceId}/websites/new`);

    await page.getByLabel('Website name').fill('Batch 11 Real Website');

    await page.getByLabel('Domain').fill(domain);

    await page.getByLabel('Reporting time zone').fill('Asia/Dubai');

    await page.getByLabel('SaaS application').selectOption(state.baselineApplication.id);

    await page
      .getByRole('button', {
        name: 'Create website',
      })
      .click();

    await expect(page).toHaveURL(/\/websites\/[0-9a-f-]+\/installation$/);

    const match = page.url().match(/\/websites\/([^/]+)\/installation$/);

    websiteId = match?.[1] ?? '';

    expect(websiteId).not.toBe('');

    await expect(
      page.getByRole('heading', {
        name: 'Tracker installation',
      }),
    ).toBeVisible();

    await expect(
      page
        .locator('code')
        .filter({
          hasText: /^cc_live_/,
        })
        .first(),
    ).toBeVisible();
  });

  test('renders the real website and ingestion values in the snippet', async () => {
    await expect(
      page.getByText(`data-website-id="${websiteId}"`, {
        exact: false,
      }),
    ).toBeVisible();

    await expect(
      page.getByText('http://127.0.0.1:4100/api/v1/collect', {
        exact: false,
      }),
    ).toBeVisible();

    await expect(page.getByText('Waiting for first event')).toBeVisible();
  });

  test('returns a real conflict for a duplicate domain', async () => {
    await page.goto(`/workspaces/${state.owner.workspaceId}/websites/new`);

    await page.getByLabel('Website name').fill('Batch 11 Duplicate Website');

    await page.getByLabel('Domain').fill(domain);

    await page
      .getByRole('button', {
        name: 'Create website',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(/domain|already|use/i);
  });
});
