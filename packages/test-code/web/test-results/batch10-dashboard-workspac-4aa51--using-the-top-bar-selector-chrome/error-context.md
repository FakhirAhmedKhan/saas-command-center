# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\dashboard-workspaces.spec.ts >> Batch 10 dashboard and workspace flows >> switches workspaces using the top-bar selector
- Location: e2e\batch10\dashboard-workspaces.spec.ts:53:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Select workspace')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
                - paragraph [ref=e110]: Workspace
                - heading "Command Center Team" [level=1] [ref=e111]
                - paragraph [ref=e112]: Manage access and prepare this workspace for your SaaS portfolio.
              - generic [ref=e113]: OWNER
            - generic [ref=e114]:
              - article [ref=e115]:
                - paragraph [ref=e116]: Applications
                - paragraph [ref=e117]: "1"
                - paragraph [ref=e118]: Registered in this workspace
              - article [ref=e119]:
                - paragraph [ref=e120]: Members
                - paragraph [ref=e121]: "3"
                - paragraph [ref=e122]: People with workspace access
              - article [ref=e123]:
                - paragraph [ref=e124]: Your role
                - paragraph [ref=e125]: OWNER
                - paragraph [ref=e126]: Workspace access level
            - generic [ref=e127]:
              - generic [ref=e128]:
                - heading "Workspace management" [level=2] [ref=e129]
                - paragraph [ref=e130]: Update workspace information or manage member access.
              - generic [ref=e131]:
                - link [ref=e132] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings
                  - heading "Workspace settings" [level=3] [ref=e133]
                  - paragraph [ref=e134]: Update the workspace name and slug.
                  - generic [ref=e135]: Open settings
                - link [ref=e138] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings/members
                  - heading "Members and roles" [level=3] [ref=e139]
                  - paragraph [ref=e140]: Add users and control workspace permissions.
                  - generic [ref=e141]: Manage members
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
> 58  |     await page.getByLabel('Select workspace').selectOption(SECONDARY_WORKSPACE_ID);
      |                                               ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
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
  74  |     await expect(page.getByText('Workspace URL identifier: my-new-saas-portfolio')).toBeVisible();
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