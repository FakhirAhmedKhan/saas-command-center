# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fullstack-websites.spec.ts >> Batch 11 real website flows >> creates a connected website and displays its real one-time key
- Location: e2e\full-stack\fullstack-websites.spec.ts:33:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Tracker installation' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Tracker installation' })

```

```yaml
- alert
- link "Skip to content":
  - /url: "#main-content"
- complementary:
  - link "SC SaaS Command Center":
    - /url: /dashboard
  - button "BA Batch 11 Owner Workspace 1786585674035-fnuahy"
  - navigation "Primary":
    - link "Overview":
      - /url: /dashboard
    - paragraph: Workspace
    - link "Overview":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806
    - link "Applications":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications
    - link "Websites":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites
    - link "Activity":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/activity
    - paragraph: Operations
    - link "Monitoring":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/monitoring
    - link "Repositories":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/repositories
    - paragraph: Configuration
    - link "Settings":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/settings
  - text: B
  - paragraph: Batch 11 Owner
  - paragraph: batch11-owner-1786585674035-fnuahy@example.test
  - button "Sign out"
- banner:
  - button "Search applications, websites… Ctrl K" [disabled]
  - link "Notifications, 0 unread":
    - /url: /notifications
- main:
  - navigation "Website sections":
    - link "Overview":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites/61984de9-f7d7-4f5e-90c3-1433fabc132c
    - link "Analytics":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites/61984de9-f7d7-4f5e-90c3-1433fabc132c/analytics
    - link "Analytics engine":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites/61984de9-f7d7-4f5e-90c3-1433fabc132c/analytics-engine
    - link "Events":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites/61984de9-f7d7-4f5e-90c3-1433fabc132c/events
    - link "Installation":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites/61984de9-f7d7-4f5e-90c3-1433fabc132c/installation
    - link "Settings":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites/61984de9-f7d7-4f5e-90c3-1433fabc132c/settings
  - heading "Install tracking" [level=1]
  - paragraph:
    - text: Install the lightweight tracker on
    - strong: batch11-site-1786585674035-fnuahy-1786585833107-4ovvs4.example.test
    - text: .
  - heading "Tracking key" [level=2]
  - code: cc_live_81447bcd754e18c8_7hejg_ZhP-MMPD8byu2EF4rDtBOIp0kTXI_fSBvXi4c
  - button "Copy"
  - heading "HTML installation" [level=2]
  - paragraph: Add this code before the closing body tag.
  - code: <script async src="http://127.0.0.1:3102/tracker.js" data-website-id="61984de9-f7d7-4f5e-90c3-1433fabc132c" data-tracking-key="cc_live_81447bcd754e18c8_7hejg_ZhP-MMPD8byu2EF4rDtBOIp0kTXI_fSBvXi4c" data-endpoint="http://127.0.0.1:4100/api/v1/collect" data-respect-dnt="true" data-require-consent="false" ></script>
  - button "Copy snippet"
  - heading "Custom events" [level=2]
  - paragraph: Form values are never captured automatically. Send only safe, non-sensitive properties.
  - code: "window.CommandCenterAnalytics?.track( 'signup_completed', { plan: 'pro', source: 'pricing_page' } );"
  - button "Copy example"
  - heading "Tracker connection" [level=2]
  - text: Waiting for first event
  - paragraph: This status refreshes every five seconds.
  - button "Refresh"
  - text: Total events
  - paragraph: "0"
  - text: Page views
  - paragraph: "0"
  - text: Heartbeats
  - paragraph: "0"
  - text: Custom events
  - paragraph: "0"
  - paragraph: Last event
  - paragraph: Never
  - link "View raw events":
    - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites/61984de9-f7d7-4f5e-90c3-1433fabc132c/events
```

# Test source

```ts
  1   | import { loginThroughUi, uniqueValue } from './fixtures/helpers';
  2   | import { readFullStackState, type FullStackState } from './fixtures/state';
  3   | import { expect, test, type BrowserContext, type Page } from '@playwright/test';
  4   | 
  5   | let state: FullStackState;
  6   | 
  7   | test.describe.configure({
  8   |   mode: 'serial',
  9   | });
  10  | 
  11  | test.describe('Batch 11 real website flows', () => {
  12  |   let context: BrowserContext;
  13  |   let page: Page;
  14  |   let websiteId = '';
  15  | 
  16  |   let domain = '';
  17  | 
  18  |   test.beforeAll(async ({ browser }) => {
  19  |     state = readFullStackState();
  20  | 
  21  |     domain = `${uniqueValue('batch11-site', state.runId)}.example.test`;
  22  | 
  23  |     context = await browser.newContext();
  24  |     page = await context.newPage();
  25  | 
  26  |     await loginThroughUi(page, state.owner);
  27  |   });
  28  | 
  29  |   test.afterAll(async () => {
  30  |     await context.close();
  31  |   });
  32  | 
  33  |   test('creates a connected website and displays its real one-time key', async () => {
  34  |     await page.goto(`/workspaces/${state.owner.workspaceId}/websites/new`);
  35  | 
  36  |     await page.getByLabel('Website name').fill('Batch 11 Real Website');
  37  | 
  38  |     await page.getByLabel('Domain').fill(domain);
  39  | 
  40  |     await page.getByLabel('Reporting time zone').fill('Asia/Dubai');
  41  | 
  42  |     await page.getByLabel('SaaS application').selectOption(state.baselineApplication.id);
  43  | 
  44  |     await page
  45  |       .getByRole('button', {
  46  |         name: 'Create website',
  47  |       })
  48  |       .click();
  49  | 
  50  |     await expect(page).toHaveURL(/\/websites\/[0-9a-f-]+\/installation$/);
  51  | 
  52  |     const match = page.url().match(/\/websites\/([^/]+)\/installation$/);
  53  | 
  54  |     websiteId = match?.[1] ?? '';
  55  | 
  56  |     expect(websiteId).not.toBe('');
  57  | 
  58  |     await expect(
  59  |       page.getByRole('heading', {
  60  |         name: 'Tracker installation',
  61  |       }),
> 62  |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  63  | 
  64  |     await expect(
  65  |       page
  66  |         .locator('code')
  67  |         .filter({
  68  |           hasText: /^cc_live_/,
  69  |         })
  70  |         .first(),
  71  |     ).toBeVisible();
  72  |   });
  73  | 
  74  |   test('renders the real website and ingestion values in the snippet', async () => {
  75  |     await expect(
  76  |       page.getByText(`data-website-id="${websiteId}"`, {
  77  |         exact: false,
  78  |       }),
  79  |     ).toBeVisible();
  80  | 
  81  |     await expect(
  82  |       page.getByText('http://127.0.0.1:4100/api/v1/collect', {
  83  |         exact: false,
  84  |       }),
  85  |     ).toBeVisible();
  86  | 
  87  |     await expect(page.getByText('Waiting for first event')).toBeVisible();
  88  |   });
  89  | 
  90  |   test('returns a real conflict for a duplicate domain', async () => {
  91  |     await page.goto(`/workspaces/${state.owner.workspaceId}/websites/new`);
  92  | 
  93  |     await page.getByLabel('Website name').fill('Batch 11 Duplicate Website');
  94  | 
  95  |     await page.getByLabel('Domain').fill(domain);
  96  | 
  97  |     await page
  98  |       .getByRole('button', {
  99  |         name: 'Create website',
  100 |       })
  101 |       .click();
  102 | 
  103 |     await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(/domain|already|use/i);
  104 |   });
  105 | });
  106 | 
```