import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'src/generated/**'],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['src/**/*.ts', 'test/**/*.ts'],

    plugins: {
      '@stylistic': stylistic,
    },

    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',

      '@stylistic/padding-line-between-statements': [
        'error',

        // No empty lines between imports
        {
          blankLine: 'never',
          prev: 'import',
          next: 'import',
        },

        // One empty line after all imports
        {
          blankLine: 'always',
          prev: 'import',
          next: '*',
        },
      ],
    },
  },
);
