import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const webRoot = resolve(__dirname, '../../../apps/web');

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['full-stack/**'],

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
    cwd: webRoot,
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
