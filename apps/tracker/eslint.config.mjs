import baseConfig from '@command-center/eslint-config/base';
import globals from 'globals';

export default [
  ...baseConfig,

  // Node.js build/dev/server/test scripts
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Test harness uses Node + browser APIs
  {
    files: ['test-support/**/*.mjs', 'test/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  // Tracker source runs in browsers
  {
    files: ['src/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
