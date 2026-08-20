import baseConfig from '@command-center/eslint-config/base';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...baseConfig,

  {
    ignores: ['dist/**', 'coverage/**', 'src/generated/**'],
  },

  // Production API source: strict type-aware linting
  {
    files: ['src/**/*.ts'],

    extends: [...tseslint.configs.recommendedTypeChecked],

    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // E2E/tests: lint code quality without strict unsafe-* type rules
  {
    files: ['test/**/*.ts'],

    extends: [tseslint.configs.disableTypeChecked],

    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/require-await': 'off',
    },
  },

  // Scripts/config TypeScript files
  {
    files: ['scripts/**/*.ts', 'prisma.config.ts'],

    extends: [tseslint.configs.disableTypeChecked],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // JS / MJS / CJS configuration files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],

    extends: [tseslint.configs.disableTypeChecked],

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },

    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
