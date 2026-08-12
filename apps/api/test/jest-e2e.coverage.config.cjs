const baseConfig = require('./jest-e2e.config.cjs');

const config = {
  ...baseConfig,

  coverageReporters: ['json'],

  /*
   * E2E processes record only production code they execute.
   *
   * The complete source universe comes from the unit coverage
   * run and is merged with these execution maps afterwards.
   */
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/src/generated/', '/test/', '\\.spec\\.ts$', '\\.test\\.ts$'],
};

delete config.collectCoverageFrom;

module.exports = config;
