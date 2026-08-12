module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],

  rootDir: '.',

  testRegex: '.*\\.spec\\.ts$',

  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  /*
   * Strict production-code universe.
   *
   * Everything under src is measured except generated code
   * and test files.
   */
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/**/*.spec.ts', '!src/**/*.test.ts'],

  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/src/generated/', '\\.spec\\.ts$', '\\.test\\.ts$'],

  coverageDirectory: 'coverage',

  testEnvironment: 'node',
};
