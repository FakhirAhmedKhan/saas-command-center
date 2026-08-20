import { detectFramework } from 'src/modules/repositories/services/analyzer/framework-detector';

describe('detectFramework', () => {
  it('detects Next.js even when react is also present', () => {
    const result = detectFramework(
      {
        dependencies: {
          next: '^15.0.0',
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
      },
      true,
    );

    expect(result.framework).toBe('Next.js');
    expect(result.language).toBe('TypeScript');
  });

  it('detects NestJS from @nestjs/core', () => {
    const result = detectFramework(
      {
        dependencies: {
          '@nestjs/core': '^11.0.0',
        },
      },
      true,
    );

    expect(result.framework).toBe('NestJS');
  });

  it('detects Vite before falling back to plain React', () => {
    const result = detectFramework(
      {
        devDependencies: {
          vite: '^6.0.0',
        },

        dependencies: {
          react: '^19.0.0',
        },
      },
      false,
    );

    expect(result.framework).toBe('Vite');
  });

  it('detects Express', () => {
    const result = detectFramework(
      {
        dependencies: {
          express: '^4.19.0',
        },
      },
      false,
    );

    expect(result.framework).toBe('Express');
  });

  it('detects Fastify', () => {
    const result = detectFramework(
      {
        dependencies: {
          fastify: '^5.0.0',
        },
      },
      false,
    );

    expect(result.framework).toBe('Fastify');
  });

  it('falls back to Node.js when a start script exists with no known framework', () => {
    const result = detectFramework(
      {
        scripts: {
          start: 'node index.js',
        },
      },
      false,
    );

    expect(result.framework).toBe('Node.js');
  });

  it('reports JavaScript when there is no tsconfig and no typescript dependency', () => {
    const result = detectFramework(
      {
        dependencies: {
          express: '^4.19.0',
        },
      },
      false,
    );

    expect(result.language).toBe('JavaScript');
  });

  it('returns null framework for a package with no runnable signal', () => {
    const result = detectFramework({}, false);

    expect(result.framework).toBeNull();
  });
});
