# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\navigation-accessibility.spec.ts >> Batch 10 navigation, responsiveness, and accessibility >> keeps the dashboard inside the mobile viewport
- Location: e2e\batch10\navigation-accessibility.spec.ts:37:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Select workspace')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByLabel('Select workspace')

```

```yaml
- alert
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - button "Open navigation"
  - link "Notifications, 0 unread":
    - /url: /notifications
- main:
  - heading "Good morning, Frontend Owner" [level=1]
  - paragraph: Here's what needs your attention.
  - link "New workspace":
    - /url: /workspaces/new
  - heading "Your workspaces" [level=2]
  - link "C OWNER Command Center Team /command-center-team Open workspace":
    - /url: /workspaces/11111111-1111-4111-8111-111111111111
    - text: C OWNER
    - heading "Command Center Team" [level=3]
    - paragraph: /command-center-team
    - text: Open workspace
  - link "M DEVELOPER MadadAI Team /madadai-team Open workspace":
    - /url: /workspaces/22222222-2222-4222-8222-222222222222
    - text: M DEVELOPER
    - heading "MadadAI Team" [level=3]
    - paragraph: /madadai-team
    - text: Open workspace
```

# Test source

```ts
  1  | import { installMockApi, PRIMARY_WORKSPACE_ID } from './fixtures/mock-api';
  2  | import { expect, test } from '@playwright/test';
  3  | 
  4  | test.describe('Batch 10 navigation, responsiveness, and accessibility', () => {
  5  |   test('restores an authenticated session from the public root', async ({ page }) => {
  6  |     await installMockApi(page);
  7  | 
  8  |     await page.goto('/');
  9  | 
  10 |     await expect(page).toHaveURL(/\/dashboard$/);
  11 |     await expect(
  12 |       page.getByRole('heading', {
  13 |         name: 'Welcome back, Frontend Owner',
  14 |       }),
  15 |     ).toBeVisible();
  16 |   });
  17 | 
  18 |   test('exposes meaningful navigation landmarks and links', async ({ page }) => {
  19 |     await installMockApi(page);
  20 | 
  21 |     await page.goto('/dashboard');
  22 | 
  23 |     await expect(page.getByRole('navigation')).toBeVisible();
  24 |     await expect(
  25 |       page.getByRole('link', {
  26 |         name: 'Overview',
  27 |       }),
  28 |     ).toBeVisible();
  29 |     await expect(
  30 |       page.getByRole('link', {
  31 |         name: 'Command Center Team',
  32 |       }),
  33 |     ).toBeVisible();
  34 |     await expect(page.getByLabel('Select workspace')).toBeVisible();
  35 |   });
  36 | 
  37 |   test('keeps the dashboard inside the mobile viewport', async ({ page }) => {
  38 |     await page.setViewportSize({
  39 |       width: 390,
  40 |       height: 844,
  41 |     });
  42 |     await installMockApi(page);
  43 | 
  44 |     await page.goto('/dashboard');
  45 | 
  46 |     const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  47 | 
  48 |     expect(hasHorizontalOverflow).toBe(false);
> 49 |     await expect(page.getByLabel('Select workspace')).toBeVisible();
     |                                                       ^ Error: expect(locator).toBeVisible() failed
  50 |     await expect(page.locator('.sidebar-nav')).toBeHidden();
  51 |   });
  52 | 
  53 |   test('provides accessible names for authentication controls', async ({ page }) => {
  54 |     await installMockApi(page, {
  55 |       authenticated: false,
  56 |     });
  57 | 
  58 |     await page.goto('/login');
  59 | 
  60 |     await expect(page.getByLabel('Email address')).toHaveAttribute('type', 'email');
  61 |     await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password');
  62 |     await expect(
  63 |       page.getByRole('button', {
  64 |         name: 'Sign in',
  65 |       }),
  66 |     ).toBeEnabled();
  67 |     await expect(
  68 |       page.getByRole('link', {
  69 |         name: 'Create an account',
  70 |       }),
  71 |     ).toBeVisible();
  72 |   });
  73 | 
  74 |   test('supports keyboard submission of the application filter form', async ({ page }) => {
  75 |     const state = await installMockApi(page);
  76 | 
  77 |     await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);
  78 | 
  79 |     const search = page.getByLabel('Search applications');
  80 | 
  81 |     await search.fill('PriceScout');
  82 |     await search.press('Enter');
  83 | 
  84 |     await expect(
  85 |       page.getByRole('heading', {
  86 |         name: 'PriceScout AI',
  87 |       }),
  88 |     ).toBeVisible();
  89 | 
  90 |     const latestRequest = state.requests
  91 |       .filter((request) => request.method === 'GET' && request.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/applications`)
  92 |       .at(-1);
  93 | 
  94 |     expect(latestRequest?.search).toContain('search=PriceScout');
  95 |   });
  96 | });
  97 | 
```