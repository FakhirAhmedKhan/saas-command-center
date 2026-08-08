const path = require('node:path');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],

  rootDir: '..',

  testEnvironment: 'node',

  testRegex: 'test/.*\\.e2e-spec\\.ts$',

  transform: {
    '^.+\\.(t|j)s$': [
      require.resolve('ts-jest'),
      {
        tsconfig: path.join(__dirname, 'tsconfig.json'),
      },
    ],
  },

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  setupFiles: ['<rootDir>/test/setup-env.ts'],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/main.ts',
    '!src/generated/**',
    '!src/**/*.module.ts',
  ],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src/generated/',
    '\\.spec\\.ts$',
    '\\.test\\.ts$',
  ],

  coverageDirectory: '<rootDir>/coverage/e2e',

  testTimeout: 30000,

  maxWorkers: 1,

  detectOpenHandles: true,

  forceExit: false,
};
