# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fullstack-workspaces.spec.ts >> Batch 11 real workspace flows >> creates another workspace through the real UI and API
- Location: e2e\full-stack\fullstack-workspaces.spec.ts:48:7

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.fill: Target page, context or browser has been closed
Call log:
  - waiting for getByLabel('Workspace slug')

```

# Page snapshot

```yaml
- generic [ref=f2e1]:
  - button "Open Next.js Dev Tools" [ref=f2e7] [cursor=pointer]
  - alert [ref=f2e11]
  - generic [ref=f2e12]:
    - link "Skip to content" [ref=f2e13] [cursor=pointer]:
      - /url: "#main-content"
    - generic [ref=f2e14]:
      - complementary [ref=f2e15]:
        - generic [ref=f2e16]:
          - link "SC SaaS Command Center" [ref=f2e17] [cursor=pointer]:
            - /url: /dashboard
            - generic [ref=f2e18]: SC
            - generic [ref=f2e19]: SaaS Command Center
          - button "BA Batch 11 Owner Workspace 1786585674035-fnuahy" [ref=f2e22] [cursor=pointer]:
            - generic [ref=f2e23]: BA
            - generic [ref=f2e24]: Batch 11 Owner Workspace 1786585674035-fnuahy
          - navigation "Primary" [ref=f2e28]:
            - link "Overview" [ref=f2e29] [cursor=pointer]:
              - /url: /dashboard
            - generic [ref=f2e35]:
              - paragraph [ref=f2e36]: Workspace
              - generic [ref=f2e37]:
                - link "Overview" [ref=f2e38] [cursor=pointer]:
                  - /url: /workspaces/new
                - link "Applications" [ref=f2e43] [cursor=pointer]:
                  - /url: /workspaces/new/applications
                - link "Websites" [ref=f2e54] [cursor=pointer]:
                  - /url: /workspaces/new/websites
                - link "Activity" [ref=f2e60] [cursor=pointer]:
                  - /url: /workspaces/new/activity
            - generic [ref=f2e63]:
              - paragraph [ref=f2e64]: Operations
              - generic [ref=f2e65]:
                - link "Monitoring" [ref=f2e66] [cursor=pointer]:
                  - /url: /workspaces/new/monitoring
                - link "Repositories" [ref=f2e73] [cursor=pointer]:
                  - /url: /workspaces/new/repositories
            - generic [ref=f2e78]:
              - paragraph [ref=f2e79]: Configuration
              - link "Settings" [ref=f2e81] [cursor=pointer]:
                - /url: /workspaces/new/settings
          - generic [ref=f2e85]:
            - generic [ref=f2e86]: B
            - generic [ref=f2e87]:
              - paragraph [ref=f2e88]: Batch 11 Owner
              - paragraph [ref=f2e89]: batch11-owner-1786585674035-fnuahy@example.test
            - button "Sign out" [ref=f2e90] [cursor=pointer]
      - generic [ref=f2e94]:
        - banner [ref=f2e95]:
          - button "Search applications, websites… Ctrl K" [disabled] [ref=f2e97] [cursor=pointer]:
            - generic [ref=f2e101]: Search applications, websites…
            - generic [ref=f2e102]: Ctrl K
          - link "Notifications, 0 unread" [ref=f2e104] [cursor=pointer]:
            - /url: /notifications
            - generic [ref=f2e105]: 🔔
        - main [ref=f2e106]:
          - generic [ref=f2e107]:
            - link "Back to dashboard" [ref=f2e108] [cursor=pointer]:
              - /url: /dashboard
            - heading "Create your workspace" [level=1] [ref=f2e111]
            - paragraph [ref=f2e112]: A workspace contains your applications, websites, analytics, repositories and team.
            - generic [ref=f2e113]:
              - generic [ref=f2e114]:
                - generic [ref=f2e115]: Workspace name
                - textbox "Workspace name" [active] [ref=f2e117]:
                  - /placeholder: Demo Command Center
                  - text: Batch 11 Product Workspace
              - generic [ref=f2e118]:
                - generic [ref=f2e119]: Workspace URL
                - textbox "Workspace URL" [ref=f2e121]:
                  - /placeholder: demo-command-center
                - paragraph [ref=f2e122]: command-center.app/batch-11-product-workspace
              - generic [ref=f2e123]:
                - button "Create workspace" [ref=f2e124] [cursor=pointer]
                - link "Cancel" [ref=f2e125] [cursor=pointer]:
                  - /url: /dashboard
