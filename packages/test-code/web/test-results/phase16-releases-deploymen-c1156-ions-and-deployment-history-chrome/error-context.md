# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase16\releases-deployments.spec.ts >> Phase 16 releases and deployments >> shows current environment versions and deployment history
- Location: e2e\phase16\releases-deployments.spec.ts:222:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Production')
Expected: visible
Error: strict mode violation: getByText('Production') resolved to 3 elements:
    1) <p class="text-sm font-medium text-slate-500">Production</p> aka getByText('Production').first()
    2) <option value="44444444-4444-4444-8444-444444444444">Production</option> aka getByLabel('EnvironmentAll')
    3) <p class="mt-2 text-sm text-slate-600">Production</p> aka getByText('Production').nth(2)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Production')

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
              - generic [ref=e118]:
                - heading "Current versions" [level=2] [ref=e119]
                - article [ref=e121]:
                  - paragraph [ref=e122]: Production
                  - paragraph [ref=e123]: 1.3.0
                  - generic [ref=e124]: SUCCESSFUL
                  - paragraph [ref=e126]: Aug 6, 2026, 2:00 PM
                  - link "Open environment" [ref=e127] [cursor=pointer]:
                    - /url: https://example.com
              - generic [ref=e129]:
                - generic [ref=e130]:
                  - text: Environment
                  - combobox "Environment" [ref=e131] [cursor=pointer]:
                    - option "All environments" [selected]
                    - option "Production"
                - generic [ref=e132]:
                  - text: Status
                  - combobox "Status" [ref=e133] [cursor=pointer]:
                    - option "All statuses" [selected]
                    - option "DRAFT"
                    - option "SCHEDULED"
                    - option "IN_PROGRESS"
                    - option "SUCCESSFUL"
                    - option "FAILED"
                    - option "ROLLED_BACK"
              - generic [ref=e134]:
                - heading "Deployment timeline" [level=2] [ref=e135]
                - article [ref=e136]:
                  - generic [ref=e137]:
                    - generic [ref=e138]:
                      - generic [ref=e139]:
                        - heading "1.3.0" [level=3] [ref=e140]
                        - generic [ref=e141]: SUCCESSFUL
                        - generic [ref=e142]: Attempt 1
                      - paragraph [ref=e143]: Production
                      - paragraph [ref=e144]: Changed Aug 6, 2026, 2:00 PM
                    - button "Mark ROLLED BACK" [ref=e146] [cursor=pointer]
                  - generic [ref=e147]:
                    - generic [ref=e148]:
                      - term [ref=e149]: Commit
                      - definition [ref=e150]: abc123
                    - generic [ref=e151]:
                      - term [ref=e152]: Duration
                      - definition [ref=e153]: 5m 0s
                    - generic [ref=e154]:
                      - term [ref=e155]: Started
                      - definition [ref=e156]: Aug 6, 2026, 1:55 PM
                    - generic [ref=e157]:
                      - term [ref=e158]: Finished
                      - definition [ref=e159]: Aug 6, 2026, 2:00 PM
                  - generic [ref=e160]:
                    - paragraph [ref=e161]: Release notes
                    - paragraph [ref=e162]: Stable release.
                  - link "Live environment" [ref=e164] [cursor=pointer]:
                    - /url: https://example.com
```

# Test source

```ts
  131 |         ]),
  132 |       });
  133 |     });
  134 | 
  135 |     await page.route('**/deployments?*', async (route) => {
  136 |       await route.fulfill({
  137 |         status: 200,
  138 | 
  139 |         contentType: 'application/json',
  140 | 
  141 |         body: JSON.stringify({
  142 |           items: [
  143 |             {
  144 |               id: 'deployment-1',
  145 | 
  146 |               releaseId: 'release-1',
  147 | 
  148 |               environmentId: '44444444-4444-4444-8444-444444444444',
  149 | 
  150 |               attempt: 1,
  151 | 
  152 |               status: 'SUCCESSFUL',
  153 | 
  154 |               commitRef: 'abc123',
  155 | 
  156 |               repositoryUrl: null,
  157 | 
  158 |               ciJobUrl: null,
  159 | 
  160 |               liveUrl: 'https://example.com',
  161 | 
  162 |               deploymentNotes: null,
  163 | 
  164 |               failureReason: null,
  165 | 
  166 |               scheduledAt: null,
  167 | 
  168 |               startedAt: '2026-08-06T09:55:00.000Z',
  169 | 
  170 |               finishedAt: '2026-08-06T10:00:00.000Z',
  171 | 
  172 |               durationMs: 300000,
  173 | 
  174 |               statusChangedAt: '2026-08-06T10:00:00.000Z',
  175 | 
  176 |               createdAt: '2026-08-06T09:50:00.000Z',
  177 | 
  178 |               release: {
  179 |                 id: 'release-1',
  180 | 
  181 |                 version: '1.3.0',
  182 | 
  183 |                 notes: 'Stable release.',
  184 |               },
  185 | 
  186 |               environment: {
  187 |                 id: '44444444-4444-4444-8444-444444444444',
  188 | 
  189 |                 name: 'Production',
  190 |               },
  191 | 
  192 |               deployedBy: null,
  193 | 
  194 |               healthIncident: null,
  195 | 
  196 |               rollbackTo: null,
  197 | 
  198 |               activities: [],
  199 | 
  200 |               allowedTransitions: ['ROLLED_BACK'],
  201 |             },
  202 |           ],
  203 | 
  204 |           pagination: {
  205 |             page: 1,
  206 | 
  207 |             limit: 100,
  208 | 
  209 |             total: 1,
  210 | 
  211 |             totalPages: 1,
  212 | 
  213 |             hasPreviousPage: false,
  214 | 
  215 |             hasNextPage: false,
  216 |           },
  217 |         }),
  218 |       });
  219 |     });
  220 |   });
  221 | 
  222 |   test('shows current environment versions and deployment history', async ({ page }) => {
  223 |     await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);
  224 | 
  225 |     await expect(
  226 |       page.getByRole('heading', {
  227 |         name: 'Releases and deployments',
  228 |       }),
  229 |     ).toBeVisible();
  230 | 
> 231 |     await expect(page.getByText('Production')).toBeVisible();
      |                                                ^ Error: expect(locator).toBeVisible() failed
  232 | 
  233 |     await expect(
  234 |       page
  235 |         .getByText('1.3.0', {
  236 |           exact: true,
  237 |         })
  238 |         .first(),
  239 |     ).toBeVisible();
  240 |   });
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
```