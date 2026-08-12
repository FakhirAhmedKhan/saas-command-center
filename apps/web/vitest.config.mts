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
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Playwright specs live in e2e/ and use their own runner.
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Only the pure-logic modules that unit tests actually target. Widening
      // this to all of src/ would bury the real numbers under untested UI.
      include: ['src/features/**/*-utils.ts', 'src/features/lib/api/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.types.ts', '**/*-types.ts'],
    },
  },
});
