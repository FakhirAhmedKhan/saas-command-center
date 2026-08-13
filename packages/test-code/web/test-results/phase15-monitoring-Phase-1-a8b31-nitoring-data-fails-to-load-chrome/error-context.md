# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase15\monitoring.spec.ts >> Phase 15 monitoring >> shows an error state with a retry action when monitoring data fails to load
- Location: e2e\phase15\monitoring.spec.ts:308:7

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
  - alert:
    - heading "Monitoring unavailable" [level=2]
    - paragraph: Internal server error
    - button "Try again"
```

# Test source

```ts
  231 |         body: JSON.stringify({
  232 |           canManage: false,
  233 | 
  234 |           total: 1,
  235 | 
  236 |           healthy: 1,
  237 | 
  238 |           degraded: 0,
  239 | 
  240 |           down: 0,
  241 | 
  242 |           unknown: 0,
  243 | 
  244 |           disabled: 0,
  245 | 
  246 |           activeIncidents: 0,
  247 |         }),
  248 |       });
  249 |     });
  250 | 
  251 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  252 | 
  253 |     await expect(
  254 |       page.getByRole('button', {
  255 |         name: 'Add health check',
  256 |       }),
  257 |     ).toHaveCount(0);
  258 | 
  259 |     await expect(
  260 |       page.getByRole('button', {
  261 |         name: 'Edit',
  262 |       }),
  263 |     ).toHaveCount(0);
  264 |   });
  265 | 
  266 |   test('shows a loading skeleton before monitoring data arrives', async ({ page }) => {
  267 |     let resolveRoute: (() => void) | undefined;
  268 | 
  269 |     await page.route('**/monitoring/summary', async (route) => {
  270 |       await new Promise<void>((resolve) => {
  271 |         resolveRoute = resolve;
  272 |       });
  273 | 
  274 |       await route.fulfill({
  275 |         status: 200,
  276 | 
  277 |         contentType: 'application/json',
  278 | 
  279 |         body: JSON.stringify({
  280 |           canManage: true,
  281 | 
  282 |           total: 0,
  283 | 
  284 |           healthy: 0,
  285 | 
  286 |           degraded: 0,
  287 | 
  288 |           down: 0,
  289 | 
  290 |           unknown: 0,
  291 | 
  292 |           disabled: 0,
  293 | 
  294 |           activeIncidents: 0,
  295 |         }),
  296 |       });
  297 |     });
  298 | 
  299 |     const navigation = page.goto(`/workspaces/${workspaceId}/monitoring`);
  300 | 
  301 |     await expect(page.locator('.animate-pulse').first()).toBeVisible();
  302 | 
  303 |     resolveRoute?.();
  304 | 
  305 |     await navigation;
  306 |   });
  307 | 
  308 |   test('shows an error state with a retry action when monitoring data fails to load', async ({ page }) => {
  309 |     await page.route('**/monitoring/summary', async (route) => {
  310 |       await route.fulfill({
  311 |         status: 500,
  312 | 
  313 |         contentType: 'application/json',
  314 | 
  315 |         body: JSON.stringify({
  316 |           statusCode: 500,
  317 | 
  318 |           message: 'Internal server error',
  319 |         }),
  320 |       });
  321 |     });
  322 | 
  323 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  324 | 
  325 |     await expect(page.getByText('Monitoring unavailable')).toBeVisible();
  326 | 
  327 |     await expect(
  328 |       page.getByRole('button', {
  329 |         name: 'Retry',
  330 |       }),
> 331 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  332 |   });
  333 | 
  334 |   test('shows an empty state when no health checks are configured', async ({ page }) => {
  335 |     await page.route('**/monitoring/checks', async (route) => {
  336 |       await route.fulfill({
  337 |         status: 200,
  338 | 
  339 |         contentType: 'application/json',
  340 | 
  341 |         body: JSON.stringify([]),
  342 |       });
  343 |     });
  344 | 
  345 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  346 | 
  347 |     await expect(page.getByText('Monitoring is not configured')).toBeVisible();
  348 | 
  349 |     await expect(page.getByText('Add a health check to begin tracking application or website availability.')).toBeVisible();
  350 |   });
  351 | 
  352 |   test('shows an empty state for the incident timeline when there are no incidents', async ({ page }) => {
  353 |     await page.route('**/monitoring/incidents', async (route) => {
  354 |       await route.fulfill({
  355 |         status: 200,
  356 | 
  357 |         contentType: 'application/json',
  358 | 
  359 |         body: JSON.stringify([]),
  360 |       });
  361 |     });
  362 | 
  363 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  364 | 
  365 |     await expect(page.getByText('No monitoring incidents have been recorded.')).toBeVisible();
  366 |   });
  367 | 
  368 |   test('runs a health check immediately via "Run now"', async ({ page }) => {
  369 |     let runCalled = false;
  370 | 
  371 |     await page.route('**/monitoring/checks/55555555-5555-4555-8555-555555555555/run', async (route) => {
  372 |       runCalled = true;
  373 | 
  374 |       await route.fulfill({
  375 |         status: 201,
  376 | 
  377 |         contentType: 'application/json',
  378 | 
  379 |         body: JSON.stringify({
  380 |           healthCheckId: '55555555-5555-4555-8555-555555555555',
  381 | 
  382 |           status: 'HEALTHY',
  383 | 
  384 |           statusCode: 200,
  385 | 
  386 |           responseTimeMs: 120,
  387 | 
  388 |           failureReason: null,
  389 | 
  390 |           consecutiveFailures: 0,
  391 | 
  392 |           nextRunAt: '2026-08-07T01:10:00.000Z',
  393 |         }),
  394 |       });
  395 |     });
  396 | 
  397 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  398 | 
  399 |     await page
  400 |       .getByRole('button', {
  401 |         name: 'Run now',
  402 |       })
  403 |       .click();
  404 | 
  405 |     expect(runCalled).toBe(true);
  406 |   });
  407 | 
  408 |   test('toggles a health check via "Disable", then shows an inline alert on failure', async ({ page }) => {
  409 |     await page.route('**/monitoring/checks/55555555-5555-4555-8555-555555555555', async (route) => {
  410 |       if (route.request().method() === 'PATCH') {
  411 |         await route.fulfill({
  412 |           status: 400,
  413 | 
  414 |           contentType: 'application/json',
  415 | 
  416 |           body: JSON.stringify({
  417 |             statusCode: 400,
  418 | 
  419 |             message: 'Unable to disable this health check right now.',
  420 |           }),
  421 |         });
  422 | 
  423 |         return;
  424 |       }
  425 | 
  426 |       await route.fallback();
  427 |     });
  428 | 
  429 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  430 | 
  431 |     await page
```