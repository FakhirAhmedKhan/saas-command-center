# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase16\releases-deployments.spec.ts >> Phase 16 releases and deployments >> shows an error state with a retry action when release data fails to load
- Location: e2e\phase16\releases-deployments.spec.ts:318:7

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
  - navigation "Application sections":
    - link "Overview":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/22222222-2222-4222-8222-222222222222
    - link "Development":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/22222222-2222-4222-8222-222222222222/development
    - link "Releases":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/22222222-2222-4222-8222-222222222222/releases
    - link "Settings":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/22222222-2222-4222-8222-222222222222/settings
  - alert:
    - heading "Release tracking unavailable" [level=2]
    - paragraph: Internal server error
    - button "Try again"
```

# Test source

```ts
  241 | 
  242 |   test('opens the release creation form', async ({ page }) => {
  243 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  244 | 
  245 |     await page
  246 |       .getByRole('button', {
  247 |         name: 'New release',
  248 |       })
  249 |       .click();
  250 | 
  251 |     await expect(
  252 |       page.getByRole('heading', {
  253 |         name: 'Create release',
  254 |       }),
  255 |     ).toBeVisible();
  256 | 
  257 |     await expect(page.getByLabel('Version')).toBeVisible();
  258 |   });
  259 | 
  260 |   test('hides write controls from viewers', async ({ page }) => {
  261 |     await page.route('**/deployments/options', async (route) => {
  262 |       await route.fulfill({
  263 |         status: 200,
  264 | 
  265 |         contentType: 'application/json',
  266 | 
  267 |         body: JSON.stringify({
  268 |           canManage: false,
  269 | 
  270 |           environments: [],
  271 | 
  272 |           openIncidents: [],
  273 |         }),
  274 |       });
  275 |     });
  276 | 
  277 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  278 | 
  279 |     await expect(
  280 |       page.getByRole('button', {
  281 |         name: 'New release',
  282 |       }),
  283 |     ).toHaveCount(0);
  284 |   });
  285 | 
  286 |   test('shows a loading skeleton before release data arrives', async ({ page }) => {
  287 |     let resolveRoute: (() => void) | undefined;
  288 | 
  289 |     await page.route('**/deployments/options', async (route) => {
  290 |       await new Promise<void>((resolve) => {
  291 |         resolveRoute = resolve;
  292 |       });
  293 | 
  294 |       await route.fulfill({
  295 |         status: 200,
  296 | 
  297 |         contentType: 'application/json',
  298 | 
  299 |         body: JSON.stringify({
  300 |           canManage: true,
  301 | 
  302 |           environments: [],
  303 | 
  304 |           openIncidents: [],
  305 |         }),
  306 |       });
  307 |     });
  308 | 
  309 |     const navigation = page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  310 | 
  311 |     await expect(page.locator('.animate-pulse').first()).toBeVisible();
  312 | 
  313 |     resolveRoute?.();
  314 | 
  315 |     await navigation;
  316 |   });
  317 | 
  318 |   test('shows an error state with a retry action when release data fails to load', async ({ page }) => {
  319 |     await page.route('**/deployments/options', async (route) => {
  320 |       await route.fulfill({
  321 |         status: 500,
  322 | 
  323 |         contentType: 'application/json',
  324 | 
  325 |         body: JSON.stringify({
  326 |           statusCode: 500,
  327 | 
  328 |           message: 'Internal server error',
  329 |         }),
  330 |       });
  331 |     });
  332 | 
  333 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  334 | 
  335 |     await expect(page.getByText('Release tracking unavailable')).toBeVisible();
  336 | 
  337 |     await expect(
  338 |       page.getByRole('button', {
  339 |         name: 'Retry',
  340 |       }),
> 341 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  342 |   });
  343 | 
  344 |   test('shows an empty state when no environments are configured', async ({ page }) => {
  345 |     await page.route('**/deployments/options', async (route) => {
  346 |       await route.fulfill({
  347 |         status: 200,
  348 | 
  349 |         contentType: 'application/json',
  350 | 
  351 |         body: JSON.stringify({
  352 |           canManage: true,
  353 | 
  354 |           environments: [],
  355 | 
  356 |           openIncidents: [],
  357 |         }),
  358 |       });
  359 |     });
  360 | 
  361 |     await page.route('**/deployments/current', async (route) => {
  362 |       await route.fulfill({
  363 |         status: 200,
  364 | 
  365 |         contentType: 'application/json',
  366 | 
  367 |         body: JSON.stringify([]),
  368 |       });
  369 |     });
  370 | 
  371 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  372 | 
  373 |     await expect(page.getByText('No environments')).toBeVisible();
  374 | 
  375 |     await expect(page.getByText('Create an application environment before recording deployments.')).toBeVisible();
  376 |   });
  377 | 
  378 |   test('shows an empty state when no deployments exist', async ({ page }) => {
  379 |     await page.route('**/deployments?*', async (route) => {
  380 |       await route.fulfill({
  381 |         status: 200,
  382 | 
  383 |         contentType: 'application/json',
  384 | 
  385 |         body: JSON.stringify({
  386 |           items: [],
  387 | 
  388 |           pagination: {
  389 |             page: 1,
  390 |             limit: 100,
  391 |             total: 0,
  392 |             totalPages: 1,
  393 |             hasPreviousPage: false,
  394 |             hasNextPage: false,
  395 |           },
  396 |         }),
  397 |       });
  398 |     });
  399 | 
  400 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  401 | 
  402 |     await expect(page.getByText('No deployments')).toBeVisible();
  403 | 
  404 |     await expect(page.getByText('Create a release and record its first deployment.')).toBeVisible();
  405 |   });
  406 | 
  407 |   test('transitions a deployment forward after the confirmation dialog is accepted', async ({ page }) => {
  408 |     let transitionCalled = false;
  409 | 
  410 |     await page.route('**/deployments/deployment-1/transition', async (route) => {
  411 |       transitionCalled = true;
  412 | 
  413 |       const requestBody = route.request().postDataJSON() as { status: string };
  414 | 
  415 |       expect(requestBody.status).toBe('ROLLED_BACK');
  416 | 
  417 |       await route.fulfill({
  418 |         status: 201,
  419 | 
  420 |         contentType: 'application/json',
  421 | 
  422 |         body: JSON.stringify({
  423 |           id: 'deployment-1',
  424 | 
  425 |           status: 'ROLLED_BACK',
  426 |         }),
  427 |       });
  428 |     });
  429 | 
  430 |     page.once('dialog', (dialog) => {
  431 |       void dialog.accept();
  432 |     });
  433 | 
  434 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  435 | 
  436 |     await page
  437 |       .getByRole('button', {
  438 |         name: 'Mark ROLLED BACK',
  439 |       })
  440 |       .click();
  441 | 
```