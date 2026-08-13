# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\applications.spec.ts >> Batch 10 application flows >> renders a safe application load error
- Location: ..\..\packages\test-code\web\e2e\batch10\applications.spec.ts:185:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/workspaces/11111111-1111-4111-8111-111111111111/applications/33333333-3333-4333-8333-333333333333
Call log:
  - navigating to "http://localhost:3000/workspaces/11111111-1111-4111-8111-111111111111/applications/33333333-3333-4333-8333-333333333333", waiting until "load"

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
  109 |       longDescription: 'Full incident workflow.',
  110 |       category: 'AI',
  111 |       status: 'PLANNING',
  112 |       priority: 'CRITICAL',
  113 |     });
  114 |   });
  115 | 
  116 |   test('shows the custom short-name validation message', async ({ page }) => {
  117 |     await installMockApi(page);
  118 | 
  119 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/new`);
  120 |     await page.getByLabel('Application name').fill('A');
  121 | 
  122 |     await page.locator('form').evaluate((form) => {
  123 |       (form as HTMLFormElement).noValidate = true;
  124 |     });
  125 | 
  126 |     await page
  127 |       .getByRole('button', {
  128 |         name: 'Create application',
  129 |       })
  130 |       .click();
  131 | 
  132 |     await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText('Application name must contain at least two characters.');
  133 |   });
  134 | 
  135 |   test('shows an API error on application creation', async ({ page }) => {
  136 |     await installMockApi(page, {
  137 |       failures: {
  138 |         [`POST /workspaces/${PRIMARY_WORKSPACE_ID}/applications`]: {
  139 |           status: 409,
  140 |           message: 'Application slug already exists',
  141 |         },
  142 |       },
  143 |     });
  144 | 
  145 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/new`);
  146 |     await page.getByLabel('Application name').fill('Duplicate Application');
  147 |     await page.getByLabel('Slug').fill('pricescout-ai');
  148 |     await page
  149 |       .getByRole('button', {
  150 |         name: 'Create application',
  151 |       })
  152 |       .click();
  153 | 
  154 |     await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText('Application slug already exists');
  155 |   });
  156 | 
  157 |   test('opens an application detail page', async ({ page }) => {
  158 |     await installMockApi(page, {
  159 |       applications: [
  160 |         makeApplication({
  161 |           id: APPLICATION_ID,
  162 |         }),
  163 |       ],
  164 |     });
  165 | 
  166 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}`);
  167 | 
  168 |     await expect(
  169 |       page.getByRole('heading', {
  170 |         name: 'PriceScout AI',
  171 |       }),
  172 |     ).toBeVisible();
  173 |     await expect(
  174 |       page.getByRole('link', {
  175 |         name: 'Development',
  176 |       }),
  177 |     ).toBeVisible();
  178 |     await expect(
  179 |       page.getByRole('link', {
  180 |         name: 'Connect website',
  181 |       }),
  182 |     ).toBeVisible();
  183 |   });
  184 | 
  185 |   test('renders a safe application load error', async ({ page }) => {
  186 |     await installMockApi(page, {
  187 |       failures: {
  188 |         [`GET /workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}`]: {
  189 |           status: 404,
  190 |           message: 'Application not found',
  191 |         },
  192 |       },
  193 |     });
  194 | 
> 195 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/workspaces/11111111-1111-4111-8111-111111111111/applications/33333333-3333-4333-8333-333333333333
  196 | 
  197 |     await expect(
  198 |       page.getByRole('heading', {
  199 |         name: 'Unable to load application',
  200 |       }),
  201 |     ).toBeVisible();
  202 |     await expect(page.getByText('Application not found')).toBeVisible();
  203 |   });
  204 | });
  205 | 
```