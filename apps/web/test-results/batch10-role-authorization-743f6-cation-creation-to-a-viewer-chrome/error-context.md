# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\role-authorization.spec.ts >> Batch 10 frontend role authorization >> does not expose application creation to a viewer
- Location: e2e\batch10\role-authorization.spec.ts:40:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('link', { name: 'New application' })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('link', { name: 'New application' })
    13 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e12]:
    - complementary [ref=e13]:
      - link "SC SaaS Command Center" [ref=e14] [cursor=pointer]:
        - /url: /dashboard
        - generic [ref=e15]: SC
        - generic [ref=e16]:
          - text: SaaS Command
          - strong [ref=e17]: Center
      - navigation [ref=e18]:
        - link "Overview" [ref=e19] [cursor=pointer]:
          - /url: /dashboard
        - paragraph [ref=e21]: Workspaces
        - link "Command Center Team" [ref=e22] [cursor=pointer]:
          - /url: /workspaces/11111111-1111-4111-8111-111111111111
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]: F
          - generic [ref=e28]:
            - strong [ref=e29]: Frontend Owner
            - generic [ref=e30]: owner@example.com
        - button "Sign out" [ref=e31] [cursor=pointer]
    - generic [ref=e32]:
      - banner [ref=e33]:
        - generic [ref=e34]:
          - paragraph [ref=e35]: Project visibility
          - strong [ref=e36]: SaaS Command Center
        - combobox "Select workspace" [ref=e37] [cursor=pointer]:
          - option "Select workspace"
          - option "Command Center Team" [selected]
      - main [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]:
            - generic [ref=e41]:
              - paragraph [ref=e42]: SaaS registry
              - heading "Applications" [level=1] [ref=e43]
              - paragraph [ref=e44]: Manage your SaaS products, technology stacks, important links, status and launch dates.
            - generic [ref=e45]:
              - button "Refresh" [ref=e46] [cursor=pointer]
              - link "New application" [ref=e52] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/new
          - generic [ref=e54]:
            - generic [ref=e55]:
              - textbox "Search applications" [ref=e58]:
                - /placeholder: Search applications...
              - combobox "Status" [ref=e61] [cursor=pointer]:
                - option "All statuses" [selected]
                - option "Idea"
                - option "Planning"
                - option "In development"
                - option "Testing"
                - option "Live"
                - option "Maintenance"
                - option "Paused"
              - combobox "Priority" [ref=e64] [cursor=pointer]:
                - option "All priorities" [selected]
                - option "Low"
                - option "Medium"
                - option "High"
                - option "Critical"
              - combobox "Category" [ref=e67] [cursor=pointer]:
                - option "All categories" [selected]
                - option "SaaS"
                - option "Artificial intelligence"
                - option "Mobile"
                - option "E-commerce"
                - option "API"
                - option "Internal tool"
                - option "Other"
              - combobox "Archive view" [ref=e70] [cursor=pointer]:
                - option "Active" [selected]
                - option "Archived"
              - combobox "Sort applications" [ref=e73] [cursor=pointer]:
                - option "Recently updated" [selected]
                - option "Recently created"
                - option "Name A–Z"
                - option "Name Z–A"
                - option "Highest priority"
                - option "Launch date"
            - generic [ref=e74]:
              - button "Reset" [ref=e75] [cursor=pointer]
              - button "Apply filters" [ref=e79] [cursor=pointer]
          - paragraph [ref=e84]:
            - text: Showing
            - strong [ref=e85]: "1"
            - text: of
            - strong [ref=e86]: "1"
            - text: applications
          - generic [ref=e88]:
            - generic [ref=e90]:
              - generic [ref=e91]: PA
              - generic [ref=e94]:
                - heading "PriceScout AI" [level=2] [ref=e95]
                - paragraph [ref=e96]: Artificial intelligence
            - generic [ref=e97]:
              - paragraph [ref=e98]: AI-powered product price comparison.
              - generic [ref=e99]:
                - generic [ref=e100]: In development
                - generic [ref=e101]: High priority
              - generic [ref=e102]:
                - generic [ref=e103]: Technology
                - generic [ref=e108]: Next.js
              - generic [ref=e110]:
                - generic [ref=e111]:
                  - generic [ref=e112]: Target launch
                  - paragraph [ref=e115]: Sep 1, 2026
                - generic [ref=e116]:
                  - generic [ref=e117]: Links
                  - paragraph [ref=e122]: "0"
            - link "View application" [ref=e124] [cursor=pointer]:
              - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/33333333-3333-4333-8333-333333333333
