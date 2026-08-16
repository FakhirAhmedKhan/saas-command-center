import { collectDependencyNames, type ParsedPackageJson } from './package-json.types';

interface FrameworkRule {
  framework: string;
  dependencies: string[];
  language: string;
}

/**
 * Ordered most-specific-first: a Next.js app also depends on react, so
 * next must be checked before the generic react rule.
 */
const FRAMEWORK_RULES: FrameworkRule[] = [
  {
    framework: 'Next.js',
    dependencies: ['next'],
    language: 'TypeScript',
  },
  {
    framework: 'NestJS',
    dependencies: ['@nestjs/core'],
    language: 'TypeScript',
  },
  {
    framework: 'Vite',
    dependencies: ['vite'],
    language: 'TypeScript',
  },
  {
    framework: 'Fastify',
    dependencies: ['fastify'],
    language: 'TypeScript',
  },
  {
    framework: 'Express',
    dependencies: ['express'],
    language: 'TypeScript',
  },
  {
    framework: 'React',
    dependencies: ['react', 'react-dom'],
    language: 'TypeScript',
  },
];

export function detectFramework(packageJson: ParsedPackageJson, hasTypescriptConfig: boolean): {
  framework: string | null;
  language: string | null;
} {
  const dependencyNames = collectDependencyNames(packageJson);

  for (const rule of FRAMEWORK_RULES) {
    if (rule.dependencies.some((dependency) => dependencyNames.has(dependency))) {
      return {
        framework: rule.framework,

        language: hasTypescriptConfig || dependencyNames.has('typescript') ? 'TypeScript' : 'JavaScript',
      };
    }
  }

  const hasNodeEntrypoint = Boolean(packageJson.scripts?.start) || Boolean(packageJson.main) || Boolean(packageJson.scripts?.dev);

  if (hasNodeEntrypoint) {
    return {
      framework: 'Node.js',

      language: hasTypescriptConfig || dependencyNames.has('typescript') ? 'TypeScript' : 'JavaScript',
    };
  }

  return {
    framework: null,
    language: hasTypescriptConfig || dependencyNames.has('typescript') ? 'TypeScript' : null,
  };
}