```

# Test source

```ts
  1  | import { loginThroughUi, uniqueValue } from './fixtures/helpers';
  2  | import { readFullStackState, type FullStackState } from './fixtures/state';
  3  | import { expect, test, type BrowserContext, type Page } from '@playwright/test';
  4  | 
  5  | let state: FullStackState;
  6  | 
  7  | test.describe.configure({
  8  |   mode: 'serial',
  9  | });
  10 | 
  11 | test.describe('Batch 11 real workspace flows', () => {
  12 |   let context: BrowserContext;
  13 |   let page: Page;
  14 |   let createdWorkspaceId = '';
  15 |   let slug = '';
  16 | 
  17 |   test.beforeAll(async ({ browser }) => {
  18 |     state = readFullStackState();
  19 | 
  20 |     slug = uniqueValue('batch11-workspace', state.runId);
  21 | 
  22 |     context = await browser.newContext();
  23 |     page = await context.newPage();
  24 | 
  25 |     await loginThroughUi(page, state.owner);
  26 |   });
  27 | 
  28 |   test.afterAll(async () => {
  29 |     await context.close();
  30 |   });
  31 | 
  32 |   test('loads the owner workspace from the real database', async () => {
  33 |     await page.goto('/dashboard');
  34 | 
  35 |     await expect(
  36 |       page.getByRole('heading', {
  37 |         name: new RegExp('Batch 11 Owner Workspace'),
  38 |       }),
  39 |     ).toBeVisible();
  40 | 
  41 |     await expect(
  42 |       page.getByText('OWNER', {
  43 |         exact: true,
  44 |       }),
  45 |     ).toBeVisible();
  46 |   });
  47 | 
  48 |   test('creates another workspace through the real UI and API', async () => {
  49 |     await page.goto('/workspaces/new');
  50 | 
  51 |     await page.getByLabel('Workspace name').fill('Batch 11 Product Workspace');
  52 | 
> 53 |     await page.getByLabel('Workspace slug').fill(slug);
     |                                             ^ Error: locator.fill: Target page, context or browser has been closed
  54 | 
  55 |     await page
  56 |       .getByRole('button', {
  57 |         name: 'Create workspace',
  58 |       })
  59 |       .click();
  60 | 
  61 |     await expect(page).toHaveURL(/\/workspaces\/[0-9a-f-]+\/applications$/);
  62 | 
  63 |     const match = page.url().match(/\/workspaces\/([^/]+)\/applications$/);
  64 | 
  65 |     createdWorkspaceId = match?.[1] ?? '';
  66 | 
  67 |     expect(createdWorkspaceId).not.toBe('');
  68 |   });
  69 | 
  70 |   test('shows a real conflict for a duplicate workspace slug', async () => {
  71 |     await page.goto('/workspaces/new');
  72 | 
  73 |     await page.getByLabel('Workspace name').fill('Duplicate Batch 11 Workspace');
  74 | 
  75 |     await page.getByLabel('Workspace slug').fill(slug);
  76 | 
  77 |     await page
  78 |       .getByRole('button', {
  79 |         name: 'Create workspace',
  80 |       })
  81 |       .click();
  82 | 
  83 |     await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(/slug|already|use/i);
  84 | 
  85 |     await expect(page).toHaveURL(/\/workspaces\/new$/);
  86 |   });
  87 | });
  88 | 
```