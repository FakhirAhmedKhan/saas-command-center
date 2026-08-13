# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\dashboard-workspaces.spec.ts >> Batch 10 dashboard and workspace flows >> shows a generated slug preview while creating a workspace
- Location: e2e\batch10\dashboard-workspaces.spec.ts:68:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Workspace URL identifier: my-new-saas-portfolio')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Workspace URL identifier: my-new-saas-portfolio')

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
      - /url: /workspaces/new
    - link "Applications":
      - /url: /workspaces/new/applications
    - link "Websites":
      - /url: /workspaces/new/websites
    - link "Activity":
      - /url: /workspaces/new/activity
    - paragraph: Operations
    - link "Monitoring":
      - /url: /workspaces/new/monitoring
    - link "Repositories":
      - /url: /workspaces/new/repositories
    - paragraph: Configuration
    - link "Settings":
      - /url: /workspaces/new/settings
  - text: F
  - paragraph: Frontend Owner
  - paragraph: owner@example.com
  - button "Sign out"
- banner:
  - button "Search applications, websites… Ctrl K" [disabled]
  - link "Notifications, 0 unread":
    - /url: /notifications
- main:
  - link "Back to dashboard":
    - /url: /dashboard
  - heading "Create your workspace" [level=1]
  - paragraph: A workspace contains your applications, websites, analytics, repositories and team.
  - text: Workspace name
  - textbox "Workspace name":
    - /placeholder: Demo Command Center
    - text: My New SaaS Portfolio
  - text: Workspace URL
  - textbox "Workspace URL":
    - /placeholder: demo-command-center
  - paragraph: command-center.app/my-new-saas-portfolio
  - button "Create workspace"
  - link "Cancel":
    - /url: /dashboard
```

# Test source

```ts
  1   | import { installMockApi, makeWorkspace, PRIMARY_WORKSPACE_ID, SECONDARY_WORKSPACE_ID } from './fixtures/mock-api';
  2   | import { expect, test } from '@playwright/test';
  3   | 
  4   | test.describe('Batch 10 dashboard and workspace flows', () => {
  5   |   test('renders account identity, workspace cards, and roles', async ({ page }) => {
  6   |     await installMockApi(page);
  7   | 
  8   |     await page.goto('/dashboard');
  9   | 
  10  |     await expect(page.getByText('owner@example.com')).toBeVisible();
  11  |     await expect(
  12  |       page.getByRole('heading', {
  13  |         name: 'Your workspaces',
  14  |       }),
  15  |     ).toBeVisible();
  16  |     await expect(
  17  |       page.getByRole('heading', {
  18  |         name: 'Command Center Team',
  19  |       }),
  20  |     ).toBeVisible();
  21  |     await expect(
  22  |       page.getByRole('heading', {
  23  |         name: 'MadadAI Team',
  24  |       }),
  25  |     ).toBeVisible();
  26  |     await expect(
  27  |       page.getByText('OWNER', {
  28  |         exact: true,
  29  |       }),
  30  |     ).toBeVisible();
  31  |     await expect(
  32  |       page.getByText('DEVELOPER', {
  33  |         exact: true,
  34  |       }),
  35  |     ).toBeVisible();
  36  |   });
  37  | 
  38  |   test('renders the zero-workspace empty state', async ({ page }) => {
  39  |     await installMockApi(page, {
  40  |       workspaces: [],
  41  |     });
  42  | 
  43  |     await page.goto('/dashboard');
  44  | 
  45  |     await expect(
  46  |       page.getByRole('heading', {
  47  |         name: 'No workspace found',
  48  |       }),
  49  |     ).toBeVisible();
  50  |     await expect(page.getByLabel('Select workspace')).toHaveCount(0);
  51  |   });
  52  | 
  53  |   test('switches workspaces using the top-bar selector', async ({ page }) => {
  54  |     await installMockApi(page);
  55  | 
  56  |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}`);
  57  | 
  58  |     await page.getByLabel('Select workspace').selectOption(SECONDARY_WORKSPACE_ID);
  59  | 
  60  |     await expect(page).toHaveURL(new RegExp(`/workspaces/${SECONDARY_WORKSPACE_ID}$`));
  61  |     await expect(
  62  |       page.getByRole('heading', {
  63  |         name: 'MadadAI Team',
  64  |       }),
  65  |     ).toBeVisible();
  66  |   });
  67  | 
  68  |   test('shows a generated slug preview while creating a workspace', async ({ page }) => {
  69  |     await installMockApi(page);
  70  | 
  71  |     await page.goto('/workspaces/new');
  72  |     await page.getByLabel('Workspace name').fill('My New SaaS Portfolio');
  73  | 
> 74  |     await expect(page.getByText('Workspace URL identifier: my-new-saas-portfolio')).toBeVisible();
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  75  |   });
  76  | 
  77  |   test('creates a workspace and opens its applications page', async ({ page }) => {
  78  |     const state = await installMockApi(page);
  79  | 
  80  |     await page.goto('/workspaces/new');
  81  |     await page.getByLabel('Workspace name').fill('Analytics Team');
  82  |     await page.getByLabel('Workspace slug').fill('analytics-team');
  83  |     await page
  84  |       .getByRole('button', {
  85  |         name: 'Create workspace',
  86  |       })
  87  |       .click();
  88  | 
  89  |     await expect(page).toHaveURL(/\/workspaces\/99999999-9999-4999-8999-999999999999\/applications$/);
  90  | 
  91  |     const request = state.requests.find((item) => item.method === 'POST' && item.path === '/workspaces');
  92  | 
  93  |     expect(request?.body).toEqual({
  94  |       name: 'Analytics Team',
  95  |       slug: 'analytics-team',
  96  |     });
  97  |   });
  98  | 
  99  |   test('shows workspace creation errors returned by the API', async ({ page }) => {
  100 |     await installMockApi(page, {
  101 |       failures: {
  102 |         'POST /workspaces': {
  103 |           status: 409,
  104 |           message: 'Workspace slug already exists',
  105 |         },
  106 |       },
  107 |     });
  108 | 
  109 |     await page.goto('/workspaces/new');
  110 |     await page.getByLabel('Workspace name').fill('Duplicate Team');
  111 |     await page.getByLabel('Workspace slug').fill('duplicate-team');
  112 |     await page
  113 |       .getByRole('button', {
  114 |         name: 'Create workspace',
  115 |       })
  116 |       .click();
  117 | 
  118 |     await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText('Workspace slug already exists');
  119 |     await expect(page).toHaveURL(/\/workspaces\/new$/);
  120 |   });
  121 | 
  122 |   test('shows a workspace load error without leaking another workspace', async ({ page }) => {
  123 |     await installMockApi(page, {
  124 |       workspaces: [makeWorkspace()],
  125 |       failures: {
  126 |         [`GET /workspaces/${PRIMARY_WORKSPACE_ID}`]: {
  127 |           status: 403,
  128 |           message: 'Workspace access denied',
  129 |         },
  130 |       },
  131 |     });
  132 | 
  133 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}`);
  134 | 
  135 |     await expect(page.getByText('Workspace access denied')).toBeVisible();
  136 |     await expect(
  137 |       page.getByRole('heading', {
  138 |         name: 'Command Center Team',
  139 |       }),
  140 |     ).toHaveCount(0);
  141 |   });
  142 | });
  143 | 
```