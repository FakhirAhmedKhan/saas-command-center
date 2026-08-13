# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase13\analytics-reports.spec.ts >> Phase 13 analytics reports >> shows an error state with a retry action when the report request fails
- Location: e2e\phase13\analytics-reports.spec.ts:204:7

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
  - text: P
  - paragraph: Account owner
  - paragraph: phase13@example.com
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
  - main:
    - paragraph: Analytics reports
    - heading "Detailed analytics" [level=1]
    - link "Overview":
      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/analytics?range=7d
    - button "Export CSV"
    - navigation:
      - button "Pages"
      - button "Sources"
      - button "Geography"
      - button "Technology"
      - button "Events"
    - text: Search
    - searchbox "Search"
    - text: Date range
    - combobox "Date range":
      - option "Today"
      - option "Last 7 days" [selected]
      - option "Last 30 days"
      - option "Last 90 days"
    - text: Sort by
    - combobox "Sort by":
      - option "Views" [selected]
      - option "Visitors"
      - option "Sessions"
      - option "Entrances"
      - option "Exits"
      - option "Bounce rate"
      - option "Average duration"
      - option "Path"
    - text: Direction
    - combobox "Direction":
      - option "Highest first" [selected]
      - option "Lowest first"
    - alert:
      - heading "Unable to load analytics report" [level=2]
      - paragraph: Internal server error
      - button "Try again"
