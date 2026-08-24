import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

import styleConfig from './style.mjs';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-cjs/**',
      '**/.next/**',
      '**/coverage/**',
      '**/build/**',
      '**/out/**',
      '**/generated/**',
      '**/playwright-report/**',
      '**/playwright-report-fullstack/**',
      '**/test-results/**',
    ],
  },

  styleConfig,
);
