import styleConfig from '@command-center/eslint-config/style';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  ...nextVitals,
  ...nextTs,

  styleConfig,

  {
    ignores: ['.next/**', 'out/**', 'build/**', 'coverage/**', 'playwright-report/**', 'playwright-report-fullstack/**', 'test-results/**', 'next-env.d.ts'],
  },
];
