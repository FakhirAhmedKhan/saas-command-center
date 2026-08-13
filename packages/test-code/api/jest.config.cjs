const path = require('node:path');

const testRoot = __dirname;
const repoRoot = path.resolve(testRoot, '../../..');
const apiRoot = path.join(repoRoot, 'apps/api');

module.exports = {
  rootDir: repoRoot,

  testEnvironment: 'node',

  roots: [
    path.join(testRoot, 'unit'),
    path.join(apiRoot, 'src'),
  ],

  testMatch: [
    '<rootDir>/packages/test-code/api/unit/**/*.spec.ts',
  ],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: path.join(apiRoot, 'tsconfig.json'),
      },
    ],
  },

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/apps/api/src/$1',
  },

  moduleFileExtensions: [
    'ts',
    'js',
    'json',
  ],

  clearMocks: true,

  collectCoverageFrom: [
    '<rootDir>/apps/api/src/**/*.ts',
    '!<rootDir>/apps/api/src/generated/**',
    '!<rootDir>/apps/api/src/**/*.spec.ts',
    '!<rootDir>/apps/api/src/main.ts',
  ],
};