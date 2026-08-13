# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase16\releases-deployments.spec.ts >> Phase 16 releases and deployments >> transitions a deployment forward after the confirmation dialog is accepted
- Location: e2e\phase16\releases-deployments.spec.ts:407:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
          - generic [ref=e102]:
            - navigation "Application sections" [ref=e103]:
              - link "Overview" [ref=e104] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/22222222-2222-4222-8222-222222222222
              - link "Development" [ref=e105] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/22222222-2222-4222-8222-222222222222/development
              - link "Releases" [ref=e106] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/22222222-2222-4222-8222-222222222222/releases
              - link "Settings" [ref=e108] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/applications/22222222-2222-4222-8222-222222222222/settings
            - main [ref=e109]:
              - generic [ref=e110]:
                - generic [ref=e111]:
                  - paragraph [ref=e112]: Application operations
                  - heading "Releases and deployments" [level=1] [ref=e113]
                  - paragraph [ref=e114]: Track which version is running in each environment.
                - generic [ref=e115]:
                  - button "New release" [ref=e116] [cursor=pointer]
                  - button "New deployment" [ref=e117] [cursor=pointer]
              - alert [ref=e118]: No earlier successful deployment exists for this environment.
              - generic [ref=e119]:
                - heading "Current versions" [level=2] [ref=e120]
                - article [ref=e122]:
                  - paragraph [ref=e123]: Production
                  - paragraph [ref=e124]: 1.3.0
                  - generic [ref=e125]: SUCCESSFUL
                  - paragraph [ref=e127]: Aug 6, 2026, 2:00 PM
                  - link "Open environment" [ref=e128] [cursor=pointer]:
                    - /url: https://example.com
              - generic [ref=e130]:
                - generic [ref=e131]:
                  - text: Environment
                  - combobox "Environment" [ref=e132] [cursor=pointer]:
                    - option "All environments" [selected]
                    - option "Production"
                - generic [ref=e133]:
                  - text: Status
                  - combobox "Status" [ref=e134] [cursor=pointer]:
                    - option "All statuses" [selected]
                    - option "DRAFT"
                    - option "SCHEDULED"
                    - option "IN_PROGRESS"
                    - option "SUCCESSFUL"
                    - option "FAILED"
                    - option "ROLLED_BACK"
              - generic [ref=e135]:
                - heading "Deployment timeline" [level=2] [ref=e136]
                - article [ref=e137]:
                  - generic [ref=e138]:
                    - generic [ref=e139]:
                      - generic [ref=e140]:
                        - heading "1.3.0" [level=3] [ref=e141]
                        - generic [ref=e142]: SUCCESSFUL
                        - generic [ref=e143]: Attempt 1
                      - paragraph [ref=e144]: Production
                      - paragraph [ref=e145]: Changed Aug 6, 2026, 2:00 PM
                    - button "Mark ROLLED BACK" [active] [ref=e147] [cursor=pointer]
                  - generic [ref=e148]:
                    - generic [ref=e149]:
                      - term [ref=e150]: Commit
                      - definition [ref=e151]: abc123
                    - generic [ref=e152]:
                      - term [ref=e153]: Duration
                      - definition [ref=e154]: 5m 0s
                    - generic [ref=e155]:
                      - term [ref=e156]: Started
                      - definition [ref=e157]: Aug 6, 2026, 1:55 PM
                    - generic [ref=e158]:
                      - term [ref=e159]: Finished
                      - definition [ref=e160]: Aug 6, 2026, 2:00 PM
                  - generic [ref=e161]:
                    - paragraph [ref=e162]: Release notes
                    - paragraph [ref=e163]: Stable release.
                  - link "Live environment" [ref=e165] [cursor=pointer]:
                    - /url: https://example.com
```

# Test source

```ts
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
> 442 |     expect(transitionCalled).toBe(true);
      |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  443 |   });
  444 | 
  445 |   test('does not transition a deployment when the confirmation dialog is dismissed', async ({ page }) => {
  446 |     let transitionCalled = false;
  447 | 
  448 |     await page.route('**/deployments/deployment-1/transition', async (route) => {
  449 |       transitionCalled = true;
  450 | 
  451 |       await route.fulfill({
  452 |         status: 201,
  453 | 
  454 |         contentType: 'application/json',
  455 | 
  456 |         body: JSON.stringify({}),
  457 |       });
  458 |     });
  459 | 
  460 |     page.once('dialog', (dialog) => {
  461 |       void dialog.dismiss();
  462 |     });
  463 | 
  464 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  465 | 
  466 |     await page
  467 |       .getByRole('button', {
  468 |         name: 'Mark ROLLED BACK',
  469 |       })
  470 |       .click();
  471 | 
  472 |     expect(transitionCalled).toBe(false);
  473 |   });
  474 | 
  475 |   test('shows an inline alert when a deployment transition fails', async ({ page }) => {
  476 |     await page.route('**/deployments/deployment-1/transition', async (route) => {
  477 |       await route.fulfill({
  478 |         status: 400,
  479 | 
  480 |         contentType: 'application/json',
  481 | 
  482 |         body: JSON.stringify({
  483 |           statusCode: 400,
  484 | 
  485 |           message: 'Rollback target must be a successful deployment.',
  486 |         }),
  487 |       });
  488 |     });
  489 | 
  490 |     page.once('dialog', (dialog) => {
  491 |       void dialog.accept();
  492 |     });
  493 | 
  494 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  495 | 
  496 |     await page
  497 |       .getByRole('button', {
  498 |         name: 'Mark ROLLED BACK',
  499 |       })
  500 |       .click();
  501 | 
  502 |     await expect(page.getByRole('alert')).toHaveText('Rollback target must be a successful deployment.');
  503 |   });
  504 | 
  505 |   test('filters deployments by status', async ({ page }) => {
  506 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  507 | 
  508 |     await page.getByLabel('Status').selectOption('SUCCESSFUL');
  509 | 
  510 |     await expect(
  511 |       page
  512 |         .getByText('1.3.0', {
  513 |           exact: true,
  514 |         })
  515 |         .first(),
  516 |     ).toBeVisible();
  517 |   });
  518 | 
  519 |   test('opens an external live URL link for a deployed environment', async ({ page }) => {
  520 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  521 | 
  522 |     const link = page.getByRole('link', {
  523 |       name: 'Open environment',
  524 |     });
  525 | 
  526 |     await expect(link).toBeVisible();
  527 |     await expect(link).toHaveAttribute('href', 'https://example.com');
  528 |     await expect(link).toHaveAttribute('target', '_blank');
  529 |   });
  530 | });
  531 | 
```