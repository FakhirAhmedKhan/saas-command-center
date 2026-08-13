const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],

  rootDir: repoRoot,

  testEnvironment: 'node',

  roots: ['<rootDir>/apps/api/src', '<rootDir>/packages/test-code/api'],

  testRegex: 'packages/test-code/api/e2e/.*\\.e2e-spec\\.ts$',

  transform: {
    '^.+\\.(t|j)s$': [
      require.resolve('ts-jest'),
      {
        tsconfig: path.join(__dirname, 'tsconfig.json'),
      },
    ],
  },

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/apps/api/src/$1',
  },

  setupFiles: [path.join(__dirname, 'setup-env.ts')],

  collectCoverageFrom: ['apps/api/src/**/*.ts', '!apps/api/src/generated/**', '!apps/api/src/**/*.spec.ts', '!apps/api/src/**/*.test.ts'],

  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/apps/api/src/generated/', '\\.spec\\.ts$', '\\.test\\.ts$'],

  coverageDirectory: '<rootDir>/apps/api/coverage/e2e',

  testTimeout: 30000,

  maxWorkers: 1,

  detectOpenHandles: true,

  forceExit: false,
};
