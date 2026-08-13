# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\role-authorization.spec.ts >> Batch 10 frontend role authorization >> does not expose website creation to a viewer
- Location: e2e\batch10\role-authorization.spec.ts:41:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('link', { name: 'New website' })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('link', { name: 'New website' })
    12 × locator resolved to 1 element
       - unexpected value "1"

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
                - paragraph [ref=e110]: Analytics configuration
                - heading "Websites" [level=1] [ref=e111]
                - paragraph [ref=e112]: Register domains, configure allowed origins, connect websites to SaaS products, and manage tracking keys.
              - generic [ref=e113]:
                - button "Refresh" [ref=e114] [cursor=pointer]
                - link "New website" [ref=e120] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/new
            - generic [ref=e123]:
              - searchbox "Search websites" [ref=e127]
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
  1  | import { APPLICATION_ID, installMockApi, makeWorkspace, PRIMARY_WORKSPACE_ID } from './fixtures/mock-api';
  2  | import { expect, test } from '@playwright/test';
  3  | 
  4  | function viewerWorkspace() {
  5  |   return makeWorkspace({
  6  |     members: [
  7  |       {
  8  |         role: 'VIEWER',
  9  |       },
  10 |     ],
  11 |   });
  12 | }
  13 | 
  14 | test.describe('Batch 10 frontend role authorization', () => {
  15 |   test('allows an owner to open application creation', async ({ page }) => {
  16 |     await installMockApi(page);
  17 | 
  18 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);
  19 | 
  20 |     await expect(
  21 |       page.getByRole('link', {
  22 |         name: 'New application',
  23 |       }),
  24 |     ).toBeVisible();
  25 |   });
  26 | 
  27 |   test('does not expose application creation to a viewer', async ({ page }) => {
  28 |     await installMockApi(page, {
  29 |       workspaces: [viewerWorkspace()],
  30 |     });
  31 | 
  32 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);
  33 | 
  34 |     await expect(
  35 |       page.getByRole('link', {
  36 |         name: 'New application',
  37 |       }),
  38 |     ).toHaveCount(0);
  39 |   });
  40 | 
  41 |   test('does not expose website creation to a viewer', async ({ page }) => {
  42 |     await installMockApi(page, {
  43 |       workspaces: [viewerWorkspace()],
  44 |     });
  45 | 
  46 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);
  47 | 
  48 |     await expect(
  49 |       page.getByRole('link', {
  50 |         name: 'New website',
  51 |       }),
> 52 |     ).toHaveCount(0);
     |       ^ Error: expect(locator).toHaveCount(expected) failed
  53 |   });
  54 | 
  55 |   test('keeps lifecycle controls read-only for a viewer', async ({ page }) => {
  56 |     await installMockApi(page, {
  57 |       workspaces: [viewerWorkspace()],
  58 |     });
  59 | 
  60 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}/settings`);
  61 | 
  62 |     await expect(page.getByText('Only workspace owners and administrators can archive or restore applications.')).toBeVisible();
  63 |     await expect(page.getByText('Only the workspace owner can permanently delete an application.')).toBeVisible();
  64 |     await expect(
  65 |       page.getByRole('button', {
  66 |         name: 'Archive application',
  67 |       }),
  68 |     ).toHaveCount(0);
  69 |   });
  70 | });
  71 | 
```