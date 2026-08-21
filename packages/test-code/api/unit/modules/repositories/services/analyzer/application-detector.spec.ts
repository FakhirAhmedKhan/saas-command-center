import { detectApplication, type ApplicationCandidate } from 'src/modules/repositories/services/analyzer/application-detector';

function candidate(overrides: Partial<ApplicationCandidate>): ApplicationCandidate {
  return {
    rootDirectory: 'apps/web',
    packageJson: {},
    hasTypescriptConfig: false,
    rootFileNames: new Set(),
    ...overrides,
  };
}

describe('detectApplication', () => {
  it('marks a Next.js app under apps/ as runnable with high confidence', () => {
    const result = detectApplication(
      candidate({
        rootDirectory: 'apps/web',
        packageJson: {
          name: '@acme/web',
          dependencies: {
            next: '^15.0.0',
          },

          scripts: {
            dev: 'next dev',
            build: 'next build',
          },
        },
      }),
      'pnpm',
    );

    expect(result.runnable).toBe(true);
    expect(result.framework).toBe('Next.js');
    expect(result.name).toBe('Web');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('marks a NestJS app under apps/api as runnable', () => {
    const result = detectApplication(
      candidate({
        rootDirectory: 'apps/api',
        packageJson: {
          name: '@acme/api',
          dependencies: {
            '@nestjs/core': '^11.0.0',
          },

          scripts: {
            'start:dev': 'nest start --watch',
          },
        },
      }),
      'pnpm',
    );

    expect(result.runnable).toBe(true);
    expect(result.framework).toBe('NestJS');
  });

  it('does not flag a shared-types library package as runnable', () => {
    const result = detectApplication(
      candidate({
        rootDirectory: 'packages/shared-types',
        packageJson: {
          name: '@acme/shared-types',
          scripts: {
            build: 'tsc',
          },
        },
      }),
      'pnpm',
    );

    expect(result.runnable).toBe(false);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('does not flag an eslint-config package as runnable', () => {
    const result = detectApplication(
      candidate({
        rootDirectory: 'packages/eslint-config',
        packageJson: {
          name: '@acme/eslint-config',
        },
      }),
      'pnpm',
    );

    expect(result.runnable).toBe(false);
  });

  it('treats a package with a dev/start script but no framework as runnable', () => {
    const result = detectApplication(
      candidate({
        rootDirectory: 'apps/worker',
        packageJson: {
          name: '@acme/worker',
          scripts: {
            start: 'node index.js',
          },
        },
      }),
      'npm',
    );

    expect(result.runnable).toBe(true);
    expect(result.framework).toBe('Node.js');
  });

  it('treats a package with no framework and no dev/start script as not runnable', () => {
    const result = detectApplication(
      candidate({
        rootDirectory: 'packages/utils',
        packageJson: {
          name: '@acme/utils',
          scripts: {
            build: 'tsc',
          },
        },
      }),
      'npm',
    );

    expect(result.runnable).toBe(false);
  });
});
