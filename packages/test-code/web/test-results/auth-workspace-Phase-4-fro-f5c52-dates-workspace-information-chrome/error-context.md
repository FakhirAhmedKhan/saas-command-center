# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-workspace.spec.ts >> Phase 4 frontend >> opens workspace settings and updates workspace information
- Location: e2e\auth-workspace.spec.ts:74:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Your name')

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
      - heading "Create your account" [level=1] [ref=e23]
      - paragraph [ref=e24]: Start managing your SaaS applications.
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]: Name
          - textbox "Name" [ref=e29]
        - generic [ref=e30]:
          - generic [ref=e31]: Email
          - textbox "Email" [ref=e33]
        - generic [ref=e34]:
          - generic [ref=e35]: Password
          - textbox "Password" [ref=e37]
          - paragraph [ref=e38]: At least 8 characters.
        - button "Create account" [ref=e39] [cursor=pointer]
      - paragraph [ref=e40]:
        - text: Already registered?
        - link "Sign in" [ref=e41] [cursor=pointer]:
          - /url: /login
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | test.describe('Phase 4 frontend', () => {
  4   |   test('redirects unauthenticated dashboard access to login', async ({ page }) => {
  5   |     await page.goto('/dashboard');
  6   | 
  7   |     await expect(page).toHaveURL(/\/login$/);
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
> 81  |     await page.getByLabel('Your name').fill('Workspace Owner');
      |                                        ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  108 | 
  109 |     await page
  110 |       .getByRole('button', {
  111 |         name: 'Save changes',
  112 |       })
  113 |       .click();
  114 | 
  115 |     await expect(page.getByText('Workspace updated successfully.')).toBeVisible();
  116 |   });
  117 | });
  118 | 
```