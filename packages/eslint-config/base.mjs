import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';
import importRules from './import-rules.mjs';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/build/**',
      '**/out/**',
      '**/generated/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },

  {
    plugins: {
      import: importPlugin,
    },

    ...importRules,
  },
);
