# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase14\analytics-processing.spec.ts >> Phase 14 analytics processing >> shows an inline alert when manual reprocessing fails
- Location: e2e\phase14\analytics-processing.spec.ts:300:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('alert')
Expected: "Reprocessing cannot exceed 31 days."
Error: strict mode violation: getByRole('alert') resolved to 2 elements:
    1) <p role="alert" class="mt-4 text-sm text-red-700">Reprocessing cannot exceed 31 days.</p> aka getByText('Reprocessing cannot exceed 31')
    2) <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div> aka locator('[id="__next-route-announcer__"]')

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for getByRole('alert')

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
          - generic [ref=e102]:
            - navigation "Website sections" [ref=e103]:
              - link "Overview" [ref=e104] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222
              - link "Analytics" [ref=e105] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/analytics
              - link "Analytics engine" [ref=e107] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/analytics-engine
              - link "Events" [ref=e108] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/events
              - link "Installation" [ref=e109] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/installation
              - link "Settings" [ref=e110] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/settings
            - main [ref=e111]:
              - generic [ref=e112]:
                - paragraph [ref=e113]: Analytics processing
                - heading "Processing status" [level=1] [ref=e114]
                - paragraph [ref=e115]: View processing health, queued work, retries and failed batches.
              - generic [ref=e116]:
                - article [ref=e117]:
                  - paragraph [ref=e118]: Pending events
                  - paragraph [ref=e119]: "42"
                - article [ref=e120]:
                  - paragraph [ref=e121]: Failed batches
                  - paragraph [ref=e122]: "1"
                - article [ref=e123]:
                  - paragraph [ref=e124]: Current status
                  - paragraph [ref=e125]: Idle
                - article [ref=e126]:
                  - paragraph [ref=e127]: Last successful run
                  - paragraph [ref=e128]: Aug 2, 2026, 5:01 AM
              - generic [ref=e129]:
                - heading "Manual reprocessing" [level=2] [ref=e130]
                - paragraph [ref=e131]: Rebuild a limited analytics date range. Existing valid data is preserved when the rebuild fails.
                - generic [ref=e132]:
                  - generic [ref=e133]:
                    - text: From
                    - textbox "From" [ref=e134]: 2026-08-06
                  - generic [ref=e135]:
                    - text: To
                    - textbox "To" [ref=e136]: 2026-08-13
                  - button "Reprocess" [ref=e137] [cursor=pointer]
                - alert [ref=e138]: Reprocessing cannot exceed 31 days.
              - generic [ref=e139]:
                - heading "Recent processing runs" [level=2] [ref=e141]
                - paragraph [ref=e142]: No processing runs have been recorded.
