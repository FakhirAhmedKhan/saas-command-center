import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const apiRoot = resolve(__dirname, '../../../apps/api');

const webRoot = resolve(__dirname, '../../../apps/web');

const trackerRoot = resolve(__dirname, '../../../apps/tracker');

const databaseUrl = 'postgresql://command_center_full_e2e:command_center_full_e2e@127.0.0.1:5435/command_center_full_e2e?schema=public';

const apiUrl = process.env.FULLSTACK_API_URL ?? 'http://127.0.0.1:4100/api/v1';

const webUrl = process.env.FULLSTACK_WEB_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e/full-stack',
  globalSetup: './e2e/full-stack/global-setup.ts',
  globalTeardown: './e2e/full-stack/global-teardown.ts',
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
    permissions: ['local-network-access'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: [
    {
      command: 'node e2e/full-stack/fixtures/mock-mobile-ai-server.mjs',
      cwd: __dirname,
      url: 'http://127.0.0.1:3103/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...process.env,
        MOBILE_AI_MOCK_PORT: '3103',
      },
    },
    {
      command: 'pnpm build && pnpm start:prod',
      cwd: apiRoot,
      url: `${apiUrl}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,

        NODE_ENV: 'test',
        WEBHOOK_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
        AUTH_REGISTER_RATE_LIMIT: '10000',
        AUTH_LOGIN_RATE_LIMIT: '10000',
        AUTH_REFRESH_RATE_LIMIT: '10000',
        PORT: '4100',
        WEB_URL: webUrl,
        FRONTEND_URL: webUrl,
        CORS_ORIGINS: webUrl,
        DATABASE_URL: databaseUrl,
        TEST_DATABASE_URL: databaseUrl,
        JWT_ACCESS_SECRET: 'batch11-access-secret-0123456789-abcdefghijklmnopqrstuvwxyz',
        JWT_REFRESH_SECRET: 'batch11-refresh-secret-0123456789-abcdefghijklmnopqrstuvwxyz',
        ACCESS_TOKEN_TTL: '1h',
        REFRESH_TOKEN_TTL: '1d',
        ANALYTICS_ALLOW_ORIGINLESS: 'false',
        ANALYTICS_PROCESSING_SCHEDULER_ENABLED: 'false',
        MOBILE_AI_ANALYSIS_URL: 'http://127.0.0.1:3103/analyze',
        MOBILE_AI_ANALYSIS_API_KEY: 'fullstack-mobile-ai-key',
        MOBILE_AI_ANALYSIS_MODEL: 'fullstack-mobile-ai',
      },
    },

    {
      command: `pnpm build && node -e "const fs=require('node:fs'); const root='.next/standalone/apps/web'; if(fs.existsSync('public')) fs.cpSync('public', root + '/public', { recursive: true }); fs.mkdirSync(root + '/.next', { recursive: true }); fs.cpSync('.next/static', root + '/.next/static', { recursive: true });" && node .next/standalone/apps/web/server.js`,
      cwd: webRoot,
      url: webUrl,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        ...process.env,

        NODE_ENV: 'production',
        PORT: '3100',
        HOSTNAME: '127.0.0.1',
        NEXT_PUBLIC_API_URL: apiUrl,
        NEXT_PUBLIC_API_BASE_URL: apiUrl,
        NEXT_PUBLIC_INGESTION_URL: `${apiUrl}/collect`,
        NEXT_PUBLIC_TRACKER_SCRIPT_URL: 'http://127.0.0.1:3102/tracker.js',
      },
    },

    {
      command: 'pnpm build && pnpm start',
      cwd: trackerRoot,
      url: 'http://127.0.0.1:3102/tracker.js',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,

        TRACKER_PORT: '3102',
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
