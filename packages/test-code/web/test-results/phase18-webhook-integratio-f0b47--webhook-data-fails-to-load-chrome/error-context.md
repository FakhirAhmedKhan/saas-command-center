# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase18\webhook-integrations.spec.ts >> Phase 18 webhook integrations >> shows an error state with a retry action when webhook data fails to load
- Location: e2e\phase18\webhook-integrations.spec.ts:202:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Retry' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Retry' })

```

```yaml
- alert
- link "Skip to content":
  - /url: "#main-content"
- complementary:
  - link "SC SaaS Command Center":
    - /url: /dashboard
  - link "Create workspace":
    - /url: /workspaces/new
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
  - text: A
  - paragraph: Account owner
  - paragraph: admin@example.com
  - button "Sign out"
- banner:
  - button "Search applications, websites… Ctrl K" [disabled]
  - link "Notifications, 0 unread":
    - /url: /notifications
- main:
  - heading "Settings" [level=1]
  - paragraph: Manage workspace information, members and integrations.
  - navigation "Workspace settings sections":
    - link "General":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings
    - link "Members":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings/members
    - link "Integrations":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings/integrations
  - alert:
    - heading "Integrations unavailable" [level=2]
    - paragraph: Internal server error
    - button "Try again"
```

# Test source

```ts
  131 |       .click();
  132 | 
  133 |     await expect(page.getByText('Save this signing secret')).toBeVisible();
  134 | 
  135 |     await expect(page.locator('input[value="one-time-webhook-secret"]')).toBeVisible();
  136 |   });
  137 | 
  138 |   test('hides webhook management controls from viewers', async ({ page }) => {
  139 |     await page.route('**/integrations/webhooks', async (route) => {
  140 |       await route.fulfill({
  141 |         status: 200,
  142 | 
  143 |         contentType: 'application/json',
  144 | 
  145 |         body: JSON.stringify({
  146 |           canManage: false,
  147 | 
  148 |           eventCatalog: [],
  149 | 
  150 |           items: [],
  151 |         }),
  152 |       });
  153 |     });
  154 | 
  155 |     await page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  156 | 
  157 |     await expect(
  158 |       page.getByRole('button', {
  159 |         name: 'Create webhook',
  160 |       }),
  161 |     ).toHaveCount(0);
  162 |   });
  163 | 
  164 |   test('shows a loading skeleton before webhook data arrives', async ({ page }) => {
  165 |     let resolveRoute: (() => void) | undefined;
  166 | 
  167 |     await page.route('**/integrations/webhooks', async (route) => {
  168 |       if (route.request().method() === 'POST') {
  169 |         await route.fallback();
  170 | 
  171 |         return;
  172 |       }
  173 | 
  174 |       await new Promise<void>((resolve) => {
  175 |         resolveRoute = resolve;
  176 |       });
  177 | 
  178 |       await route.fulfill({
  179 |         status: 200,
  180 | 
  181 |         contentType: 'application/json',
  182 | 
  183 |         body: JSON.stringify({
  184 |           canManage: true,
  185 | 
  186 |           eventCatalog: [],
  187 | 
  188 |           items: [],
  189 |         }),
  190 |       });
  191 |     });
  192 | 
  193 |     const navigation = page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  194 | 
  195 |     await expect(page.locator('.animate-pulse').first()).toBeVisible();
  196 | 
  197 |     resolveRoute?.();
  198 | 
  199 |     await navigation;
  200 |   });
  201 | 
  202 |   test('shows an error state with a retry action when webhook data fails to load', async ({ page }) => {
  203 |     await page.route('**/integrations/webhooks', async (route) => {
  204 |       if (route.request().method() === 'POST') {
  205 |         await route.fallback();
  206 | 
  207 |         return;
  208 |       }
  209 | 
  210 |       await route.fulfill({
  211 |         status: 500,
  212 | 
  213 |         contentType: 'application/json',
  214 | 
  215 |         body: JSON.stringify({
  216 |           statusCode: 500,
  217 | 
  218 |           message: 'Internal server error',
  219 |         }),
  220 |       });
  221 |     });
  222 | 
  223 |     await page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  224 | 
  225 |     await expect(page.getByText('Integrations unavailable')).toBeVisible();
  226 | 
  227 |     await expect(
  228 |       page.getByRole('button', {
  229 |         name: 'Retry',
  230 |       }),
> 231 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  232 |   });
  233 | 
  234 |   test('shows an empty state when no webhooks are configured', async ({ page }) => {
  235 |     await page.route('**/integrations/webhooks', async (route) => {
  236 |       if (route.request().method() === 'POST') {
  237 |         await route.fallback();
  238 | 
  239 |         return;
  240 |       }
  241 | 
  242 |       await route.fulfill({
  243 |         status: 200,
  244 | 
  245 |         contentType: 'application/json',
  246 | 
  247 |         body: JSON.stringify({
  248 |           canManage: true,
  249 | 
  250 |           eventCatalog: [],
  251 | 
  252 |           items: [],
  253 |         }),
  254 |       });
  255 |     });
  256 | 
  257 |     await page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  258 | 
  259 |     await expect(page.getByText('No integrations configured')).toBeVisible();
  260 | 
  261 |     await expect(page.getByText('Create a webhook to deliver selected Command Center events to another system.')).toBeVisible();
  262 |   });
  263 | 
  264 |   test('shows an inline alert when webhook creation fails', async ({ page }) => {
  265 |     await page.route('**/integrations/webhooks', async (route) => {
  266 |       if (route.request().method() === 'POST') {
  267 |         await route.fulfill({
  268 |           status: 400,
  269 | 
  270 |           contentType: 'application/json',
  271 | 
  272 |           body: JSON.stringify({
  273 |             statusCode: 400,
  274 | 
  275 |             message: 'Private or internal webhook destinations are not allowed.',
  276 |           }),
  277 |         });
  278 | 
  279 |         return;
  280 |       }
  281 | 
  282 |       await route.fulfill({
  283 |         status: 200,
  284 | 
  285 |         contentType: 'application/json',
  286 | 
  287 |         body: JSON.stringify({
  288 |           canManage: true,
  289 | 
  290 |           eventCatalog: [
  291 |             {
  292 |               type: 'DEPLOYMENT_FAILED',
  293 | 
  294 |               label: 'Deployment failed',
  295 | 
  296 |               description: 'A deployment enters the Failed state.',
  297 |             },
  298 |           ],
  299 | 
  300 |           items: [],
  301 |         }),
  302 |       });
  303 |     });
  304 | 
  305 |     await page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  306 | 
  307 |     await page
  308 |       .getByRole('button', {
  309 |         name: 'Create webhook',
  310 |       })
  311 |       .click();
  312 | 
  313 |     await page.getByLabel('Name').fill('Internal target');
  314 | 
  315 |     await page.getByLabel('Endpoint URL').fill('http://127.0.0.1:4000/internal');
  316 | 
  317 |     await page
  318 |       .getByText('Deployment failed', {
  319 |         exact: true,
  320 |       })
  321 |       .click();
  322 | 
  323 |     await page
  324 |       .getByRole('button', {
  325 |         name: 'Create webhook',
  326 |       })
  327 |       .click();
  328 | 
  329 |     await expect(page.getByText('Private or internal webhook destinations are not allowed.')).toBeVisible();
  330 |   });
  331 | 
```