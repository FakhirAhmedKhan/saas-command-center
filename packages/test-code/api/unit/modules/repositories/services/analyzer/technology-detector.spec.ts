import { detectTechnologies } from 'src/modules/repositories/services/analyzer/technology-detector';

describe('detectTechnologies', () => {
  it('detects a typical Next.js + Prisma + Postgres stack', () => {
    const technologies = detectTechnologies(
      {
        dependencies: {
          next: '^15.0.0',
          '@prisma/client': '^6.0.0',
          tailwindcss: '^4.0.0',
        },

        devDependencies: {
          typescript: '^5.6.0',
          prisma: '^6.0.0',
        },
      },
      new Set(),
    );

    expect(technologies).toEqual(expect.arrayContaining(['Prisma', 'PostgreSQL', 'Tailwind CSS', 'TypeScript']));
  });

  it('detects Docker from a Dockerfile even without a matching dependency', () => {
    const technologies = detectTechnologies({}, new Set(['Dockerfile']));

    expect(technologies).toContain('Docker');
  });

  it('detects testing tooling', () => {
    const technologies = detectTechnologies(
      {
        devDependencies: {
          vitest: '^2.0.0',
          '@playwright/test': '^1.45.0',
        },
      },
      new Set(),
    );

    expect(technologies).toEqual(expect.arrayContaining(['Vitest', 'Playwright']));
  });

  it('returns an empty array for a package with no recognized dependencies', () => {
    expect(detectTechnologies({}, new Set())).toEqual([]);
  });
});