```

# Test source

```ts
  227 |         body: JSON.stringify({
  228 |           canReprocess: true,
  229 | 
  230 |           pendingEvents: 0,
  231 | 
  232 |           unresolvedDeadLetters: 0,
  233 | 
  234 |           activeRun: null,
  235 | 
  236 |           latestRun: null,
  237 | 
  238 |           lastSuccessfulRun: null,
  239 | 
  240 |           recentRuns: [],
  241 |         }),
  242 |       });
  243 |     });
  244 | 
  245 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);
  246 | 
  247 |     await expect(page.getByText('No processing runs have been recorded.')).toBeVisible();
  248 |   });
  249 | 
  250 |   test('queues manual reprocessing after the confirmation dialog is accepted', async ({ page }) => {
  251 |     page.once('dialog', (dialog) => {
  252 |       void dialog.accept();
  253 |     });
  254 | 
  255 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);
  256 | 
  257 |     await page
  258 |       .getByRole('button', {
  259 |         name: 'Reprocess',
  260 |       })
  261 |       .click();
  262 | 
  263 |     await expect(page.getByText('Analytics reprocessing was queued.')).toBeVisible();
  264 |   });
  265 | 
  266 |   test('does not queue reprocessing when the confirmation dialog is dismissed', async ({ page }) => {
  267 |     let reprocessCalled = false;
  268 | 
  269 |     await page.route('**/analytics/processing/reprocess', async (route) => {
  270 |       reprocessCalled = true;
  271 | 
  272 |       await route.fulfill({
  273 |         status: 201,
  274 | 
  275 |         contentType: 'application/json',
  276 | 
  277 |         body: JSON.stringify({
  278 |           id: 'queued-run',
  279 | 
  280 |           status: 'QUEUED',
  281 |         }),
  282 |       });
  283 |     });
  284 | 
  285 |     page.once('dialog', (dialog) => {
  286 |       void dialog.dismiss();
  287 |     });
  288 | 
  289 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);
  290 | 
  291 |     await page
  292 |       .getByRole('button', {
  293 |         name: 'Reprocess',
  294 |       })
  295 |       .click();
  296 | 
  297 |     expect(reprocessCalled).toBe(false);
  298 |   });
  299 | 
  300 |   test('shows an inline alert when manual reprocessing fails', async ({ page }) => {
  301 |     await page.route('**/analytics/processing/reprocess', async (route) => {
  302 |       await route.fulfill({
  303 |         status: 400,
  304 | 
  305 |         contentType: 'application/json',
  306 | 
  307 |         body: JSON.stringify({
  308 |           statusCode: 400,
  309 | 
  310 |           message: 'Reprocessing cannot exceed 31 days.',
  311 |         }),
  312 |       });
  313 |     });
  314 | 
  315 |     page.once('dialog', (dialog) => {
  316 |       void dialog.accept();
  317 |     });
  318 | 
  319 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);
  320 | 
  321 |     await page
  322 |       .getByRole('button', {
  323 |         name: 'Reprocess',
  324 |       })
  325 |       .click();
  326 | 
> 327 |     await expect(page.getByRole('alert')).toHaveText('Reprocessing cannot exceed 31 days.');
      |                                           ^ Error: expect(locator).toHaveText(expected) failed
  328 |   });
  329 | 
  330 |   test('shows a dead-lettered run with a Retry action and its error message', async ({ page }) => {
  331 |     await page.route('**/analytics/processing/status', async (route) => {
  332 |       await route.fulfill({
  333 |         status: 200,
  334 | 
  335 |         contentType: 'application/json',
  336 | 
  337 |         body: JSON.stringify({
  338 |           canReprocess: true,
  339 | 
  340 |           pendingEvents: 0,
  341 | 
  342 |           unresolvedDeadLetters: 1,
  343 | 
  344 |           activeRun: null,
  345 | 
  346 |           latestRun: null,
  347 | 
  348 |           lastSuccessfulRun: null,
  349 | 
  350 |           recentRuns: [
  351 |             {
  352 |               id: 'run-dead-letter',
  353 | 
  354 |               status: 'DEAD_LETTERED',
  355 | 
  356 |               trigger: 'MANUAL',
  357 | 
  358 |               rangeStart: '2026-08-01T00:00:00.000Z',
  359 | 
  360 |               rangeEnd: '2026-08-02T00:00:00.000Z',
  361 | 
  362 |               retryCount: 3,
  363 | 
  364 |               maxRetries: 3,
  365 | 
  366 |               processedEvents: 0,
  367 | 
  368 |               failedEvents: 12,
  369 | 
  370 |               errorMessage: 'Method not implemented.',
  371 | 
  372 |               startedAt: '2026-08-02T01:00:00.000Z',
  373 | 
  374 |               finishedAt: '2026-08-02T01:01:00.000Z',
  375 | 
  376 |               createdAt: '2026-08-02T01:00:00.000Z',
  377 |             },
  378 |           ],
  379 |         }),
  380 |       });
  381 |     });
  382 | 
  383 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);
  384 | 
  385 |     await expect(
  386 |       page.getByText('Method not implemented.', {
  387 |         exact: true,
  388 |       }),
  389 |     ).toBeVisible();
  390 | 
  391 |     await expect(
  392 |       page.getByRole('button', {
  393 |         name: 'Retry',
  394 |       }),
  395 |     ).toBeVisible();
  396 |   });
  397 | 
  398 |   test('retries a dead-lettered run after the confirmation dialog is accepted', async ({ page }) => {
  399 |     await page.route('**/analytics/processing/status', async (route) => {
  400 |       await route.fulfill({
  401 |         status: 200,
  402 | 
  403 |         contentType: 'application/json',
  404 | 
  405 |         body: JSON.stringify({
  406 |           canReprocess: true,
  407 | 
  408 |           pendingEvents: 0,
  409 | 
  410 |           unresolvedDeadLetters: 1,
  411 | 
  412 |           activeRun: null,
  413 | 
  414 |           latestRun: null,
  415 | 
  416 |           lastSuccessfulRun: null,
  417 | 
  418 |           recentRuns: [
  419 |             {
  420 |               id: 'run-dead-letter',
  421 | 
  422 |               status: 'DEAD_LETTERED',
  423 | 
  424 |               trigger: 'MANUAL',
  425 | 
  426 |               rangeStart: '2026-08-01T00:00:00.000Z',
  427 | 
```