# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase15\monitoring.spec.ts >> Phase 15 monitoring >> shows monitoring summary and health checks
- Location: e2e\phase15\monitoring.spec.ts:182:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Health monitoring' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Health monitoring' })

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
  - main:
    - heading "Monitoring" [level=1]
    - paragraph: Application and website availability, response times and incidents.
    - button "Add health check"
    - article:
      - paragraph: Total
      - paragraph: "3"
    - article:
      - paragraph: Healthy
      - paragraph: "1"
    - article:
      - paragraph: Degraded
      - paragraph: "1"
    - article:
      - paragraph: Down
      - paragraph: "1"
    - article:
      - paragraph: Unknown
      - paragraph: "0"
    - article:
      - paragraph: Disabled
      - paragraph: "0"
    - article:
      - paragraph: Incidents
      - paragraph: "1"
    - text: Status
    - combobox "Status":
      - option "All statuses" [selected]
      - option "Healthy"
      - option "Degraded"
      - option "Down"
      - option "Unknown"
      - option "Disabled"
    - text: Target type
    - combobox "Target type":
      - option "All targets" [selected]
      - option "Applications"
      - option "Websites"
    - article:
      - paragraph: APPLICATION Â· Demo API
      - heading "Production API" [level=2]
      - paragraph: https://example.com/health
      - text: Healthy
      - term: Response
      - definition: 120ms
      - term: HTTP status
      - definition: "200"
      - term: Last checked
      - definition: Aug 7, 2026, 5:00 AM
      - term: Failures
      - definition: 0/3
      - button "History"
      - button "Run now"
      - button "Edit"
      - button "Disable"
    - heading "Incident timeline" [level=2]
    - article:
      - paragraph: Website
      - paragraph: Public Website
      - text: OPEN
      - paragraph: Website returned HTTP 500.
      - text: "Started: Aug 7, 2026, 4:10 AM Failures: 3"
```

# Test source

```ts
  89  |         contentType: 'application/json',
  90  | 
  91  |         body: JSON.stringify([
  92  |           {
  93  |             id: '55555555-5555-4555-8555-555555555555',
  94  | 
  95  |             targetType: 'APPLICATION',
  96  | 
  97  |             targetId: '44444444-4444-4444-8444-444444444444',
  98  | 
  99  |             targetName: 'Demo API',
  100 | 
  101 |             applicationId: '44444444-4444-4444-8444-444444444444',
  102 | 
  103 |             websiteId: null,
  104 | 
  105 |             name: 'Production API',
  106 | 
  107 |             url: 'https://example.com/health',
  108 | 
  109 |             intervalSeconds: 300,
  110 | 
  111 |             timeoutMs: 10000,
  112 | 
  113 |             expectedStatusMin: 200,
  114 | 
  115 |             expectedStatusMax: 399,
  116 | 
  117 |             degradedAfterMs: 1500,
  118 | 
  119 |             failureThreshold: 3,
  120 | 
  121 |             enabled: true,
  122 | 
  123 |             latestStatus: 'HEALTHY',
  124 | 
  125 |             lastStatusCode: 200,
  126 | 
  127 |             lastResponseTimeMs: 120,
  128 | 
  129 |             lastFailureReason: null,
  130 | 
  131 |             consecutiveFailures: 0,
  132 | 
  133 |             lastCheckedAt: '2026-08-07T01:00:00.000Z',
  134 | 
  135 |             lastSuccessfulAt: '2026-08-07T01:00:00.000Z',
  136 | 
  137 |             nextRunAt: '2026-08-07T01:05:00.000Z',
  138 | 
  139 |             createdAt: '2026-08-01T00:00:00.000Z',
  140 | 
  141 |             updatedAt: '2026-08-07T01:00:00.000Z',
  142 |           },
  143 |         ]),
  144 |       });
  145 |     });
  146 | 
  147 |     await page.route('**/monitoring/incidents', async (route) => {
  148 |       await route.fulfill({
  149 |         status: 200,
  150 | 
  151 |         contentType: 'application/json',
  152 | 
  153 |         body: JSON.stringify([
  154 |           {
  155 |             id: 'incident-1',
  156 | 
  157 |             healthCheckId: 'check-2',
  158 | 
  159 |             healthCheckName: 'Website',
  160 | 
  161 |             targetName: 'Public Website',
  162 | 
  163 |             status: 'OPEN',
  164 | 
  165 |             summary: 'Website returned HTTP 500.',
  166 | 
  167 |             failureCount: 3,
  168 | 
  169 |             firstFailureAt: '2026-08-07T00:00:00.000Z',
  170 | 
  171 |             lastFailureAt: '2026-08-07T00:10:00.000Z',
  172 | 
  173 |             startedAt: '2026-08-07T00:10:00.000Z',
  174 | 
  175 |             resolvedAt: null,
  176 |           },
  177 |         ]),
  178 |       });
  179 |     });
  180 |   });
  181 | 
  182 |   test('shows monitoring summary and health checks', async ({ page }) => {
  183 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  184 | 
  185 |     await expect(
  186 |       page.getByRole('heading', {
  187 |         name: 'Health monitoring',
  188 |       }),
> 189 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  190 | 
  191 |     await expect(
  192 |       page.getByText('Production API', {
  193 |         exact: true,
  194 |       }),
  195 |     ).toBeVisible();
  196 | 
  197 |     await expect(
  198 |       page.getByText('Healthy', {
  199 |         exact: true,
  200 |       }),
  201 |     ).toBeVisible();
  202 | 
  203 |     await expect(page.getByText('Website returned HTTP 500.')).toBeVisible();
  204 |   });
  205 | 
  206 |   test('opens the health-check configuration form', async ({ page }) => {
  207 |     await page.goto(`/workspaces/${workspaceId}/monitoring`);
  208 | 
  209 |     await page
  210 |       .getByRole('button', {
  211 |         name: 'Add health check',
  212 |       })
  213 |       .click();
  214 | 
  215 |     await expect(
  216 |       page.getByRole('heading', {
  217 |         name: 'Add health check',
  218 |       }),
  219 |     ).toBeVisible();
  220 | 
  221 |     await expect(page.getByLabel('Health URL')).toBeVisible();
  222 |   });
  223 | 
  224 |   test('hides management controls from viewers', async ({ page }) => {
  225 |     await page.route('**/monitoring/summary', async (route) => {
  226 |       await route.fulfill({
  227 |         status: 200,
  228 | 
  229 |         contentType: 'application/json',
  230 | 
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
```