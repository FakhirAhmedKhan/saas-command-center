# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase18\webhook-integrations.spec.ts >> Phase 18 webhook integrations >> shows an inline alert when webhook creation fails
- Location: e2e\phase18\webhook-integrations.spec.ts:264:7

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Create webhook' }) resolved to 2 elements:
    1) <button type="button" class="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">Create webhook</button> aka locator('header').filter({ hasText: 'Workspace' }).getByRole('button')
    2) <button type="submit" class="mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Create webhook</button> aka locator('form').getByRole('button', { name: 'Create webhook' })

Call log:
  - waiting for getByRole('button', { name: 'Create webhook' })

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
            - generic [ref=e103]:
              - heading "Settings" [level=1] [ref=e104]
              - paragraph [ref=e105]: Manage workspace information, members and integrations.
            - navigation "Workspace settings sections" [ref=e106]:
              - link "General" [ref=e107] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings
              - link "Members" [ref=e108] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings/members
              - link "Integrations" [ref=e109] [cursor=pointer]:
                - /url: /workspaces/11111111-1111-4111-8111-111111111111/settings/integrations
            - main [ref=e111]:
              - generic [ref=e112]:
                - generic [ref=e113]:
                  - paragraph [ref=e114]: Workspace settings
                  - heading "Integrations" [level=1] [ref=e115]
                  - paragraph [ref=e116]: Send selected operational events to external systems through signed webhooks.
                - button "Create webhook" [ref=e117] [cursor=pointer]
              - generic [ref=e118]:
                - generic [ref=e119]:
                  - generic [ref=e120]:
                    - heading "Create webhook" [level=2] [ref=e121]
                    - paragraph [ref=e122]: Webhooks are signed with HMAC SHA-256. Redirects and private network destinations are blocked.
                  - button "Cancel" [ref=e123] [cursor=pointer]
                - generic [ref=e124]:
                  - generic [ref=e125]:
                    - text: Name
                    - textbox "Name" [ref=e126]:
                      - /placeholder: Production automation
                      - text: Internal target
                  - generic [ref=e127]:
                    - text: Endpoint URL
                    - textbox "Endpoint URL" [ref=e128]:
                      - /placeholder: https://automation.example.com/webhooks/command-center
                      - text: http://127.0.0.1:4000/internal
                  - generic [ref=e129]:
                    - text: Timeout
                    - combobox "Timeout" [ref=e130] [cursor=pointer]:
                      - option "5 seconds"
                      - option "10 seconds" [selected]
                      - option "15 seconds"
                      - option "30 seconds"
                  - generic [ref=e131]:
                    - text: Maximum attempts
                    - combobox "Maximum attempts" [ref=e132] [cursor=pointer]:
                      - option "1"
                      - option "2"
                      - option "3"
                      - option "4"
                      - option "5" [selected]
                      - option "6"
                      - option "7"
                      - option "8"
                - group "Event subscriptions" [ref=e133]:
                  - generic [ref=e136] [cursor=pointer]:
                    - checkbox "Deployment failed A deployment enters the Failed state." [checked] [active] [ref=e137]
                    - generic [ref=e138]:
                      - generic [ref=e139]: Deployment failed
                      - generic [ref=e140]: A deployment enters the Failed state.
                - generic [ref=e141]:
                  - checkbox "Enable webhook" [checked] [ref=e142]
                  - text: Enable webhook
                - button "Create webhook" [ref=e143] [cursor=pointer]
              - generic [ref=e144]:
                - heading "Signature verification" [level=2] [ref=e145]
                - paragraph [ref=e146]:
                  - text: Calculate HMAC SHA-256 from
                  - code [ref=e147]: timestamp.rawBody
                  - text: and compare it to the
                  - code [ref=e148]: X-Command-Center-Signature
                  - text: header.
                - generic [ref=e149]: const signed = timestamp + "." + rawBody; const digest = createHmac("sha256", secret) .update(signed) .digest("hex"); const expected = "v1=" + digest;
              - generic [ref=e150]:
                - heading "No integrations configured" [level=3] [ref=e152]
                - paragraph [ref=e153]: Create a webhook to deliver selected Command Center events to another system.
```

# Test source

```ts
  227 |     await expect(
  228 |       page.getByRole('button', {
  229 |         name: 'Retry',
  230 |       }),
  231 |     ).toBeVisible();
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
> 327 |       .click();
      |        ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Create webhook' }) resolved to 2 elements:
  328 | 
  329 |     await expect(page.getByText('Private or internal webhook destinations are not allowed.')).toBeVisible();
  330 |   });
  331 | 
  332 |   test('rotates a webhook secret after the confirmation dialog is accepted', async ({ page }) => {
  333 |     await page.route('**/integrations/webhooks', async (route) => {
  334 |       if (route.request().method() === 'POST') {
  335 |         await route.fallback();
  336 | 
  337 |         return;
  338 |       }
  339 | 
  340 |       await route.fulfill({
  341 |         status: 200,
  342 | 
  343 |         contentType: 'application/json',
  344 | 
  345 |         body: JSON.stringify({
  346 |           canManage: true,
  347 | 
  348 |           eventCatalog: [],
  349 | 
  350 |           items: [
  351 |             {
  352 |               id: 'webhook-1',
  353 | 
  354 |               workspaceId,
  355 | 
  356 |               name: 'Production automation',
  357 | 
  358 |               url: 'https://automation.example.com/webhook',
  359 | 
  360 |               eventTypes: ['DEPLOYMENT_FAILED'],
  361 | 
  362 |               payloadVersion: '2026-08-01',
  363 | 
  364 |               timeoutMs: 10000,
  365 | 
  366 |               maxAttempts: 5,
  367 | 
  368 |               enabled: true,
  369 | 
  370 |               secretConfigured: true,
  371 | 
  372 |               lastDeliveryAt: null,
  373 | 
  374 |               lastSuccessAt: null,
  375 | 
  376 |               lastFailureAt: null,
  377 | 
  378 |               createdAt: '2026-08-07T00:00:00.000Z',
  379 | 
  380 |               updatedAt: '2026-08-07T00:00:00.000Z',
  381 | 
  382 |               deliveryCount: 0,
  383 | 
  384 |               latestDelivery: null,
  385 |             },
  386 |           ],
  387 |         }),
  388 |       });
  389 |     });
  390 | 
  391 |     let rotateCalled = false;
  392 | 
  393 |     await page.route('**/integrations/webhooks/webhook-1/rotate-secret', async (route) => {
  394 |       rotateCalled = true;
  395 | 
  396 |       await route.fulfill({
  397 |         status: 201,
  398 | 
  399 |         contentType: 'application/json',
  400 | 
  401 |         body: JSON.stringify({
  402 |           secret: 'rotated-webhook-secret',
  403 |         }),
  404 |       });
  405 |     });
  406 | 
  407 |     page.once('dialog', (dialog) => {
  408 |       void dialog.accept();
  409 |     });
  410 | 
  411 |     await page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  412 | 
  413 |     await page
  414 |       .getByRole('button', {
  415 |         name: 'Rotate secret',
  416 |       })
  417 |       .click();
  418 | 
  419 |     expect(rotateCalled).toBe(true);
  420 | 
  421 |     await expect(page.locator('input[value="rotated-webhook-secret"]')).toBeVisible();
  422 |   });
  423 | 
  424 |   test('does not rotate a webhook secret when the confirmation dialog is dismissed', async ({ page }) => {
  425 |     await page.route('**/integrations/webhooks', async (route) => {
  426 |       if (route.request().method() === 'POST') {
  427 |         await route.fallback();
```