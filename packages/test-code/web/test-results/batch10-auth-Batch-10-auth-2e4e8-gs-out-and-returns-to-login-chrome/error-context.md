# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch10\auth.spec.ts >> Batch 10 authentication flows >> logs out and returns to login
- Location: e2e\batch10\auth.spec.ts:141:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login$/
Received string:  "http://localhost:3000/login?next=%2Fdashboard"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    3 × locator resolved to <html lang="en">…</html>
      - unexpected value "http://localhost:3000/dashboard"
    10 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:3000/login?next=%2Fdashboard"

```

```yaml
- alert
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
  71  |     await page.getByLabel('Email address').fill('wrong@example.com');
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
> 151 |     await expect(page).toHaveURL(/\/login$/);
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  152 |     expect(state.requests.some((request) => request.method === 'POST' && request.path === '/auth/logout')).toBe(true);
  153 |   });
  154 | });
  155 | 
```