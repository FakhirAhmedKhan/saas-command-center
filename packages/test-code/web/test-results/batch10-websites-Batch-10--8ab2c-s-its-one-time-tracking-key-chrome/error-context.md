# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\websites.spec.ts >> Batch 10 website and tracker setup flows >> creates a connected website and preserves its one-time tracking key
- Location: e2e\batch10\websites.spec.ts:70:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Tracker installation' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Tracker installation' })

```

```yaml
- alert
- link "Skip to content":
  - /url: "#main-content"
- complementary:
  - link "SC SaaS Command Center":
    - /url: /dashboard
  - button "CO Command Center Team"
  - navigation "Primary":
    - link "Overview":
      - /url: /dashboard
    - paragraph: Workspace
    - link "Overview":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111
    - link "Applications":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications
    - link "Websites":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites
    - link "Activity":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/activity
    - paragraph: Operations
    - link "Monitoring":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/monitoring
    - link "Repositories":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/repositories
    - paragraph: Configuration
    - link "Settings":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings
  - text: F
  - paragraph: Frontend Owner
  - paragraph: owner@example.com
  - button "Sign out"
- banner:
  - button "Search applications, websites… Ctrl K" [disabled]
  - link "Notifications, 0 unread":
    - /url: /notifications
- main:
  - navigation "Website sections":
    - link "Overview":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/88888888-8888-4888-8888-888888888888
    - link "Analytics":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/88888888-8888-4888-8888-888888888888/analytics
    - link "Analytics engine":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/88888888-8888-4888-8888-888888888888/analytics-engine
    - link "Events":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/88888888-8888-4888-8888-888888888888/events
    - link "Installation":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/88888888-8888-4888-8888-888888888888/installation
    - link "Settings":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/88888888-8888-4888-8888-888888888888/settings
  - heading "Install tracking" [level=1]
  - paragraph:
    - text: Install the lightweight tracker on
    - strong: madadai.example.com
    - text: .
  - heading "Tracking key" [level=2]
  - code: cc_live_abcdefghijklmnopqrstuvwxyz123456
  - button "Copy"
  - heading "HTML installation" [level=2]
  - paragraph: Add this code before the closing body tag.
  - code: <script async src="http://localhost:3002/tracker.js" data-website-id="88888888-8888-4888-8888-888888888888" data-tracking-key="cc_live_abcdefghijklmnopqrstuvwxyz123456" data-endpoint="http://localhost:4000/api/v1/collect" data-respect-dnt="true" data-require-consent="false" ></script>
  - button "Copy snippet"
  - heading "Custom events" [level=2]
  - paragraph: Form values are never captured automatically. Send only safe, non-sensitive properties.
  - code: "window.CommandCenterAnalytics?.track( 'signup_completed', { plan: 'pro', source: 'pricing_page' } );"
  - button "Copy example"
  - heading "Tracker connection" [level=2]
  - text: Receiving events
  - paragraph: This status refreshes every five seconds.
  - button "Refresh"
  - text: Total events
  - paragraph: "14"
  - text: Page views
  - paragraph: "7"
  - text: Heartbeats
  - paragraph: "5"
  - text: Custom events
  - paragraph: "2"
  - paragraph: Last event
  - paragraph: Aug 7, 2026, 4:00:00 AM
  - link "View raw events":
    - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/88888888-8888-4888-8888-888888888888/events
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
  57  |     await page.locator('select').nth(1).selectOption('enabled');
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
> 90  |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
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
  158 |       page.getByRole('link', {
  159 |         name: 'Website Settings',
  160 |       }),
  161 |     ).toBeVisible();
  162 |   });
  163 | 
  164 |   test('shows website creation API errors without navigating', async ({ page }) => {
  165 |     await installMockApi(page, {
  166 |       failures: {
  167 |         [`POST /workspaces/${PRIMARY_WORKSPACE_ID}/websites`]: {
  168 |           status: 409,
  169 |           message: 'Website domain already exists',
  170 |         },
  171 |       },
  172 |     });
  173 | 
  174 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/new`);
  175 |     await page.getByLabel('Website name').fill('Duplicate Website');
  176 |     await page.getByLabel('Domain').fill('command-center.example.com');
  177 |     await page
  178 |       .getByRole('button', {
  179 |         name: 'Create website',
  180 |       })
  181 |       .click();
  182 | 
  183 |     await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText('Website domain already exists');
  184 |     await expect(page).toHaveURL(new RegExp(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/new$`));
  185 |   });
  186 | });
  187 | 
```