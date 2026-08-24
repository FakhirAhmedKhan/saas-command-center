import baseConfig from '@command-center/eslint-config/base';
import globals from 'globals';

export default [
  ...baseConfig,

  {
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'playwright-report-fullstack/**', 'test-results/**'],
  },

  /*
   * Node scripts and test-support utilities.
   *
   * Covers:
   * process
   * console
   * Buffer
   * URL
   * setImmediate
   */
  {
    files: ['scripts/**/*.{js,mjs,cjs,ts,mts,cts}', 'test-support/**/*.{js,mjs,cjs,ts,mts,cts}'],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  /*
   * CommonJS configuration files.
   *
   * require/module/__dirname are valid here.
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
   * Jest / API unit and E2E test source.
   */
  {
    files: ['e2e/**/*.{ts,tsx,mts,cts}', 'unit/**/*.{ts,tsx,mts,cts}', 'helpers/**/*.{ts,tsx,mts,cts}', 'fixtures/**/*.{ts,tsx,mts,cts}', '**/*.spec.{ts,tsx,mts,cts}', '**/*.test.{ts,tsx,mts,cts}'],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  /*
   * TypeScript resolves undefined identifiers itself.
   * Keep the remaining useful TS lint rules enabled.
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
