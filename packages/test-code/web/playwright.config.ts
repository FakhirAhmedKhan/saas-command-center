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
    command: `pnpm build && node -e "const fs=require('node:fs'); const root='.next/standalone/apps/web'; if(fs.existsSync('public')) fs.cpSync('public', root + '/public', { recursive: true }); fs.mkdirSync(root + '/.next', { recursive: true }); fs.cpSync('.next/static', root + '/.next/static', { recursive: true });" && node .next/standalone/apps/web/server.js`,
    cwd: webRoot,
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: '3000',
      HOSTNAME: '127.0.0.1',
    },
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
