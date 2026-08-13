# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-workspace.spec.ts >> Phase 4 frontend >> redirects unauthenticated dashboard access to login
- Location: e2e\auth-workspace.spec.ts:4:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login$/
Received string:  "http://localhost:3000/login?next=%2Fdashboard"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    10 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:3000/dashboard"
    4 × locator resolved to <html lang="en">…</html>
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
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | test.describe('Phase 4 frontend', () => {
  4   |   test('redirects unauthenticated dashboard access to login', async ({ page }) => {
  5   |     await page.goto('/dashboard');
  6   | 
> 7   |     await expect(page).toHaveURL(/\/login$/);
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  8   | 
  9   |     await expect(
  10  |       page.getByRole('heading', {
  11  |         name: 'Sign in to continue',
  12  |       }),
  13  |     ).toBeVisible();
  14  |   });
  15  | 
  16  |   test('registers, shows dashboard, logs out and logs back in', async ({ page }) => {
  17  |     const uniqueId = Date.now();
  18  | 
  19  |     const email = `frontend-phase4-${uniqueId}@example.com`;
  20  | 
  21  |     const password = 'StrongPassword123!';
  22  | 
  23  |     const workspaceName = `Frontend Workspace ${uniqueId}`;
  24  | 
  25  |     await page.goto('/register');
  26  | 
  27  |     await page.getByLabel('Your name').fill('Frontend Test User');
  28  | 
  29  |     await page.getByLabel('Email address').fill(email);
  30  | 
  31  |     await page.getByLabel('Password').fill(password);
  32  | 
  33  |     await page.getByLabel('Workspace name').fill(workspaceName);
  34  | 
  35  |     await page
  36  |       .getByRole('button', {
  37  |         name: 'Create account',
  38  |       })
  39  |       .click();
  40  | 
  41  |     await expect(page).toHaveURL(/\/dashboard$/);
  42  | 
  43  |     await expect(
  44  |       page.getByRole('heading', {
  45  |         name: /Welcome back/,
  46  |       }),
  47  |     ).toBeVisible();
  48  | 
  49  |     await expect(page.getByText(workspaceName)).toBeVisible();
  50  | 
  51  |     await page
  52  |       .getByRole('button', {
  53  |         name: 'Sign out',
  54  |       })
  55  |       .click();
  56  | 
  57  |     await expect(page).toHaveURL(/\/login$/);
  58  | 
  59  |     await page.getByLabel('Email address').fill(email);
  60  | 
  61  |     await page.getByLabel('Password').fill(password);
  62  | 
  63  |     await page
  64  |       .getByRole('button', {
  65  |         name: 'Sign in',
  66  |       })
  67  |       .click();
  68  | 
  69  |     await expect(page).toHaveURL(/\/dashboard$/);
  70  | 
  71  |     await expect(page.getByText(workspaceName)).toBeVisible();
  72  |   });
  73  | 
  74  |   test('opens workspace settings and updates workspace information', async ({ page }) => {
  75  |     const uniqueId = Date.now();
  76  | 
  77  |     const email = `workspace-settings-${uniqueId}@example.com`;
  78  | 
  79  |     await page.goto('/register');
  80  | 
  81  |     await page.getByLabel('Your name').fill('Workspace Owner');
  82  | 
  83  |     await page.getByLabel('Email address').fill(email);
  84  | 
  85  |     await page.getByLabel('Password').fill('StrongPassword123!');
  86  | 
  87  |     await page.getByLabel('Workspace name').fill(`Workspace ${uniqueId}`);
  88  | 
  89  |     await page
  90  |       .getByRole('button', {
  91  |         name: 'Create account',
  92  |       })
  93  |       .click();
  94  | 
  95  |     await expect(page).toHaveURL(/\/dashboard$/);
  96  | 
  97  |     await page.getByText(`Workspace ${uniqueId}`).click();
  98  | 
  99  |     await expect(page).toHaveURL(/\/workspaces\/[^/]+$/);
  100 | 
  101 |     await page.getByText('Workspace settings').click();
  102 | 
  103 |     await expect(page).toHaveURL(/\/settings$/);
  104 | 
  105 |     const updatedName = `Updated Workspace ${uniqueId}`;
  106 | 
  107 |     await page.getByLabel('Workspace name').fill(updatedName);
```