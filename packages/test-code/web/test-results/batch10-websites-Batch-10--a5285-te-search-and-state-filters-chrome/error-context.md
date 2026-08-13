# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\websites.spec.ts >> Batch 10 website and tracker setup flows >> applies website search and state filters
- Location: e2e\batch10\websites.spec.ts:51:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('select').nth(1)
    - locator resolved to <select aria-invalid="false" aria-label="Connection" class="appearance-none rounded-lg border bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 border-slate-300 h-10 w-44 shrink-0">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    55 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e12]:
    - link "Skip to content" [ref=e13] [cursor=pointer]:
      - /url: "#main-content"
    - generic [ref=e14]:
      - complementary [ref=e15]:
        - generic [ref=e16]:
          - link "SC SaaS Command Center" [ref=e17] [cursor=pointer]:
            - /url: /dashboard
            - generic [ref=e18]: SC
            - generic [ref=e19]: SaaS Command Center
          - button "CO Command Center Team" [ref=e22] [cursor=pointer]:
            - generic [ref=e23]: CO
            - generic [ref=e24]: Command Center Team
          - navigation "Primary" [ref=e28]:
            - link "Overview" [ref=e29] [cursor=pointer]:
              - /url: /dashboard
            - generic [ref=e35]:
              - paragraph [ref=e36]: Workspace
              - generic [ref=e37]:
                - link "Overview" [ref=e38] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111
                - link "Applications" [ref=e43] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications
                - link "Websites" [ref=e54] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites
                - link "Activity" [ref=e60] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/activity
            - generic [ref=e63]:
              - paragraph [ref=e64]: Operations
              - generic [ref=e65]:
                - link "Monitoring" [ref=e66] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/monitoring
                - link "Repositories" [ref=e73] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/repositories
            - generic [ref=e78]:
              - paragraph [ref=e79]: Configuration
              - link "Settings" [ref=e81] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings
          - generic [ref=e85]:
            - generic [ref=e86]: F
            - generic [ref=e87]:
              - paragraph [ref=e88]: Frontend Owner
              - paragraph [ref=e89]: owner@example.com
            - button "Sign out" [ref=e90] [cursor=pointer]
      - generic [ref=e94]:
        - banner [ref=e95]:
          - button "Search applications, websites… Ctrl K" [disabled] [ref=e97] [cursor=pointer]:
            - generic [ref=e101]: Search applications, websites…
            - generic [ref=e102]: Ctrl K
          - link "Notifications, 0 unread" [ref=e104] [cursor=pointer]:
            - /url: /notifications
            - generic [ref=e105]: 🔔
        - main [ref=e106]:
          - generic [ref=e107]:
            - generic [ref=e108]:
              - generic [ref=e109]:
                - paragraph [ref=e110]: Analytics configuration
                - heading "Websites" [level=1] [ref=e111]
                - paragraph [ref=e112]: Register domains, configure allowed origins, connect websites to SaaS products, and manage tracking keys.
              - generic [ref=e113]:
                - button "Refresh" [ref=e114] [cursor=pointer]
                - link "New website" [ref=e120] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/new
            - generic [ref=e123]:
              - searchbox "Search websites" [active] [ref=e127]: command-center
              - combobox "Status" [ref=e130] [cursor=pointer]:
                - option "All states" [selected]
                - option "Enabled"
                - option "Disabled"
              - combobox "Connection" [ref=e133] [cursor=pointer]:
                - option "All connections" [selected]
                - option "Connected"
                - option "Not connected"
              - combobox "Archive view" [ref=e136] [cursor=pointer]:
                - option "Active" [selected]
                - option "Archived"
              - generic [ref=e137]:
                - button "Reset" [ref=e138] [cursor=pointer]
                - button "Apply" [ref=e139] [cursor=pointer]
            - paragraph [ref=e140]: Showing 1 of 1 websites
            - generic [ref=e142]:
              - generic [ref=e150]:
                - generic [ref=e151]:
                  - heading "Command Center Web" [level=2] [ref=e152]
                  - generic [ref=e153]: Enabled
                - paragraph [ref=e154]: command-center.example.com
              - generic [ref=e155]:
                - generic [ref=e159]: "Application:"
                - generic [ref=e160]: PriceScout AI
              - generic [ref=e161]:
                - generic [ref=e162]:
                  - generic [ref=e163]: Time zone
                  - paragraph [ref=e167]: Asia/Dubai
                - generic [ref=e168]:
                  - generic [ref=e169]: Key prefix
                  - paragraph [ref=e173]: cc_live_ab12
              - generic [ref=e174]:
                - generic [ref=e175]: "Last event: Aug 7, 2026, 4:00 AM"
                - link "View" [ref=e176] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/44444444-4444-4444-8444-444444444444
