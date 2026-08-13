# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase13\analytics-reports.spec.ts >> Phase 13 analytics reports >> paginates through report pages using Previous/Next controls
- Location: e2e\phase13\analytics-reports.spec.ts:230:7

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Next' }) resolved to 2 elements:
    1) <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">Next</button> aka getByRole('button', { name: 'Next', exact: true })
    2) <button id="next-logo" aria-haspopup="menu" data-next-mark="true" aria-expanded="false" aria-label="Open Next.js Dev Tools" data-nextjs-dev-tools-button="true" aria-controls="nextjs-dev-tools-menu">…</button> aka getByRole('button', { name: 'Open Next.js Dev Tools' })

Call log:
  - waiting for getByRole('button', { name: 'Next' })

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
            - generic [ref=e81]: P
            - generic [ref=e82]:
              - paragraph [ref=e83]: Account owner
              - paragraph [ref=e84]: phase13@example.com
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
                - generic [ref=e113]:
                  - generic [ref=e114]:
                    - paragraph [ref=e115]: Analytics reports
                    - heading "Detailed analytics" [level=1] [ref=e116]
                  - generic [ref=e117]:
                    - link "Overview" [ref=e118] [cursor=pointer]:
                      - /url: /workspaces/11111111-1111-4111-8111-111111111111/websites/22222222-2222-4222-8222-222222222222/analytics?range=7d
                    - button "Export CSV" [ref=e119] [cursor=pointer]
                - navigation [ref=e120]:
                  - button "Pages" [ref=e121] [cursor=pointer]
                  - button "Sources" [ref=e122] [cursor=pointer]
                  - button "Geography" [ref=e123] [cursor=pointer]
                  - button "Technology" [ref=e124] [cursor=pointer]
                  - button "Events" [ref=e125] [cursor=pointer]
              - generic [ref=e127]:
                - generic [ref=e128]:
                  - text: Search
                  - searchbox "Search" [ref=e129]
                - generic [ref=e130]:
                  - text: Date range
                  - combobox "Date range" [ref=e131] [cursor=pointer]:
                    - option "Today"
                    - option "Last 7 days" [selected]
                    - option "Last 30 days"
                    - option "Last 90 days"
                - generic [ref=e132]:
                  - text: Sort by
                  - combobox "Sort by" [ref=e133] [cursor=pointer]:
                    - option "Views" [selected]
                    - option "Visitors"
                    - option "Sessions"
                    - option "Entrances"
                    - option "Exits"
                    - option "Bounce rate"
                    - option "Average duration"
                    - option "Path"
                - generic [ref=e134]:
                  - text: Direction
                  - combobox "Direction" [ref=e135] [cursor=pointer]:
                    - option "Highest first" [selected]
                    - option "Lowest first"
              - generic [ref=e136]:
                - generic [ref=e137]:
                  - generic [ref=e138]: 2026-08-01 â€” 2026-08-07 Â· Asia/Dubai
                  - generic [ref=e139]: 2 results
                - table [ref=e141]:
                  - rowgroup [ref=e142]:
                    - row [ref=e143]:
                      - columnheader "Page" [ref=e144]
                      - columnheader "Views" [ref=e145]
                      - columnheader "Visitors" [ref=e146]
                      - columnheader "Sessions" [ref=e147]
                      - columnheader "Entrances" [ref=e148]
                      - columnheader "Exits" [ref=e149]
                      - columnheader "Bounce rate" [ref=e150]
                      - columnheader "Avg. duration" [ref=e151]
                  - rowgroup [ref=e152]:
                    - row [ref=e153]:
                      - cell [ref=e154]:
                        - paragraph [ref=e155]: Dashboard
                        - paragraph [ref=e156]: /dashboard
                      - cell "1,200" [ref=e157]
                      - cell "100" [ref=e158]
                      - cell "120" [ref=e159]
                      - cell "90" [ref=e160]
                      - cell "60" [ref=e161]
                      - cell "20%" [ref=e162]
                      - cell "45s" [ref=e163]
                - generic [ref=e164]:
                  - button "Previous" [disabled] [ref=e165] [cursor=pointer]
                  - generic [ref=e166]: Page 1 of 2
                  - button "Next" [ref=e167] [cursor=pointer]
```

# Test source

```ts
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
  227 |     ).toBeVisible();
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
> 292 |       .click();
      |        ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Next' }) resolved to 2 elements:
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
  328 |     await page
  329 |       .getByRole('button', {
  330 |         name: 'Export CSV',
  331 |       })
  332 |       .click();
  333 | 
  334 |     const download = await downloadPromise;
  335 | 
  336 |     expect(download.suggestedFilename()).toContain('.csv');
  337 |   });
  338 | 
  339 |   test('shows an inline error when the CSV export request fails', async ({ page }) => {
  340 |     await page.route('**/analytics/reports/exports/pages*', async (route) => {
  341 |       await route.fulfill({
  342 |         status: 400,
  343 | 
  344 |         contentType: 'application/json',
  345 | 
  346 |         body: JSON.stringify({
  347 |           statusCode: 400,
  348 | 
  349 |           message: 'CSV exports cannot exceed 90 days',
  350 |         }),
  351 |       });
  352 |     });
  353 | 
  354 |     await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);
  355 | 
  356 |     await page
  357 |       .getByRole('button', {
  358 |         name: 'Export CSV',
  359 |       })
  360 |       .click();
  361 | 
  362 |     await expect(page.getByText('CSV exports cannot exceed 90 days')).toBeVisible();
  363 |   });
  364 | });
  365 | 
```