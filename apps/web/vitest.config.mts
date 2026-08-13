import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Pure-logic tests (.test.ts) run on the faster node environment.
    // Component tests (.test.tsx) opt into jsdom via a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Playwright specs live in e2e/ and use their own runner.
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Full production source tree, so the report reflects real coverage
      // instead of only the handful of files that already have tests.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.types.ts', '**/*-types.ts', 'src/**/*.d.ts'],
    },
  },
});