```

# Test source

```ts
  127 |     await page.route('**/analytics/reports/pages*', async (route) => {
  128 |       await new Promise<void>((resolve) => {
  129 |         resolveRoute = resolve;
  130 |       });
  131 | 
  132 |       await route.fulfill({
  133 |         status: 200,
  134 | 
  135 |         contentType: 'application/json',
  136 | 
  137 |         body: JSON.stringify({
  138 |           items: [],
  139 | 
  140 |           pagination: {
  141 |             page: 1,
  142 |             limit: 25,
  143 |             total: 0,
  144 |             totalPages: 1,
  145 |             hasPreviousPage: false,
  146 |             hasNextPage: false,
  147 |           },
  148 | 
  149 |           range: {
  150 |             from: '2026-08-01',
  151 |             to: '2026-08-07',
  152 |             timeZone: 'Asia/Dubai',
  153 |             days: 7,
  154 |           },
  155 |         }),
  156 |       });
  157 |     });
  158 | 
  159 |     const navigation = page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);
  160 | 
  161 |     await expect(page.locator('.animate-pulse').first()).toBeVisible();
  162 | 
  163 |     resolveRoute?.();
  164 | 
  165 |     await navigation;
  166 |   });
  167 | 
  168 |   test('shows an empty state when no report rows match the filters', async ({ page }) => {
  169 |     await page.route('**/analytics/reports/pages*', async (route) => {
  170 |       await route.fulfill({
  171 |         status: 200,
  172 | 
  173 |         contentType: 'application/json',
  174 | 
  175 |         body: JSON.stringify({
  176 |           items: [],
  177 | 
  178 |           pagination: {
  179 |             page: 1,
  180 |             limit: 25,
  181 |             total: 0,
  182 |             totalPages: 1,
  183 |             hasPreviousPage: false,
  184 |             hasNextPage: false,
  185 |           },
  186 | 
  187 |           range: {
  188 |             from: '2026-08-01',
  189 |             to: '2026-08-07',
  190 |             timeZone: 'Asia/Dubai',
  191 |             days: 7,
  192 |           },
  193 |         }),
  194 |       });
  195 |     });
  196 | 
  197 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);
  198 | 
  199 |     await expect(page.getByText('No report data')).toBeVisible();
  200 | 
  201 |     await expect(page.getByText('No matching analytics data was found for the selected filters and date range.')).toBeVisible();
  202 |   });
  203 | 
  204 |   test('shows an error state with a retry action when the report request fails', async ({ page }) => {
  205 |     await page.route('**/analytics/reports/pages*', async (route) => {
  206 |       await route.fulfill({
  207 |         status: 500,
  208 | 
  209 |         contentType: 'application/json',
  210 | 
  211 |         body: JSON.stringify({
  212 |           statusCode: 500,
  213 | 
  214 |           message: 'Internal server error',
  215 |         }),
  216 |       });
  217 |     });
  218 | 
  219 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);
  220 | 
  221 |     await expect(page.getByText('Unable to load analytics report')).toBeVisible();
  222 | 
  223 |     await expect(
  224 |       page.getByRole('button', {
  225 |         name: 'Retry',
  226 |       }),
> 227 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  228 |   });
  229 | 
  230 |   test('paginates through report pages using Previous/Next controls', async ({ page }) => {
  231 |     await page.route('**/analytics/reports/pages*', async (route) => {
  232 |       const url = new URL(route.request().url());
  233 | 
  234 |       const requestedPage = url.searchParams.get('page') ?? '1';
  235 | 
  236 |       await route.fulfill({
  237 |         status: 200,
  238 | 
  239 |         contentType: 'application/json',
  240 | 
  241 |         body: JSON.stringify({
  242 |           items: [
  243 |             {
  244 |               path: requestedPage === '2' ? '/blog' : '/dashboard',
  245 | 
  246 |               title: requestedPage === '2' ? 'Blog' : 'Dashboard',
  247 | 
  248 |               views: requestedPage === '2' ? 300 : 1200,
  249 | 
  250 |               visitors: 100,
  251 |               sessions: 120,
  252 |               entrances: 90,
  253 |               exits: 60,
  254 |               bounceRate: 20,
  255 |               averageDurationSeconds: 45,
  256 |             },
  257 |           ],
  258 | 
  259 |           pagination: {
  260 |             page: Number(requestedPage),
  261 |             limit: 25,
  262 |             total: 2,
  263 |             totalPages: 2,
  264 |             hasPreviousPage: requestedPage === '2',
  265 |             hasNextPage: requestedPage !== '2',
  266 |           },
  267 | 
  268 |           range: {
  269 |             from: '2026-08-01',
  270 |             to: '2026-08-07',
  271 |             timeZone: 'Asia/Dubai',
  272 |             days: 7,
  273 |           },
  274 |         }),
  275 |       });
  276 |     });
  277 | 
  278 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);
  279 | 
  280 |     await expect(page.getByText('Page 1 of 2')).toBeVisible();
  281 | 
  282 |     await expect(
  283 |       page.getByRole('button', {
  284 |         name: 'Previous',
  285 |       }),
  286 |     ).toBeDisabled();
  287 | 
  288 |     await page
  289 |       .getByRole('button', {
  290 |         name: 'Next',
  291 |       })
  292 |       .click();
  293 | 
  294 |     await expect(page.getByText('Page 2 of 2')).toBeVisible();
  295 | 
  296 |     await expect(
  297 |       page.getByText('Blog', {
  298 |         exact: true,
  299 |       }),
  300 |     ).toBeVisible();
  301 | 
  302 |     await expect(
  303 |       page.getByRole('button', {
  304 |         name: 'Next',
  305 |       }),
  306 |     ).toBeDisabled();
  307 |   });
  308 | 
  309 |   test('exports the current report as CSV', async ({ page }) => {
  310 |     await page.route('**/analytics/reports/exports/pages*', async (route) => {
  311 |       await route.fulfill({
  312 |         status: 200,
  313 | 
  314 |         contentType: 'text/csv; charset=utf-8',
  315 | 
  316 |         headers: {
  317 |           'content-disposition': 'attachment; filename="pages_2026-08-01_2026-08-07.csv"',
  318 |         },
  319 | 
  320 |         body: 'Path,Title,Views\r\n/dashboard,Dashboard,1200\r\n',
  321 |       });
  322 |     });
  323 | 
  324 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);
  325 | 
  326 |     const downloadPromise = page.waitForEvent('download');
  327 | 
```