```

# Test source

```ts
  1   | import { APPLICATION_ID, installMockApi, PRIMARY_WORKSPACE_ID, WEBSITE_ID } from './fixtures/mock-api';
  2   | import { expect, test } from '@playwright/test';
  3   | 
  4   | test.describe('Batch 10 website and tracker setup flows', () => {
  5   |   test('lists websites with connection and tracking information', async ({ page }) => {
  6   |     await installMockApi(page);
  7   | 
  8   |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);
  9   | 
  10  |     await expect(
  11  |       page.getByRole('heading', {
  12  |         name: 'Websites',
  13  |       }),
  14  |     ).toBeVisible();
  15  |     await expect(
  16  |       page.getByRole('heading', {
  17  |         name: 'Command Center Web',
  18  |       }),
  19  |     ).toBeVisible();
  20  |     await expect(page.getByText('command-center.example.com')).toBeVisible();
  21  |     await expect(
  22  |       page
  23  |         .locator('span')
  24  |         .filter({
  25  |           hasText: /^Enabled$/,
  26  |         })
  27  |         .first(),
  28  |     ).toBeVisible();
  29  |     await expect(page.getByText('PriceScout AI')).toBeVisible();
  30  |   });
  31  | 
  32  |   test('shows the empty website state', async ({ page }) => {
  33  |     await installMockApi(page, {
  34  |       websites: [],
  35  |     });
  36  | 
  37  |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);
  38  | 
  39  |     await expect(
  40  |       page.getByRole('heading', {
  41  |         name: 'No websites connected',
  42  |       }),
  43  |     ).toBeVisible();
  44  |     await expect(
  45  |       page.getByRole('link', {
  46  |         name: 'Create website',
  47  |       }),
  48  |     ).toBeVisible();
  49  |   });
  50  | 
  51  |   test('applies website search and state filters', async ({ page }) => {
  52  |     const state = await installMockApi(page);
  53  | 
  54  |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);
  55  | 
  56  |     await page.getByPlaceholder('Search websites...').fill('command-center');
> 57  |     await page.locator('select').nth(1).selectOption('enabled');
      |                                         ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  58  |     await page
  59  |       .getByRole('button', {
  60  |         name: 'Apply',
  61  |       })
  62  |       .click();
  63  | 
  64  |     const request = state.requests.filter((item) => item.method === 'GET' && item.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/websites`).at(-1);
  65  | 
  66  |     expect(request?.search).toContain('search=command-center');
  67  |     expect(request?.search).toContain('enabled=true');
  68  |   });
  69  | 
  70  |   test('creates a connected website and preserves its one-time tracking key', async ({ page }) => {
  71  |     const state = await installMockApi(page);
  72  | 
  73  |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/new?applicationId=${APPLICATION_ID}`);
  74  | 
  75  |     await page.getByLabel('Website name').fill('  MadadAI Web  ');
  76  |     await page.getByLabel('Domain').fill('madadai.example.com');
  77  |     await page.getByLabel('Reporting time zone').fill('Asia/Dubai');
  78  |     await page.getByLabel('Allowed origins').fill('https://madadai.example.com\nhttps://madadai.example.com\nhttp://localhost:3000');
  79  |     await page
  80  |       .getByRole('button', {
  81  |         name: 'Create website',
  82  |       })
  83  |       .click();
  84  | 
  85  |     await expect(page).toHaveURL(/\/websites\/88888888-8888-4888-8888-888888888888\/installation$/);
  86  |     await expect(
  87  |       page.getByRole('heading', {
  88  |         name: 'Tracker installation',
  89  |       }),
  90  |     ).toBeVisible();
  91  |     await expect(page.getByText(state.trackingKey).first()).toBeVisible();
  92  | 
  93  |     const request = state.requests.find((item) => item.method === 'POST' && item.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);
  94  | 
  95  |     expect(request?.body).toEqual({
  96  |       name: 'MadadAI Web',
  97  |       domain: 'madadai.example.com',
  98  |       timeZone: 'Asia/Dubai',
  99  |       enabled: true,
  100 |       applicationId: APPLICATION_ID,
  101 |       allowedOrigins: ['https://madadai.example.com', 'http://localhost:3000'],
  102 |     });
  103 |   });
  104 | 
  105 |   test('renders a complete tracker installation snippet', async ({ page }) => {
  106 |     const state = await installMockApi(page);
  107 | 
  108 |     await page.addInitScript(
  109 |       ({ websiteId, trackingKey }) => {
  110 |         sessionStorage.setItem(`command-center:website-key:${websiteId}`, trackingKey);
  111 |       },
  112 |       {
  113 |         websiteId: WEBSITE_ID,
  114 |         trackingKey: state.trackingKey,
  115 |       },
  116 |     );
  117 | 
  118 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/${WEBSITE_ID}/installation`);
  119 | 
  120 |     const installationCode = page.locator('pre code').first();
  121 | 
  122 |     await expect(page.getByText(state.trackingKey).first()).toBeVisible();
  123 |     await expect(installationCode).toContainText(`data-website-id="${WEBSITE_ID}"`);
  124 |     await expect(installationCode).toContainText(`data-tracking-key="${state.trackingKey}"`);
  125 |     await expect(installationCode).toContainText('data-respect-dnt="true"');
  126 |   });
  127 | 
  128 |   test('shows tracker connection metrics', async ({ page }) => {
  129 |     await installMockApi(page);
  130 | 
  131 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/${WEBSITE_ID}/installation`);
  132 | 
  133 |     await expect(
  134 |       page.getByRole('heading', {
  135 |         name: 'Tracker connection',
  136 |       }),
  137 |     ).toBeVisible();
  138 |     await expect(page.getByText('Receiving events')).toBeVisible();
  139 |     await expect(
  140 |       page.getByText('14', {
  141 |         exact: true,
  142 |       }),
  143 |     ).toBeVisible();
  144 |     await expect(
  145 |       page.getByRole('link', {
  146 |         name: 'View raw events',
  147 |       }),
  148 |     ).toBeVisible();
  149 |   });
  150 | 
  151 |   test('shows the missing-key warning on a later installation visit', async ({ page }) => {
  152 |     await installMockApi(page);
  153 | 
  154 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/${WEBSITE_ID}/installation`);
  155 | 
  156 |     await expect(page.getByText('The complete key is shown only after website creation or key rotation.')).toBeVisible();
  157 |     await expect(
```