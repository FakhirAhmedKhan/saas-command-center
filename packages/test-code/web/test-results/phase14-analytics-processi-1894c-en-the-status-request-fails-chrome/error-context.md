# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase14\analytics-processing.spec.ts >> Phase 14 analytics processing >> shows an error state with a retry action when the status request fails
- Location: e2e\phase14\analytics-processing.spec.ts:194:7

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
  - navigation "Website sections":
    - link "Overview":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222
    - link "Analytics":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/analytics
    - link "Analytics engine":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/analytics-engine
    - link "Events":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/events
    - link "Installation":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/installation
    - link "Settings":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/settings
  - alert:
    - heading "Processing status unavailable" [level=2]
    - paragraph: Internal server error
    - button "Try again"
```

# Test source

```ts
  117 |     ).toBeVisible();
  118 |   });
  119 | 
  120 |   test('hides management controls for viewers', async ({ page }) => {
  121 |     await page.route('**/analytics/processing/status', async (route) => {
  122 |       await route.fulfill({
  123 |         status: 200,
  124 | 
  125 |         contentType: 'application/json',
  126 | 
  127 |         body: JSON.stringify({
  128 |           canReprocess: false,
  129 | 
  130 |           pendingEvents: 0,
  131 | 
  132 |           unresolvedDeadLetters: 0,
  133 | 
  134 |           activeRun: null,
  135 | 
  136 |           latestRun: null,
  137 | 
  138 |           lastSuccessfulRun: null,
  139 | 
  140 |           recentRuns: [],
  141 |         }),
  142 |       });
  143 |     });
  144 | 
  145 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);
  146 | 
  147 |     await expect(
  148 |       page.getByRole('button', {
  149 |         name: 'Reprocess',
  150 |       }),
  151 |     ).toHaveCount(0);
  152 |   });
  153 | 
  154 |   test('shows a loading skeleton before status data arrives', async ({ page }) => {
  155 |     let resolveRoute: (() => void) | undefined;
  156 | 
  157 |     await page.route('**/analytics/processing/status', async (route) => {
  158 |       await new Promise<void>((resolve) => {
  159 |         resolveRoute = resolve;
  160 |       });
  161 | 
  162 |       await route.fulfill({
  163 |         status: 200,
  164 | 
  165 |         contentType: 'application/json',
  166 | 
  167 |         body: JSON.stringify({
  168 |           canReprocess: true,
  169 | 
  170 |           pendingEvents: 0,
  171 | 
  172 |           unresolvedDeadLetters: 0,
  173 | 
  174 |           activeRun: null,
  175 | 
  176 |           latestRun: null,
  177 | 
  178 |           lastSuccessfulRun: null,
  179 | 
  180 |           recentRuns: [],
  181 |         }),
  182 |       });
  183 |     });
  184 | 
  185 |     const navigation = page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);
  186 | 
  187 |     await expect(page.getByLabel('Loading processing status')).toBeVisible();
  188 | 
  189 |     resolveRoute?.();
  190 | 
  191 |     await navigation;
  192 |   });
  193 | 
  194 |   test('shows an error state with a retry action when the status request fails', async ({ page }) => {
  195 |     await page.route('**/analytics/processing/status', async (route) => {
  196 |       await route.fulfill({
  197 |         status: 500,
  198 | 
  199 |         contentType: 'application/json',
  200 | 
  201 |         body: JSON.stringify({
  202 |           statusCode: 500,
  203 | 
  204 |           message: 'Internal server error',
  205 |         }),
  206 |       });
  207 |     });
  208 | 
  209 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);
  210 | 
  211 |     await expect(page.getByText('Processing status unavailable')).toBeVisible();
  212 | 
  213 |     await expect(
  214 |       page.getByRole('button', {
  215 |         name: 'Retry',
  216 |       }),
> 217 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  218 |   });
  219 | 
  220 |   test('shows an empty state when no processing runs have been recorded', async ({ page }) => {
  221 |     await page.route('**/analytics/processing/status', async (route) => {
  222 |       await route.fulfill({
  223 |         status: 200,
  224 | 
  225 |         contentType: 'application/json',
  226 | 
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
```