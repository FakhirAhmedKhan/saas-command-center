# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fullstack-authorization.spec.ts >> Batch 11 real authorization and isolation >> loads the shared workspace but hides owner-only creation actions
- Location: e2e\full-stack\fullstack-authorization.spec.ts:28:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('link', { name: 'New application' })
Expected: 0
Received: 1
Timeout:  10000ms

Call log:
  - Expect "toHaveCount" with timeout 10000ms
  - waiting for getByRole('link', { name: 'New application' })
    23 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - button "Open Next.js Dev Tools" [ref=f1e7] [cursor=pointer]
  - alert [ref=f1e11]
  - generic [ref=f1e12]:
    - link "Skip to content" [ref=f1e13] [cursor=pointer]:
      - /url: "#main-content"
    - generic [ref=f1e14]:
      - complementary [ref=f1e15]:
        - generic [ref=f1e16]:
          - link "SC SaaS Command Center" [ref=f1e17] [cursor=pointer]:
            - /url: /dashboard
            - generic [ref=f1e18]: SC
            - generic [ref=f1e19]: SaaS Command Center
          - button "BA Batch 11 Owner Workspace 1786585674035-fnuahy" [ref=f1e22] [cursor=pointer]:
            - generic [ref=f1e23]: BA
            - generic [ref=f1e24]: Batch 11 Owner Workspace 1786585674035-fnuahy
          - navigation "Primary" [ref=f1e28]:
            - link "Overview" [ref=f1e29] [cursor=pointer]:
              - /url: /dashboard
            - generic [ref=f1e35]:
              - paragraph [ref=f1e36]: Workspace
              - generic [ref=f1e37]:
                - link "Overview" [ref=f1e38] [cursor=pointer]:
                  - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806
                - link "Applications" [ref=f1e43] [cursor=pointer]:
                  - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications
                - link "Websites" [ref=f1e54] [cursor=pointer]:
                  - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites
                - link "Activity" [ref=f1e60] [cursor=pointer]:
                  - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/activity
            - generic [ref=f1e63]:
              - paragraph [ref=f1e64]: Operations
              - generic [ref=f1e65]:
                - link "Monitoring" [ref=f1e66] [cursor=pointer]:
                  - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/monitoring
                - link "Repositories" [ref=f1e73] [cursor=pointer]:
                  - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/repositories
            - generic [ref=f1e78]:
              - paragraph [ref=f1e79]: Configuration
              - link "Settings" [ref=f1e81] [cursor=pointer]:
                - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/settings
          - generic [ref=f1e85]:
            - generic [ref=f1e86]: B
            - generic [ref=f1e87]:
              - paragraph [ref=f1e88]: Batch 11 Viewer
              - paragraph [ref=f1e89]: batch11-viewer-1786585674035-fnuahy@example.test
            - button "Sign out" [ref=f1e90] [cursor=pointer]
      - generic [ref=f1e94]:
        - banner [ref=f1e95]:
          - button "Search applications, websites… Ctrl K" [disabled] [ref=f1e97] [cursor=pointer]:
            - generic [ref=f1e101]: Search applications, websites…
            - generic [ref=f1e102]: Ctrl K
          - link "Notifications, 0 unread" [ref=f1e104] [cursor=pointer]:
            - /url: /notifications
            - generic [ref=f1e105]: 🔔
        - main [ref=f1e106]:
          - generic [ref=f1e107]:
            - generic [ref=f1e108]:
              - generic [ref=f1e109]:
                - paragraph [ref=f1e110]: SaaS registry
                - heading "Applications" [level=1] [ref=f1e111]
                - paragraph [ref=f1e112]: Manage your SaaS products, technology stacks, important links, status and launch dates.
              - generic [ref=f1e113]:
                - button "Refresh applications" [ref=f1e114] [cursor=pointer]: Refresh
                - link "New application" [ref=f1e120] [cursor=pointer]:
                  - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/new
            - generic [ref=f1e124]:
              - textbox "Search applications" [ref=f1e128]:
                - /placeholder: Search applications...
              - combobox "Status" [ref=f1e131] [cursor=pointer]:
                - option "All statuses" [selected]
                - option "Idea"
                - option "Planning"
                - option "In development"
                - option "Testing"
                - option "Live"
                - option "Maintenance"
                - option "Paused"
              - combobox "Priority" [ref=f1e134] [cursor=pointer]:
                - option "All priorities" [selected]
                - option "Low"
                - option "Medium"
                - option "High"
                - option "Critical"
              - combobox "Category" [ref=f1e137] [cursor=pointer]:
                - option "All categories" [selected]
                - option "SaaS"
                - option "Artificial intelligence"
                - option "Mobile"
                - option "E-commerce"
                - option "API"
                - option "Internal tool"
                - option "Other"
              - combobox "Archive view" [ref=f1e140] [cursor=pointer]:
                - option "Active" [selected]
                - option "Archived"
              - combobox "Sort applications" [ref=f1e143] [cursor=pointer]:
                - option "Recently updated" [selected]
                - option "Recently created"
                - option "Name A–Z"
                - option "Name Z–A"
                - option "Highest priority"
                - option "Launch date"
              - generic [ref=f1e144]:
                - button "Reset" [ref=f1e145] [cursor=pointer]
                - button "Apply filters" [ref=f1e149] [cursor=pointer]
            - paragraph [ref=f1e153]: Showing 3 of 3 applications
            - generic [ref=f1e154]:
              - generic [ref=f1e155]:
                - generic [ref=f1e156]:
                  - generic [ref=f1e157]: B1
                  - generic [ref=f1e158]:
                    - heading "Batch 11 Duplicate App" [level=2] [ref=f1e160]
                    - paragraph [ref=f1e161]: SaaS
                - paragraph [ref=f1e162]: No description has been added yet.
                - generic [ref=f1e163]:
                  - generic [ref=f1e164]: Idea
                  - generic [ref=f1e165]: Medium priority
                - generic [ref=f1e166]:
                  - generic [ref=f1e167]:
                    - generic [ref=f1e168]: Progress
                    - generic [ref=f1e169]: 0%
                  - progressbar [ref=f1e170]
                - generic [ref=f1e171]:
                  - generic [ref=f1e172]:
                    - generic [ref=f1e173]: Launch
                    - paragraph [ref=f1e176]: Not set
                  - generic [ref=f1e177]:
                    - generic [ref=f1e178]: Links
                    - paragraph [ref=f1e182]: "0"
                - generic [ref=f1e183]:
                  - generic [ref=f1e184]: Updated 2 minutes ago
                  - link "View application" [ref=f1e185] [cursor=pointer]:
                    - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/abfea7f1-8674-4bd9-9435-9e2791ca0146
              - generic [ref=f1e188]:
                - generic [ref=f1e189]:
                  - generic [ref=f1e190]: B1
                  - generic [ref=f1e191]:
                    - heading "Batch 11 Real App 1786585684953" [level=2] [ref=f1e193]
                    - paragraph [ref=f1e194]: SaaS
                - paragraph [ref=f1e195]: Created by Batch 11 full-stack E2E
                - generic [ref=f1e196]:
                  - generic [ref=f1e197]: In development
                  - generic [ref=f1e198]: High priority
                - generic [ref=f1e199]:
                  - generic [ref=f1e200]:
                    - generic [ref=f1e201]: Progress
                    - generic [ref=f1e202]: 0%
                  - progressbar [ref=f1e203]
                - generic [ref=f1e204]:
                  - generic [ref=f1e205]:
                    - generic [ref=f1e206]: Launch
                    - paragraph [ref=f1e209]: Not set
                  - generic [ref=f1e210]:
                    - generic [ref=f1e211]: Links
                    - paragraph [ref=f1e215]: "0"
                - generic [ref=f1e216]:
                  - generic [ref=f1e217]: Updated 2 minutes ago
                  - link "View application" [ref=f1e218] [cursor=pointer]:
                    - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/92146772-acf0-4845-9797-eee2444f470f
              - generic [ref=f1e221]:
                - generic [ref=f1e222]:
                  - generic [ref=f1e223]: B1
                  - generic [ref=f1e224]:
                    - heading "Batch 11 Baseline App" [level=2] [ref=f1e226]
                    - paragraph [ref=f1e227]: SaaS
                - paragraph [ref=f1e228]: Real full-stack baseline application
                - generic [ref=f1e229]:
                  - generic [ref=f1e230]: In development
                  - generic [ref=f1e231]: High priority
                - generic [ref=f1e232]:
                  - generic [ref=f1e233]:
                    - generic [ref=f1e234]: Progress
                    - generic [ref=f1e235]: 0%
                  - progressbar [ref=f1e236]
                - generic [ref=f1e237]:
                  - generic [ref=f1e238]:
                    - generic [ref=f1e239]: Launch
                    - paragraph [ref=f1e242]: Not set
                  - generic [ref=f1e243]:
                    - generic [ref=f1e244]: Links
                    - paragraph [ref=f1e248]: "0"
                - generic [ref=f1e249]:
                  - generic [ref=f1e250]: Updated 2 minutes ago
                  - link "View application" [ref=f1e251] [cursor=pointer]:
                    - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/841ab91d-7483-45b5-bb97-4f6087c656b1
