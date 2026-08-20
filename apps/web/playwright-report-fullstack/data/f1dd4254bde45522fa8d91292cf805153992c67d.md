# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fullstack-auth.spec.ts >> Batch 11 real authentication >> logs out and protects the dashboard again
- Location: e2e\full-stack\fullstack-auth.spec.ts:83:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login$/
Received string:  "http://127.0.0.1:3100/login?next=%2Fdashboard"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    4 × locator resolved to <html lang="en">…</html>
      - unexpected value "http://127.0.0.1:3100/dashboard"
    19 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://127.0.0.1:3100/login?next=%2Fdashboard"

```

```yaml
- alert: Know what needs your attention.
- main:
  - text: SC SaaS Command Center
  - heading "Know what needs your attention." [level=1]
  - paragraph: One place for every SaaS product you operate.
  - paragraph: © 2026 SaaS Command Center
  - heading "Welcome back" [level=1]
  - paragraph: Sign in to your command center.
  - text: Email
  - textbox "Email"
  - text: Password
  - textbox "Password"
  - button "Sign in"
  - paragraph:
    - text: No account?
    - link "Create one":
      - /url: /register
```

# Test source

```ts
  1   | import { loginThroughUi } from './fixtures/helpers';
  2   | import { readFullStackState, type FullStackState } from './fixtures/state';
  3   | import { expect, test } from '@playwright/test';
  4   | 
  5   | let state: FullStackState;
  6   | 
  7   | test.describe('Batch 11 real authentication', () => {
  8   |   test.beforeAll(() => {
  9   |     state = readFullStackState();
  10  |   });
  11  | 
  12  |   test('redirects an anonymous browser to login', async ({ page }) => {
  13  |     await page.goto('/dashboard');
  14  | 
  15  |     await expect(page).toHaveURL(/\/login\?/);
  16  | 
  17  |     const redirectedUrl = new URL(page.url());
  18  | 
  19  |     expect(redirectedUrl.pathname).toBe('/login');
  20  |     expect(redirectedUrl.searchParams.get('next')).toBe('/dashboard');
  21  |   });
  22  | 
  23  |   test('logs in against the real NestJS API', async ({ page }) => {
  24  |     await loginThroughUi(page, state.owner);
  25  |   });
  26  | 
  27  |   test('shows a real invalid-credentials response', async ({ page }) => {
  28  |     await page.goto('/login');
  29  | 
  30  |     await page.getByLabel('Email').fill(state.owner.email);
  31  | 
  32  |     await page.getByLabel('Password').fill('WrongBatch11Password!');
  33  | 
  34  |     await page
  35  |       .getByRole('button', {
  36  |         name: 'Sign in',
  37  |       })
  38  |       .click();
  39  | 
  40  |     await expect(page.getByText('Invalid email or password')).toBeVisible();
  41  |   });
  42  | 
  43  |   test('registers a fifth real account and workspace', async ({ page }) => {
  44  |     const email = `batch11-new-${state.runId}@example.test`;
  45  | 
  46  |     await page.goto('/register');
  47  | 
  48  |     await page.getByLabel('Your name').fill('Batch 11 New Owner');
  49  | 
  50  |     await page.getByLabel('Email').fill(email);
  51  | 
  52  |     await page.getByLabel('Password').fill('StrongBatch11Password123!');
  53  | 
  54  |     await page.getByLabel('Workspace name').fill('Batch 11 Registered Workspace');
  55  | 
  56  |     await page
  57  |       .getByRole('button', {
  58  |         name: 'Create account',
  59  |       })
  60  |       .click();
  61  | 
  62  |     await expect(page).toHaveURL(/\/dashboard$/);
  63  | 
  64  |     await expect(page.getByText(email)).toBeVisible();
  65  |   });
  66  | 
  67  |   test('restores the browser session from the real refresh-token cookie', async ({ browser }) => {
  68  |     const context = await browser.newContext({
  69  |       storageState: state.owner.storageStatePath,
  70  |     });
  71  | 
  72  |     const page = await context.newPage();
  73  | 
  74  |     await page.goto('/dashboard');
  75  | 
  76  |     await expect(page).toHaveURL(/\/dashboard$/);
  77  | 
  78  |     await expect(page.getByText(state.owner.email)).toBeVisible();
  79  | 
  80  |     await context.close();
  81  |   });
  82  | 
  83  |   test('logs out and protects the dashboard again', async ({ page }) => {
  84  |     await loginThroughUi(page, state.owner);
  85  | 
  86  |     await page
  87  |       .getByRole('button', {
  88  |         name: 'Sign out',
  89  |       })
  90  |       .click();
  91  | 
> 92  |     await expect(page).toHaveURL(/\/login$/);
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  93  | 
  94  |     await page.goto('/dashboard');
  95  | 
  96  |     await expect(page).toHaveURL(/\/login\?/);
  97  | 
  98  |     const redirectedUrl = new URL(page.url());
  99  | 
  100 |     expect(redirectedUrl.pathname).toBe('/login');
  101 |     expect(redirectedUrl.searchParams.get('next')).toBe('/dashboard');
  102 |   });
  103 | });
  104 | 
```