import baseConfig from '@command-center/eslint-config/base';
import globals from 'globals';

export default [
  ...baseConfig,

  {
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'playwright-report-fullstack/**', 'test-results/**'],
  },

  /*
   * Tracker build/test scripts execute in Node.js.
   *
   * Covers:
   * process
   * console
   * Buffer
   * setImmediate
   * __dirname-like Node runtime APIs where applicable
   */
  {
    files: ['scripts/**/*.{js,mjs,cjs,ts,mts,cts}'],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  /*
   * Tracker test harness intentionally uses BOTH environments:
   *
   * Node:
   *   process
   *   console
   *   setImmediate
   *
   * Browser:
   *   URL
   *   Blob
   *   window
   *   document
   *   navigator
   *
   * This is test infrastructure, so declaring both environments
   * accurately describes the runtime rather than disabling no-undef.
   */
  {
    files: ['test-support/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}', 'unit/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}', 'test/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}', 'e2e/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  /*
   * Test fixtures/mocks may intentionally use broad types.
   */
  {
    files: ['**/*.{ts,tsx,mts,cts}'],

    rules: {
      'no-undef': 'off',

      '@typescript-eslint/no-explicit-any': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
