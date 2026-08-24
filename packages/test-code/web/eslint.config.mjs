import baseConfig from '@command-center/eslint-config/base';
import globals from 'globals';

export default [
  ...baseConfig,

  {
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'playwright-report-fullstack/**', 'test-results/**'],
  },

  /*
   * Node-powered test infrastructure.
   *
   * Covers:
   * - Playwright/full-stack fixture servers
   * - mock API servers
   * - scripts
   * - test-support utilities
   * - configuration files
   *
   * Provides:
   * process
   * console
   * Buffer
   * setImmediate
   * URL
   */
  {
    files: ['scripts/**/*.{js,mjs,cjs,ts,mts,cts}', 'test-support/**/*.{js,mjs,cjs,ts,mts,cts}', 'e2e/full-stack/fixtures/**/*.{js,mjs,cjs,ts,mts,cts}', '**/*.config.{js,mjs,cjs,ts,mts,cts}'],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  /*
   * CommonJS configuration/support files.
   */
  {
    files: ['**/*.cjs'],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },

    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  /*
   * Browser-oriented frontend unit tests.
   *
   * jsdom/browser APIs such as:
   * window
   * document
   * navigator
   * localStorage
   * URL
   * Blob
   */
  {
    files: ['unit/**/*.{js,jsx,ts,tsx,mjs,mts}'],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  /*
   * TypeScript already handles undefined identifier checking.
   *
   * Test fixtures/mocks are also allowed to use broader test-only types.
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
