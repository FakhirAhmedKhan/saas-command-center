import { collectDependencyNames, type ParsedPackageJson } from './package-json.types';

interface TechnologyRule {
  label: string;
  match(dependencyNames: ReadonlySet<string>): boolean;
}

const TECHNOLOGY_RULES: TechnologyRule[] = [
  {
    label: 'TypeScript',
    match: (deps) => deps.has('typescript'),
  },
  {
    label: 'Tailwind CSS',
    match: (deps) => deps.has('tailwindcss'),
  },
  {
    label: 'Prisma',
    match: (deps) => deps.has('@prisma/client') || deps.has('prisma'),
  },
  {
    label: 'PostgreSQL',
    match: (deps) => deps.has('pg') || deps.has('postgres') || deps.has('@prisma/client'),
  },
  {
    label: 'MongoDB',
    match: (deps) => deps.has('mongodb') || deps.has('mongoose'),
  },
  {
    label: 'Redis',
    match: (deps) => deps.has('ioredis') || deps.has('redis'),
  },
  {
    label: 'GraphQL',
    match: (deps) => deps.has('graphql') || deps.has('@nestjs/graphql') || deps.has('apollo-server'),
  },
  {
    label: 'tRPC',
    match: (deps) => deps.has('@trpc/server') || deps.has('@trpc/client'),
  },
  {
    label: 'Jest',
    match: (deps) => deps.has('jest') || deps.has('@nestjs/testing'),
  },
  {
    label: 'Vitest',
    match: (deps) => deps.has('vitest'),
  },
  {
    label: 'Playwright',
    match: (deps) => deps.has('@playwright/test') || deps.has('playwright'),
  },
  {
    label: 'Cypress',
    match: (deps) => deps.has('cypress'),
  },
  {
    label: 'JWT Auth',
    match: (deps) => deps.has('jsonwebtoken') || deps.has('@nestjs/jwt') || deps.has('next-auth') || deps.has('passport-jwt'),
  },
  {
    label: 'Passport',
    match: (deps) => deps.has('passport'),
  },
  {
    label: 'Stripe',
    match: (deps) => deps.has('stripe') || deps.has('@stripe/stripe-js'),
  },
  {
    label: 'Redux',
    match: (deps) => deps.has('redux') || deps.has('@reduxjs/toolkit'),
  },
  {
    label: 'Zustand',
    match: (deps) => deps.has('zustand'),
  },
  {
    label: 'React Query',
    match: (deps) => deps.has('@tanstack/react-query') || deps.has('react-query'),
  },
];

export function detectTechnologies(packageJson: ParsedPackageJson, rootFileNames: ReadonlySet<string>): string[] {
  const dependencyNames = collectDependencyNames(packageJson);

  const technologies = new Set<string>();

  for (const rule of TECHNOLOGY_RULES) {
    if (rule.match(dependencyNames)) {
      technologies.add(rule.label);
    }
  }

  if (rootFileNames.has('Dockerfile') || rootFileNames.has('docker-compose.yml') || rootFileNames.has('docker-compose.yaml')) {
    technologies.add('Docker');
  }

  return [...technologies].sort((left, right) => left.localeCompare(right));
}
