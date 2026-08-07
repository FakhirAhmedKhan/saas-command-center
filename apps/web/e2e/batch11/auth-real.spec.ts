import {
  expect,
  test,
} from '@playwright/test';

const shouldRunRealE2E =
  process.env.REAL_E2E ===
  'true';

test.describe(
  'Phase 11 real authentication',
  () => {
    test.skip(
      !shouldRunRealE2E,

      'Set REAL_E2E=true and use an isolated test database.',
    );

    test(
      'registers and restores a browser session',
      async ({
        page,
      }) => {
        const uniqueValue =
          Date.now();

        await page.goto(
          '/register',
        );

        await page
          .getByLabel(
            'Name',
          )
          .fill(
            'Phase Eleven User',
          );

        await page
          .getByLabel(
            'Email',
          )
          .fill(
            `phase11-${uniqueValue}@example.com`,
          );

        await page
          .getByLabel(
            'Password',
          )
          .fill(
            'Phase11-Test-Password!',
          );

        await page
          .getByRole(
            'button',
            {
              name:
                'Create account',
            },
          )
          .click();

        await expect(
          page,
        ).toHaveURL(
          /\/dashboard/,
        );

        await page.reload();

        await expect(
          page,
        ).toHaveURL(
          /\/dashboard/,
        );
      },
    );
  },
);