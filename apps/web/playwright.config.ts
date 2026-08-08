import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],

        // Uses installed Google Chrome instead
        // of Playwright's blocked headless shell.
        channel: 'chrome',
      },
    },
  ],
});
