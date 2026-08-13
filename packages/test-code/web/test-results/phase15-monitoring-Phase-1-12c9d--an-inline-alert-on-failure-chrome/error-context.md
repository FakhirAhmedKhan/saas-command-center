# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase15\monitoring.spec.ts >> Phase 15 monitoring >> toggles a health check via "Disable", then shows an inline alert on failure
- Location: e2e\phase15\monitoring.spec.ts:408:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('alert')
Expected: "Unable to disable this health check right now."
Error: strict mode violation: getByRole('alert') resolved to 2 elements:
    1) <div role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Unable to disable this health check right now.</div> aka getByText('Unable to disable this health')
    2) <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div> aka locator('[id="__next-route-announcer__"]')

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for getByRole('alert')

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - link "Create workspace" [ref=e21] [cursor=pointer]:
            - /url: /workspaces/new
          - navigation "Primary" [ref=e23]:
            - link "Overview" [ref=e24] [cursor=pointer]:
              - /url: /dashboard
            - generic [ref=e30]:
              - paragraph [ref=e31]: Workspace
              - generic [ref=e32]:
                - link "Overview" [ref=e33] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111
                - link "Applications" [ref=e38] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications
                - link "Websites" [ref=e49] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites
                - link "Activity" [ref=e55] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/activity
            - generic [ref=e58]:
              - paragraph [ref=e59]: Operations
              - generic [ref=e60]:
                - link "Monitoring" [ref=e61] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/monitoring
                - link "Repositories" [ref=e68] [cursor=pointer]:
                  - /url: /workspaces/11111111-1111-4111-8111-111111111111/repositories
            - generic [ref=e73]:
              - paragraph [ref=e74]: Configuration
              - link "Settings" [ref=e76] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings
          - generic [ref=e80]:
            - generic [ref=e81]: A
            - generic [ref=e82]:
              - paragraph [ref=e83]: Account owner
              - paragraph [ref=e84]: admin@example.com
            - button "Sign out" [ref=e85] [cursor=pointer]
      - generic [ref=e89]:
        - banner [ref=e90]:
          - button "Search applications, websites… Ctrl K" [disabled] [ref=e92] [cursor=pointer]:
            - generic [ref=e96]: Search applications, websites…
            - generic [ref=e97]: Ctrl K
          - link "Notifications, 0 unread" [ref=e99] [cursor=pointer]:
            - /url: /notifications
            - generic [ref=e100]: 🔔
        - main [ref=e101]:
          - main [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e104]:
                - heading "Monitoring" [level=1] [ref=e105]
                - paragraph [ref=e106]: Application and website availability, response times and incidents.
              - button "Add health check" [ref=e107] [cursor=pointer]
            - generic [ref=e108]:
              - article [ref=e109]:
                - paragraph [ref=e110]: Total
                - paragraph [ref=e111]: "3"
              - article [ref=e112]:
                - paragraph [ref=e113]: Healthy
                - paragraph [ref=e114]: "1"
              - article [ref=e115]:
                - paragraph [ref=e116]: Degraded
                - paragraph [ref=e117]: "1"
              - article [ref=e118]:
                - paragraph [ref=e119]: Down
                - paragraph [ref=e120]: "1"
              - article [ref=e121]:
                - paragraph [ref=e122]: Unknown
                - paragraph [ref=e123]: "0"
              - article [ref=e124]:
                - paragraph [ref=e125]: Disabled
                - paragraph [ref=e126]: "0"
              - article [ref=e127]:
                - paragraph [ref=e128]: Incidents
                - paragraph [ref=e129]: "1"
            - alert [ref=e130]: Unable to disable this health check right now.
            - generic [ref=e132]:
              - generic [ref=e133]:
                - text: Status
                - combobox "Status" [ref=e134] [cursor=pointer]:
                  - option "All statuses" [selected]
                  - option "Healthy"
                  - option "Degraded"
                  - option "Down"
                  - option "Unknown"
                  - option "Disabled"
              - generic [ref=e135]:
                - text: Target type
                - combobox "Target type" [ref=e136] [cursor=pointer]:
                  - option "All targets" [selected]
                  - option "Applications"
                  - option "Websites"
            - article [ref=e138]:
              - generic [ref=e139]:
                - generic [ref=e140]:
                  - paragraph [ref=e141]: APPLICATION Â· Demo API
                  - heading "Production API" [level=2] [ref=e142]
                  - paragraph [ref=e143]: https://example.com/health
                - generic [ref=e144]: Healthy
              - generic [ref=e145]:
                - generic [ref=e146]:
                  - term [ref=e147]: Response
                  - definition [ref=e148]: 120ms
                - generic [ref=e149]:
                  - term [ref=e150]: HTTP status
                  - definition [ref=e151]: "200"
                - generic [ref=e152]:
                  - term [ref=e153]: Last checked
                  - definition [ref=e154]: Aug 7, 2026, 5:00 AM
                - generic [ref=e155]:
                  - term [ref=e156]: Failures
                  - definition [ref=e157]: 0/3
              - generic [ref=e158]:
                - button "History" [ref=e159] [cursor=pointer]
                - button "Run now" [ref=e160] [cursor=pointer]
                - button "Edit" [ref=e161] [cursor=pointer]
                - button "Disable" [active] [ref=e162] [cursor=pointer]
            - generic [ref=e163]:
              - heading "Incident timeline" [level=2] [ref=e165]
              - article [ref=e167]:
                - generic [ref=e168]:
                  - generic [ref=e169]:
                    - paragraph [ref=e170]: Website
                    - paragraph [ref=e171]: Public Website
                  - generic [ref=e172]: OPEN
                - paragraph [ref=e173]: Website returned HTTP 500.
                - generic [ref=e174]:
                  - generic [ref=e175]: "Started: Aug 7, 2026, 4:10 AM"
                  - generic [ref=e176]: "Failures: 3"
```

# Test source

```ts
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
  432 |       .getByRole('button', {
  433 |         name: 'Disable',
  434 |       })
  435 |       .click();
  436 | 
> 437 |     await expect(page.getByRole('alert')).toHaveText('Unable to disable this health check right now.');
      |                                           ^ Error: expect(locator).toHaveText(expected) failed
  438 |   });
  439 | 
  440 |   test('opens the health-check history view', async ({ page }) => {
  441 |     await page.route('**/monitoring/checks/55555555-5555-4555-8555-555555555555/history', async (route) => {
  442 |       await route.fulfill({
  443 |         status: 200,
  444 | 
  445 |         contentType: 'application/json',
  446 | 
  447 |         body: JSON.stringify([
  448 |           {
  449 |             id: 'history-1',
  450 | 
  451 |             status: 'HEALTHY',
  452 | 
  453 |             statusCode: 200,
  454 | 
  455 |             responseTimeMs: 118,
  456 | 
  457 |             failureReason: null,
  458 | 
  459 |             checkedAt: '2026-08-07T01:00:00.000Z',
  460 |           },
  461 |         ]),
  462 |       });
  463 |     });
  464 | 
  465 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  466 | 
  467 |     await page
  468 |       .getByRole('button', {
  469 |         name: 'History',
  470 |       })
  471 |       .click();
  472 | 
  473 |     await expect(
  474 |       page.getByRole('heading', {
  475 |         name: 'Production API history',
  476 |       }),
  477 |     ).toBeVisible();
  478 | 
  479 |     await expect(
  480 |       page.getByText('118ms', {
  481 |         exact: true,
  482 |       }),
  483 |     ).toBeVisible();
  484 |   });
  485 | });
  486 | 
```