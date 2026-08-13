import importRules from '@command-center/eslint-config/import-rules';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default [
  ...nextVitals,
  ...nextTs,

  {
    ...importRules,
  },

  {
    ignores: ['.next/**', 'out/**', 'build/**', 'coverage/**', 'playwright-report/**', 'playwright-report-fullstack/**', 'test-results/**', 'next-env.d.ts'],
  },
];
