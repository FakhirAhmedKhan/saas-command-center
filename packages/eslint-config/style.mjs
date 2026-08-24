import stylistic from '@stylistic/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

import importRules from './import-rules.mjs';

export default {
  plugins: {
    import: importPlugin,
    '@stylistic': stylistic,
  },

  rules: {
    ...importRules.rules,

    /*
     * Normal consecutive variable declarations stay compact:
     *
     * const first = 1;
     * const second = 2;
     * const third = 3;
     *
     * CommonJS imports are the exception.
     *
     * Example:
     *
     * const path = require('node:path');
     * const fs = require('node:fs');
     *
     * const rootDir = path.resolve(__dirname);
     *
     * eslint-plugin-import treats require(...) declarations as imports and
     * import/newline-after-import requires a blank line after the final
     * CommonJS import. Without the cjs-import exceptions below, that rule
     * conflicts with the generic const → const compact rule and causes
     * ESLintCircularFixesWarning.
     */
    '@stylistic/padding-line-between-statements': [
      'error',

      /*
       * General compact variable declaration policy.
       */
      {
        blankLine: 'never',
        prev: ['const', 'let', 'var'],
        next: ['const', 'let', 'var'],
      },

      /*
       * A CommonJS import block must be separated from normal code.
       *
       * const path = require(...);
       *
       * const root = ...;
       */
      {
        blankLine: 'always',
        prev: 'cjs-import',
        next: '*',
      },

      /*
       * But multiple CommonJS imports themselves stay together.
       *
       * const path = require(...);
       * const fs = require(...);
       */
      {
        blankLine: 'never',
        prev: 'cjs-import',
        next: 'cjs-import',
      },
    ],
  },
};
