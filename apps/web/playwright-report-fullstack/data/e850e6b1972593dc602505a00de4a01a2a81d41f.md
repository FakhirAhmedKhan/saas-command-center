# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fullstack-applications.spec.ts >> Batch 11 real application flows >> returns a real conflict for a duplicate application slug
- Location: e2e\full-stack\fullstack-applications.spec.ts:87:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[role="alert"]:not(#__next-route-announcer__)')
Expected pattern: /slug|already|use/i
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 10000ms
  - waiting for locator('[role="alert"]:not(#__next-route-announcer__)')

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
  - link "Back to applications":
    - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications
  - text: B1
  - heading "Batch 11 Duplicate App" [level=1]
  - text: Idea Medium priority
  - paragraph: No short description has been added.
  - link "Connect website":
    - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/websites/new?applicationId=abfea7f1-8674-4bd9-9435-9e2791ca0146
  - link "Edit":
    - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/abfea7f1-8674-4bd9-9435-9e2791ca0146/edit
  - navigation "Application sections":
    - link "Overview":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/abfea7f1-8674-4bd9-9435-9e2791ca0146
    - link "Development":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/abfea7f1-8674-4bd9-9435-9e2791ca0146/development
    - link "Releases":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/abfea7f1-8674-4bd9-9435-9e2791ca0146/releases
    - link "Settings":
      - /url: /workspaces/723d8691-b239-44f6-915d-6e2b78f42806/applications/abfea7f1-8674-4bd9-9435-9e2791ca0146/settings
  - heading "Overview" [level=2]
  - paragraph: No detailed description has been added.
  - heading "Technology stack" [level=2]
  - paragraph: Track the frameworks, platforms, databases and infrastructure used by this application.
  - textbox "Technology name":
    - /placeholder: Next.js
  - combobox "Technology type":
    - option "Frontend" [selected]
    - option "Backend"
    - option "Database"
    - option "Mobile"
    - option "AI"
    - option "Infrastructure"
    - option "Other"
  - textbox "Technology version":
    - /placeholder: Version
  - button "Add"
  - paragraph: No technologies have been added.
  - heading "Important links" [level=2]
  - paragraph: Store production, repository, staging, documentation and design links.
  - textbox "Link label":
    - /placeholder: Production website
  - combobox "Link type":
    - option "Production" [selected]
    - option "Staging"
    - option "Repository"
    - option "Documentation"
    - option "Design"
    - option "API"
    - option "Other"
  - textbox "Link URL":
    - /placeholder: https://example.com
  - button "Add"
  - paragraph: No application links have been added.
  - heading "Recent activity" [level=2]
  - paragraph: Review how this application changed over time.
  - button "Refresh"
  - textbox "Search activity":
    - /placeholder: Search activity...
  - combobox "Activity type":
    - option "All activities" [selected]
    - option "Application created"
    - option "Application updated"
    - option "Status changed"
    - option "Priority changed"
    - option "Application archived"
    - option "Application restored"
    - option "Application deleted"
    - option "Technology added"
    - option "Technology updated"
    - option "Technology removed"
    - option "Link added"
    - option "Link updated"
    - option "Link removed"
    - option "Milestone created"
    - option "Milestone updated"
    - option "Milestone completed"
    - option "Milestone reopened"
    - option "Milestone skipped"
    - option "Milestone deleted"
    - option "Milestones reordered"
    - option "Task created"
    - option "Task updated"
    - option "Task status changed"
    - option "Task completed"
    - option "Task reopened"
    - option "Task skipped"
    - option "Task moved"
    - option "Task deleted"
    - option "Tasks reordered"
    - option "Blocker created"
    - option "Blocker updated"
    - option "Blocker resolved"
    - option "Blocker reopened"
    - option "Blocker deleted"
    - option "Development template applied"
    - option "Website created"
    - option "Website updated"
    - option "Website enabled"
    - option "Website disabled"
    - option "Website archived"
    - option "Website restored"
    - option "Tracking key rotated"
    - option "Website connected"
    - option "Website disconnected"
  - combobox "Actor type":
    - option "All actors" [selected]
    - option "User"
    - option "System"
  - combobox "Entity type":
    - option "All entities" [selected]
    - option "Application"
    - option "Technology"
    - option "Link"
    - option "Milestone"
    - option "Task"
    - option "Blocker"
    - option "Website"
  - textbox "From date"
  - textbox "To date"
  - button "Reset"
  - button "Apply filters"
  - heading "No activity found" [level=3]
  - paragraph: Important application changes will appear here.
  - heading "Progress" [level=2]
  - progressbar
  - heading "Timeline" [level=2]
  - text: Started Not set Target launch Not set Launched Not set
  - heading "Details" [level=2]
  - text: Category SaaS Slug batch11-real-app-1786585674035-fnuahy-1786585684974-ndr80e-2 Created Aug 13, 2026 Updated Aug 13, 2026
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
  11  | test.describe('Batch 11 real application flows', () => {
  12  |   let context: BrowserContext;
  13  |   let page: Page;
  14  |   let applicationId = '';
  15  | 
  16  |   const applicationName = `Batch 11 Real App ${Date.now()}`;
  17  | 
  18  |   let applicationSlug = '';
  19  | 
  20  |   test.beforeAll(async ({ browser }) => {
  21  |     state = readFullStackState();
  22  | 
  23  |     applicationSlug = uniqueValue('batch11-real-app', state.runId);
  24  | 
  25  |     context = await browser.newContext();
  26  |     page = await context.newPage();
  27  | 
  28  |     await loginThroughUi(page, state.owner);
  29  |   });
  30  | 
  31  |   test.afterAll(async () => {
  32  |     await context.close();
  33  |   });
  34  | 
  35  |   test('creates an application through the real frontend', async () => {
  36  |     await page.goto(`/workspaces/${state.owner.workspaceId}/applications/new`);
  37  | 
  38  |     await page.getByLabel('Application name').fill(applicationName);
  39  | 
  40  |     await page.getByLabel('Slug').fill(applicationSlug);
  41  | 
  42  |     await page.getByLabel('Short description').fill('Created by Batch 11 full-stack E2E');
  43  | 
  44  |     await page.getByLabel('Status').selectOption('IN_DEVELOPMENT');
  45  | 
  46  |     await page.getByLabel('Priority').selectOption('HIGH');
  47  | 
  48  |     await page
  49  |       .getByRole('button', {
  50  |         name: 'Create application',
  51  |       })
  52  |       .click();
  53  | 
  54  |     await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+$/);
  55  | 
  56  |     applicationId = page.url().split('/').at(-1) ?? '';
  57  | 
  58  |     await expect(
  59  |       page.getByRole('heading', {
  60  |         name: applicationName,
  61  |       }),
  62  |     ).toBeVisible();
  63  | 
  64  |     await expect(page.getByText('Created by Batch 11 full-stack E2E')).toBeVisible();
  65  |   });
  66  | 
  67  |   test('loads the created application from the real database', async () => {
  68  |     expect(applicationId).not.toBe('');
  69  | 
  70  |     await page.goto(`/workspaces/${state.owner.workspaceId}/applications/${applicationId}`);
  71  | 
  72  |     await expect(
  73  |       page.getByRole('heading', {
  74  |         name: applicationName,
  75  |       }),
  76  |     ).toBeVisible();
  77  | 
  78  |     await expect(
  79  |       page
  80  |         .getByText('In development', {
  81  |           exact: true,
  82  |         })
  83  |         .last(),
  84  |     ).toBeVisible();
  85  |   });
  86  | 
  87  |   test('returns a real conflict for a duplicate application slug', async () => {
  88  |     await page.goto(`/workspaces/${state.owner.workspaceId}/applications/new`);
  89  | 
  90  |     await page.getByLabel('Application name').fill('Batch 11 Duplicate App');
  91  | 
  92  |     await page.getByLabel('Slug').fill(applicationSlug);
  93  | 
  94  |     await page
  95  |       .getByRole('button', {
  96  |         name: 'Create application',
  97  |       })
  98  |       .click();
  99  | 
> 100 |     await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(/slug|already|use/i);
      |                                                                                 ^ Error: expect(locator).toContainText(expected) failed
  101 |   });
  102 | });
  103 | 
```