# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase18\webhook-integrations.spec.ts >> Phase 18 webhook integrations >> creates a webhook and shows its secret once
- Location: e2e\phase18\webhook-integrations.spec.ts:108:7

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
                      - text: Production automation
                  - generic [ref=e127]:
                    - text: Endpoint URL
                    - textbox "Endpoint URL" [ref=e128]:
                      - /placeholder: https://automation.example.com/webhooks/command-center
                      - text: https://automation.example.com/webhook
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
                  - generic [ref=e135]:
                    - generic [ref=e136] [cursor=pointer]:
                      - checkbox "Deployment failed A deployment enters the Failed state." [checked] [active] [ref=e137]
                      - generic [ref=e138]:
                        - generic [ref=e139]: Deployment failed
                        - generic [ref=e140]: A deployment enters the Failed state.
                    - generic [ref=e141] [cursor=pointer]:
                      - checkbox "Health incident opened Monitoring opens a new incident." [ref=e142]
                      - generic [ref=e143]:
                        - generic [ref=e144]: Health incident opened
                        - generic [ref=e145]: Monitoring opens a new incident.
                - generic [ref=e146]:
                  - checkbox "Enable webhook" [checked] [ref=e147]
                  - text: Enable webhook
                - button "Create webhook" [ref=e148] [cursor=pointer]
              - generic [ref=e149]:
                - heading "Signature verification" [level=2] [ref=e150]
                - paragraph [ref=e151]:
                  - text: Calculate HMAC SHA-256 from
                  - code [ref=e152]: timestamp.rawBody
                  - text: and compare it to the
                  - code [ref=e153]: X-Command-Center-Signature
                  - text: header.
                - generic [ref=e154]: const signed = timestamp + "." + rawBody; const digest = createHmac("sha256", secret) .update(signed) .digest("hex"); const expected = "v1=" + digest;
              - generic [ref=e155]:
                - heading "No integrations configured" [level=3] [ref=e157]
                - paragraph [ref=e158]: Create a webhook to deliver selected Command Center events to another system.
