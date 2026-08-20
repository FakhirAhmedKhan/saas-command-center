import { detectCommands } from 'src/modules/repositories/services/analyzer/command-detector';

describe('detectCommands', () => {
  it('extracts dev, build, start, test and lint scripts', () => {
    const commands = detectCommands(
      {
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          test: 'jest',
          lint: 'eslint .',
        },
      },
      'pnpm',
    );

    expect(commands).toEqual({
      dev: 'pnpm run dev',
      build: 'pnpm run build',
      start: 'pnpm run start',
      test: 'pnpm run test',
      lint: 'pnpm run lint',
    });
  });

  it('falls back to alternate script names', () => {
    const commands = detectCommands(
      {
        scripts: {
          'start:dev': 'nest start --watch',
          'start:prod': 'node dist/main.js',
        },
      },
      'npm',
    );

    expect(commands.dev).toBe('npm run start:dev');
    expect(commands.start).toBe('npm run start:prod');
  });

  it('uses the run prefix for the detected package manager', () => {
    const commands = detectCommands(
      {
        scripts: {
          build: 'vite build',
        },
      },
      'yarn',
    );

    expect(commands.build).toBe('yarn run build');
  });

  it('omits commands that have no matching script', () => {
    const commands = detectCommands(
      {
        scripts: {
          build: 'tsc',
        },
      },
      'npm',
    );

    expect(commands).toEqual({
      build: 'npm run build',
    });
  });

  it('ignores blank scripts', () => {
    const commands = detectCommands(
      {
        scripts: {
          dev: '   ',
        },
      },
      'npm',
    );

    expect(commands.dev).toBeUndefined();
  });

  it('returns an empty object when there are no scripts', () => {
    expect(detectCommands({}, 'npm')).toEqual({});
  });
});
