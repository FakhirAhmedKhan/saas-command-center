export default {
  rules: {
    'import/no-duplicates': [
      'error',
      {
        'prefer-inline': true,
      },
    ],

    'import/order': [
      'error',
      {
        groups: [['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type']],

        'newlines-between': 'never',

        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    'import/newline-after-import': [
      'error',
      {
        count: 1,
      },
    ],

    'import/first': 'error',
  },
};