```

# Test source

```ts
  31  | 
  32  |           body: JSON.stringify({
  33  |             endpoint: {
  34  |               id: 'webhook-1',
  35  | 
  36  |               workspaceId,
  37  | 
  38  |               name: 'Production automation',
  39  | 
  40  |               url: 'https://automation.example.com/webhook',
  41  | 
  42  |               eventTypes: ['DEPLOYMENT_FAILED'],
  43  | 
  44  |               payloadVersion: '2026-08-01',
  45  | 
  46  |               timeoutMs: 10000,
  47  | 
  48  |               maxAttempts: 5,
  49  | 
  50  |               enabled: true,
  51  | 
  52  |               secretConfigured: true,
  53  | 
  54  |               lastDeliveryAt: null,
  55  | 
  56  |               lastSuccessAt: null,
  57  | 
  58  |               lastFailureAt: null,
  59  | 
  60  |               createdAt: '2026-08-07T00:00:00.000Z',
  61  | 
  62  |               updatedAt: '2026-08-07T00:00:00.000Z',
  63  | 
  64  |               deliveryCount: 0,
  65  | 
  66  |               latestDelivery: null,
  67  |             },
  68  | 
  69  |             secret: 'one-time-webhook-secret',
  70  |           }),
  71  |         });
  72  | 
  73  |         return;
  74  |       }
  75  | 
  76  |       await route.fulfill({
  77  |         status: 200,
  78  | 
  79  |         contentType: 'application/json',
  80  | 
  81  |         body: JSON.stringify({
  82  |           canManage: true,
  83  | 
  84  |           eventCatalog: [
  85  |             {
  86  |               type: 'DEPLOYMENT_FAILED',
  87  | 
  88  |               label: 'Deployment failed',
  89  | 
  90  |               description: 'A deployment enters the Failed state.',
  91  |             },
  92  | 
  93  |             {
  94  |               type: 'HEALTH_INCIDENT_OPENED',
  95  | 
  96  |               label: 'Health incident opened',
  97  | 
  98  |               description: 'Monitoring opens a new incident.',
  99  |             },
  100 |           ],
  101 | 
  102 |           items: [],
  103 |         }),
  104 |       });
  105 |     });
  106 |   });
  107 | 
  108 |   test('creates a webhook and shows its secret once', async ({ page }) => {
  109 |     await page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  110 | 
  111 |     await page
  112 |       .getByRole('button', {
  113 |         name: 'Create webhook',
  114 |       })
  115 |       .click();
  116 | 
  117 |     await page.getByLabel('Name').fill('Production automation');
  118 | 
  119 |     await page.getByLabel('Endpoint URL').fill('https://automation.example.com/webhook');
  120 | 
  121 |     await page
  122 |       .getByText('Deployment failed', {
  123 |         exact: true,
  124 |       })
  125 |       .click();
  126 | 
  127 |     await page
  128 |       .getByRole('button', {
  129 |         name: 'Create webhook',
  130 |       })
> 131 |       .click();
      |        ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Create webhook' }) resolved to 2 elements:
  132 | 
  133 |     await expect(page.getByText('Save this signing secret')).toBeVisible();
  134 | 
  135 |     await expect(page.locator('input[value="one-time-webhook-secret"]')).toBeVisible();
  136 |   });
  137 | 
  138 |   test('hides webhook management controls from viewers', async ({ page }) => {
  139 |     await page.route('**/integrations/webhooks', async (route) => {
  140 |       await route.fulfill({
  141 |         status: 200,
  142 | 
  143 |         contentType: 'application/json',
  144 | 
  145 |         body: JSON.stringify({
  146 |           canManage: false,
  147 | 
  148 |           eventCatalog: [],
  149 | 
  150 |           items: [],
  151 |         }),
  152 |       });
  153 |     });
  154 | 
  155 |     await page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  156 | 
  157 |     await expect(
  158 |       page.getByRole('button', {
  159 |         name: 'Create webhook',
  160 |       }),
  161 |     ).toHaveCount(0);
  162 |   });
  163 | 
  164 |   test('shows a loading skeleton before webhook data arrives', async ({ page }) => {
  165 |     let resolveRoute: (() => void) | undefined;
  166 | 
  167 |     await page.route('**/integrations/webhooks', async (route) => {
  168 |       if (route.request().method() === 'POST') {
  169 |         await route.fallback();
  170 | 
  171 |         return;
  172 |       }
  173 | 
  174 |       await new Promise<void>((resolve) => {
  175 |         resolveRoute = resolve;
  176 |       });
  177 | 
  178 |       await route.fulfill({
  179 |         status: 200,
  180 | 
  181 |         contentType: 'application/json',
  182 | 
  183 |         body: JSON.stringify({
  184 |           canManage: true,
  185 | 
  186 |           eventCatalog: [],
  187 | 
  188 |           items: [],
  189 |         }),
  190 |       });
  191 |     });
  192 | 
  193 |     const navigation = page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  194 | 
  195 |     await expect(page.locator('.animate-pulse').first()).toBeVisible();
  196 | 
  197 |     resolveRoute?.();
  198 | 
  199 |     await navigation;
  200 |   });
  201 | 
  202 |   test('shows an error state with a retry action when webhook data fails to load', async ({ page }) => {
  203 |     await page.route('**/integrations/webhooks', async (route) => {
  204 |       if (route.request().method() === 'POST') {
  205 |         await route.fallback();
  206 | 
  207 |         return;
  208 |       }
  209 | 
  210 |       await route.fulfill({
  211 |         status: 500,
  212 | 
  213 |         contentType: 'application/json',
  214 | 
  215 |         body: JSON.stringify({
  216 |           statusCode: 500,
  217 | 
  218 |           message: 'Internal server error',
  219 |         }),
  220 |       });
  221 |     });
  222 | 
  223 |     await page.goto(`/workspaces/${workspaceId}/settings/integrations`);
  224 | 
  225 |     await expect(page.getByText('Integrations unavailable')).toBeVisible();
  226 | 
  227 |     await expect(
  228 |       page.getByRole('button', {
  229 |         name: 'Retry',
  230 |       }),
  231 |     ).toBeVisible();
```