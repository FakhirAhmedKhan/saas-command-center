# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\applications.spec.ts >> Batch 10 application flows >> lists active applications with status, priority, and technology
- Location: ..\..\packages\test-code\web\e2e\batch10\applications.spec.ts:5:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/workspaces/11111111-1111-4111-8111-111111111111/applications
Call log:
  - navigating to "http://localhost:3000/workspaces/11111111-1111-4111-8111-111111111111/applications", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: localhost
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1   | import { APPLICATION_ID, installMockApi, makeApplication, PRIMARY_WORKSPACE_ID } from './fixtures/mock-api';
  2   | import { expect, test } from '@playwright/test';
  3   | 
  4   | test.describe('Batch 10 application flows', () => {
  5   |   test('lists active applications with status, priority, and technology', async ({ page }) => {
  6   |     await installMockApi(page);
  7   | 
> 8   |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/workspaces/11111111-1111-4111-8111-111111111111/applications
  9   | 
  10  |     await expect(
  11  |       page.getByRole('heading', {
  12  |         name: 'Applications',
  13  |       }),
  14  |     ).toBeVisible();
  15  |     await expect(
  16  |       page.getByRole('heading', {
  17  |         name: 'PriceScout AI',
  18  |       }),
  19  |     ).toBeVisible();
  20  |     await expect(
  21  |       page
  22  |         .locator('span')
  23  |         .filter({
  24  |           hasText: /^In development$/,
  25  |         })
  26  |         .first(),
  27  |     ).toBeVisible();
  28  |     await expect(page.getByText('High priority')).toBeVisible();
  29  |     await expect(page.getByText('Next.js')).toBeVisible();
  30  |   });
  31  | 
  32  |   test('shows the active empty state', async ({ page }) => {
  33  |     await installMockApi(page, {
  34  |       applications: [],
  35  |     });
  36  | 
  37  |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);
  38  | 
  39  |     await expect(
  40  |       page.getByRole('heading', {
  41  |         name: 'No applications yet',
  42  |       }),
  43  |     ).toBeVisible();
  44  |     await expect(
  45  |       page.getByRole('link', {
  46  |         name: 'Create application',
  47  |       }),
  48  |     ).toBeVisible();
  49  |   });
  50  | 
  51  |   test('applies application search and status filters to the API request', async ({ page }) => {
  52  |     const state = await installMockApi(page);
  53  | 
  54  |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);
  55  | 
  56  |     await page.getByLabel('Search applications').fill('PriceScout');
  57  |     await page.getByLabel('Status').selectOption('IN_DEVELOPMENT');
  58  |     await page
  59  |       .getByRole('button', {
  60  |         name: 'Apply filters',
  61  |       })
  62  |       .click();
  63  | 
  64  |     await expect(
  65  |       page.getByRole('heading', {
  66  |         name: 'PriceScout AI',
  67  |       }),
  68  |     ).toBeVisible();
  69  | 
  70  |     const latestListRequest = state.requests
  71  |       .filter((request) => request.method === 'GET' && request.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/applications`)
  72  |       .at(-1);
  73  | 
  74  |     expect(latestListRequest?.search).toContain('search=PriceScout');
  75  |     expect(latestListRequest?.search).toContain('status=IN_DEVELOPMENT');
  76  |   });
  77  | 
  78  |   test('creates an application with normalized form values', async ({ page }) => {
  79  |     const state = await installMockApi(page);
  80  | 
  81  |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/new`);
  82  |     await page.getByLabel('Application name').fill('  MadadAI Portal  ');
  83  |     await page.getByLabel('Slug').fill('madadai-portal');
  84  |     await page.getByLabel('Short description').fill('  Emergency response portal  ');
  85  |     await page.getByLabel('Long description').fill('  Full incident workflow.  ');
  86  |     await page.getByLabel('Category').selectOption('AI');
  87  |     await page.getByLabel('Status').selectOption('PLANNING');
  88  |     await page.getByLabel('Priority').selectOption('CRITICAL');
  89  |     await page.getByLabel('Start date').fill('2026-08-01');
  90  |     await page
  91  |       .getByRole('button', {
  92  |         name: 'Create application',
  93  |       })
  94  |       .click();
  95  | 
  96  |     await expect(page).toHaveURL(/\/applications\/77777777-7777-4777-8777-777777777777$/);
  97  |     await expect(
  98  |       page.getByRole('heading', {
  99  |         name: 'MadadAI Portal',
  100 |       }),
  101 |     ).toBeVisible();
  102 | 
  103 |     const createRequest = state.requests.find((request) => request.method === 'POST' && request.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);
  104 | 
  105 |     expect(createRequest?.body).toMatchObject({
  106 |       name: 'MadadAI Portal',
  107 |       slug: 'madadai-portal',
  108 |       shortDescription: 'Emergency response portal',
```