```

# Test source

```ts
  1   | import {
  2   |   expect,
  3   |   test,
  4   | } from '@playwright/test';
  5   | 
  6   | import {
  7   |   APPLICATION_ID,
  8   |   installMockApi,
  9   |   makeWorkspace,
  10  |   PRIMARY_WORKSPACE_ID,
  11  | } from './fixtures/mock-api';
  12  | 
  13  | function viewerWorkspace() {
  14  |   return makeWorkspace({
  15  |     members: [
  16  |       {
  17  |         role: 'VIEWER',
  18  |       },
  19  |     ],
  20  |   });
  21  | }
  22  | 
  23  | test.describe('Batch 10 frontend role authorization', () => {
  24  |   test('allows an owner to open application creation', async ({
  25  |     page,
  26  |   }) => {
  27  |     await installMockApi(page);
  28  | 
  29  |     await page.goto(
  30  |       `/workspaces/${PRIMARY_WORKSPACE_ID}/applications`,
  31  |     );
  32  | 
  33  |     await expect(
  34  |       page.getByRole('link', {
  35  |         name: 'New application',
  36  |       }),
  37  |     ).toBeVisible();
  38  |   });
  39  | 
  40  |   test('does not expose application creation to a viewer', async ({
  41  |     page,
  42  |   }) => {
  43  |     await installMockApi(page, {
  44  |       workspaces: [viewerWorkspace()],
  45  |     });
  46  | 
  47  |     await page.goto(
  48  |       `/workspaces/${PRIMARY_WORKSPACE_ID}/applications`,
  49  |     );
  50  | 
  51  |     await expect(
  52  |       page.getByRole('link', {
  53  |         name: 'New application',
  54  |       }),
> 55  |     ).toHaveCount(0);
      |       ^ Error: expect(locator).toHaveCount(expected) failed
  56  |   });
  57  | 
  58  |   test('does not expose website creation to a viewer', async ({
  59  |     page,
  60  |   }) => {
  61  |     await installMockApi(page, {
  62  |       workspaces: [viewerWorkspace()],
  63  |     });
  64  | 
  65  |     await page.goto(
  66  |       `/workspaces/${PRIMARY_WORKSPACE_ID}/websites`,
  67  |     );
  68  | 
  69  |     await expect(
  70  |       page.getByRole('link', {
  71  |         name: 'New website',
  72  |       }),
  73  |     ).toHaveCount(0);
  74  |   });
  75  | 
  76  |   test('keeps lifecycle controls read-only for a viewer', async ({
  77  |     page,
  78  |   }) => {
  79  |     await installMockApi(page, {
  80  |       workspaces: [viewerWorkspace()],
  81  |     });
  82  | 
  83  |     await page.goto(
  84  |       `/workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}/settings`,
  85  |     );
  86  | 
  87  |     await expect(
  88  |       page.getByText(
  89  |         'Only workspace owners and administrators can archive or restore applications.',
  90  |       ),
  91  |     ).toBeVisible();
  92  |     await expect(
  93  |       page.getByText(
  94  |         'Only the workspace owner can permanently delete an application.',
  95  |       ),
  96  |     ).toBeVisible();
  97  |     await expect(
  98  |       page.getByRole('button', {
  99  |         name: 'Archive application',
  100 |       }),
  101 |     ).toHaveCount(0);
  102 |   });
  103 | });
  104 | 
```