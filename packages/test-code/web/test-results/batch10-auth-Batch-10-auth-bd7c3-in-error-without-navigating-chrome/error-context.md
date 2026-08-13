# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\auth.spec.ts >> Batch 10 authentication flows >> shows the backend login error without navigating
- Location: e2e\batch10\auth.spec.ts:59:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Email address')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - alert [ref=e11]
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: SC
        - text: SaaS Command Center
      - generic [ref=e16]:
        - heading "Know what needs your attention." [level=1] [ref=e17]
        - paragraph [ref=e18]: One place for every SaaS product you operate.
      - paragraph [ref=e19]: © 2026 SaaS Command Center
    - generic [ref=e22]:
      - heading "Welcome back" [level=1] [ref=e23]
      - paragraph [ref=e24]: Sign in to your command center.
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]: Email
          - textbox "Email" [ref=e29]
        - generic [ref=e30]:
          - generic [ref=e31]: Password
          - textbox "Password" [ref=e33]
        - button "Sign in" [ref=e34] [cursor=pointer]
      - paragraph [ref=e35]:
        - text: No account?
        - link "Create one" [ref=e36] [cursor=pointer]:
          - /url: /register
```

# Test source

```ts
  1   | import { installMockApi } from './fixtures/mock-api';
  2   | import { expect, test } from '@playwright/test';
  3   | 
  4   | test.describe('Batch 10 authentication flows', () => {
  5   |   test('redirects the public root to login when the session is missing', async ({ page }) => {
  6   |     await installMockApi(page, {
  7   |       authenticated: false,
  8   |     });
  9   | 
  10  |     await page.goto('/');
  11  | 
  12  |     await expect(page).toHaveURL(/\/login$/);
  13  |     await expect(
  14  |       page.getByRole('heading', {
  15  |         name: 'Sign in to continue',
  16  |       }),
  17  |     ).toBeVisible();
  18  |   });
  19  | 
  20  |   test('redirects protected dashboard access to login', async ({ page }) => {
  21  |     await installMockApi(page, {
  22  |       authenticated: false,
  23  |     });
  24  | 
  25  |     await page.goto('/dashboard');
  26  | 
  27  |     await expect(page).toHaveURL(/\/login$/);
  28  |   });
  29  | 
  30  |   test('logs in and opens the dashboard', async ({ page }) => {
  31  |     const state = await installMockApi(page, {
  32  |       authenticated: false,
  33  |     });
  34  | 
  35  |     await page.goto('/login');
  36  |     await page.getByLabel('Email address').fill('owner@example.com');
  37  |     await page.getByLabel('Password').fill('StrongPassword123!');
  38  |     await page
  39  |       .getByRole('button', {
  40  |         name: 'Sign in',
  41  |       })
  42  |       .click();
  43  | 
  44  |     await expect(page).toHaveURL(/\/dashboard$/);
  45  |     await expect(
  46  |       page.getByRole('heading', {
  47  |         name: 'Welcome back, Frontend Owner',
  48  |       }),
  49  |     ).toBeVisible();
  50  | 
  51  |     const loginRequest = state.requests.find((request) => request.method === 'POST' && request.path === '/auth/login');
  52  | 
  53  |     expect(loginRequest?.body).toEqual({
  54  |       email: 'owner@example.com',
  55  |       password: 'StrongPassword123!',
  56  |     });
  57  |   });
  58  | 
  59  |   test('shows the backend login error without navigating', async ({ page }) => {
  60  |     await installMockApi(page, {
  61  |       authenticated: false,
  62  |       failures: {
  63  |         'POST /auth/login': {
  64  |           status: 401,
  65  |           message: 'Invalid email or password',
  66  |         },
  67  |       },
  68  |     });
  69  | 
  70  |     await page.goto('/login');
> 71  |     await page.getByLabel('Email address').fill('wrong@example.com');
      |                                            ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  72  |     await page.getByLabel('Password').fill('WrongPassword123!');
  73  |     await page
  74  |       .getByRole('button', {
  75  |         name: 'Sign in',
  76  |       })
  77  |       .click();
  78  | 
  79  |     await expect(page).toHaveURL(/\/login$/);
  80  |     await expect(page.getByText('Invalid email or password')).toBeVisible();
  81  |   });
  82  | 
  83  |   test('registers a new account with the expected request payload', async ({ page }) => {
  84  |     const state = await installMockApi(page, {
  85  |       authenticated: false,
  86  |     });
  87  | 
  88  |     await page.goto('/register');
  89  |     await page.getByLabel('Your name').fill('  New Owner  ');
  90  |     await page.getByLabel('Email address').fill('new-owner@example.com');
  91  |     await page.getByLabel('Password').fill('StrongPassword123!');
  92  |     await page.getByLabel('Workspace name').fill('New SaaS Team');
  93  |     await page
  94  |       .getByRole('button', {
  95  |         name: 'Create account',
  96  |       })
  97  |       .click();
  98  | 
  99  |     await expect(page).toHaveURL(/\/dashboard$/);
  100 | 
  101 |     const registerRequest = state.requests.find((request) => request.method === 'POST' && request.path === '/auth/register');
  102 | 
  103 |     expect(registerRequest?.body).toEqual({
  104 |       displayName: 'New Owner',
  105 |       email: 'new-owner@example.com',
  106 |       password: 'StrongPassword123!',
  107 |       workspaceName: 'New SaaS Team',
  108 |     });
  109 |   });
  110 | 
  111 |   test('uses browser validation for short registration passwords', async ({ page }) => {
  112 |     const state = await installMockApi(page, {
  113 |       authenticated: false,
  114 |     });
  115 | 
  116 |     await page.goto('/register');
  117 |     await page.getByLabel('Email address').fill('new-owner@example.com');
  118 |     await page.getByLabel('Password').fill('too-short');
  119 |     await page.getByLabel('Workspace name').fill('New Team');
  120 |     await page
  121 |       .getByRole('button', {
  122 |         name: 'Create account',
  123 |       })
  124 |       .click();
  125 | 
  126 |     await expect(page).toHaveURL(/\/register$/);
  127 |     const passwordValid = await page.getByLabel('Password').evaluate((input) => (input as HTMLInputElement).validity.valid);
  128 | 
  129 |     expect(passwordValid).toBe(false);
  130 |     expect(state.requests.some((request) => request.path === '/auth/register')).toBe(false);
  131 |   });
  132 | 
  133 |   test('redirects an authenticated user away from login', async ({ page }) => {
  134 |     await installMockApi(page);
  135 | 
  136 |     await page.goto('/login');
  137 | 
  138 |     await expect(page).toHaveURL(/\/dashboard$/);
  139 |   });
  140 | 
  141 |   test('logs out and returns to login', async ({ page }) => {
  142 |     const state = await installMockApi(page);
  143 | 
  144 |     await page.goto('/dashboard');
  145 |     await page
  146 |       .getByRole('button', {
  147 |         name: 'Sign out',
  148 |       })
  149 |       .click();
  150 | 
  151 |     await expect(page).toHaveURL(/\/login$/);
  152 |     expect(state.requests.some((request) => request.method === 'POST' && request.path === '/auth/logout')).toBe(true);
  153 |   });
  154 | });
  155 | 
```