```

# Test source

```ts
  1  | import { authorizedApiRequest, loginThroughUi, uniqueValue } from './fixtures/helpers';
  2  | import { readFullStackState, type FullStackState } from './fixtures/state';
  3  | import { expect, test, type BrowserContext, type Page } from '@playwright/test';
  4  | 
  5  | let state: FullStackState;
  6  | 
  7  | test.describe.configure({
  8  |   mode: 'serial',
  9  | });
  10 | 
  11 | test.describe('Batch 11 real authorization and isolation', () => {
  12 |   let context: BrowserContext;
  13 |   let page: Page;
  14 | 
  15 |   test.beforeAll(async ({ browser }) => {
  16 |     state = readFullStackState();
  17 | 
  18 |     context = await browser.newContext();
  19 |     page = await context.newPage();
  20 | 
  21 |     await loginThroughUi(page, state.viewer);
  22 |   });
  23 | 
  24 |   test.afterAll(async () => {
  25 |     await context.close();
  26 |   });
  27 | 
  28 |   test('loads the shared workspace but hides owner-only creation actions', async () => {
  29 |     await page.goto(`/workspaces/${state.owner.workspaceId}/applications`);
  30 | 
  31 |     await expect(page.getByText(state.baselineApplication.name)).toBeVisible();
  32 | 
  33 |     await expect(
  34 |       page.getByRole('link', {
  35 |         name: 'New application',
  36 |       }),
> 37 |     ).toHaveCount(0);
     |       ^ Error: expect(locator).toHaveCount(expected) failed
  38 | 
  39 |     await page.goto(`/workspaces/${state.owner.workspaceId}/websites`);
  40 | 
  41 |     await expect(
  42 |       page.getByRole('link', {
  43 |         name: 'New website',
  44 |       }),
  45 |     ).toHaveCount(0);
  46 |   });
  47 | 
  48 |   test('rejects a viewer application write at the real API boundary', async ({ request }) => {
  49 |     const response = await authorizedApiRequest(request, state, state.viewer.accessToken, `/workspaces/${state.owner.workspaceId}/applications`, {
  50 |       method: 'POST',
  51 |       data: {
  52 |         name: 'Viewer Must Not Create',
  53 |         slug: uniqueValue('viewer-forbidden', state.runId),
  54 |       },
  55 |     });
  56 | 
  57 |     expect(response.status()).toBe(403);
  58 |   });
  59 | 
  60 |   test('prevents cross-workspace reads for a non-member owner', async ({ request }) => {
  61 |     const response = await authorizedApiRequest(request, state, state.owner.accessToken, `/workspaces/${state.admin.workspaceId}/applications`);
  62 | 
  63 |     expect(response.status()).toBe(403);
  64 |   });
  65 | });
  66 | 
```