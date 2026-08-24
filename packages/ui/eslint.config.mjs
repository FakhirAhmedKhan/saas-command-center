import baseConfig from '@command-center/eslint-config/base';

export default [
  ...baseConfig,

  {
    ignores: ['dist/**'],
  },
];
