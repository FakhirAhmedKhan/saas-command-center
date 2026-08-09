import { defineConfig, devices } from '@playwright/test';

const databaseUrl = 'postgresql://command_center_full_e2e:command_center_full_e2e@127.0.0.1:5435/command_center_full_e2e?schema=public';

const apiUrl = process.env.FULLSTACK_API_URL ?? 'http://127.0.0.1:4100/api/v1';

const webUrl = process.env.FULLSTACK_WEB_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e/full-stack',
  globalSetup: './e2e/full-stack/global-setup.ts',

  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },

  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: 'playwright-report-fullstack',
        open: 'never',
      },
    ],
  ],

  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: [
    {
      command: 'pnpm --dir ../api start',
      url: `${apiUrl}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        API_PORT: '4100',
        WEB_URL: webUrl,
        DATABASE_URL: databaseUrl,
        TEST_DATABASE_URL: databaseUrl,
        JWT_ACCESS_SECRET: 'batch11-access-secret-0123456789-abcdefghijklmnopqrstuvwxyz',
        JWT_REFRESH_SECRET: 'batch11-refresh-secret-0123456789-abcdefghijklmnopqrstuvwxyz',
        ACCESS_TOKEN_TTL: '1h',
        REFRESH_TOKEN_TTL: '1d',
        ANALYTICS_ALLOW_ORIGINLESS: 'false',
        ANALYTICS_PROCESSING_SCHEDULER_ENABLED: 'false',
      },
    },
    {
      command: 'pnpm exec next dev -p 3100',
      url: webUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: apiUrl,
        NEXT_PUBLIC_INGESTION_URL: `${apiUrl}/collect`,
        NEXT_PUBLIC_TRACKER_SCRIPT_URL: 'http://127.0.0.1:3102/tracker.js',
      },
    },
  ],

  projects: [
    {
      name: 'chrome-fullstack',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
