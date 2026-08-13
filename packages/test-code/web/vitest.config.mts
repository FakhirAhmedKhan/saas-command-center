import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const webSrc = fileURLToPath(new URL('../../../apps/web/src/', import.meta.url));

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': webSrc,
    },
  },

  test: {
    environment: 'node',

    setupFiles: ['./vitest.setup.ts'],

    include: ['unit/**/*.test.{ts,tsx}'],

    exclude: ['e2e/**', 'node_modules/**', '.next/**'],

    coverage: {
      provider: 'v8',

      reporter: ['text', 'html', 'lcov'],

      reportsDirectory: './coverage',

      include: ['../../../apps/web/src/**/*.{ts,tsx}'],

      exclude: ['**/*.test.{ts,tsx}', '**/*.types.ts', '**/*-types.ts', '../../../apps/web/src/**/*.d.ts'],
    },
  },
});
