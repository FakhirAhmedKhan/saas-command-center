import type { WorkspaceRule } from './rule-engine';

export const foundationRules: readonly WorkspaceRule[] = [
  {
    id: 'web-next-typescript',
    version: '1.0.0',
    priority: 100,
    when: ({ answers }) => answers.applicationTypes?.includes('WEB') === true,
    apply: (draft) => {
      draft.applications.push({
        type: 'WEB',
        name: `${draft.workspace.name} Web`,
        platforms: ['WEB'],
        stack: ['NEXT_JS', 'TYPESCRIPT'],
      });
    },
    explanation: 'Web products use the supported Next.js and TypeScript baseline.',
  },
  {
    id: 'mobile-native-defaults',
    version: '1.0.0',
    priority: 200,
    when: ({ answers }) => answers.applicationTypes?.includes('MOBILE') === true,
    apply: (draft, { answers }) => {
      const platforms = answers.mobilePlatforms?.length ? answers.mobilePlatforms : (['ANDROID', 'IOS'] as const);
      const stack = [...(platforms.includes('ANDROID') ? (['KOTLIN', 'JETPACK_COMPOSE'] as const) : []), ...(platforms.includes('IOS') ? (['SWIFT', 'SWIFTUI'] as const) : [])];

      draft.applications.push({
        type: 'MOBILE',
        name: `${draft.workspace.name} Mobile`,
        platforms: [...platforms],
        stack,
      });
    },
    explanation: 'Native mobile defaults follow the selected Android and iOS platforms.',
  },
  {
    id: 'desktop-tauri-default',
    version: '1.0.0',
    priority: 300,
    when: ({ answers }) => answers.applicationTypes?.includes('DESKTOP') === true,
    apply: (draft, { answers }) => {
      draft.applications.push({
        type: 'DESKTOP',
        name: `${draft.workspace.name} Desktop`,
        platforms: answers.desktopPlatforms?.length ? answers.desktopPlatforms : ['WINDOWS'],
        stack: ['TAURI', 'TYPESCRIPT'],
      });
    },
    explanation: 'Tauri provides the supported lightweight desktop baseline.',
  },
  {
    id: 'core-services',
    version: '1.0.0',
    priority: 400,
    when: () => true,
    apply: (draft) => {
      draft.services.backend = ['NEST_JS'];
      draft.services.database = ['POSTGRESQL'];
    },
    explanation: 'The platform baseline uses NestJS and PostgreSQL.',
  },
  {
    id: 'authentication-service',
    version: '1.0.0',
    priority: 500,
    when: ({ answers }) => answers.authentication === true,
    apply: (draft) => {
      draft.services.authentication = ['EMAIL_PASSWORD'];
    },
    explanation: 'User accounts require an initial email and password authentication method.',
  },
  {
    id: 'realtime-cache',
    version: '1.0.0',
    priority: 600,
    when: ({ answers }) => answers.collaboration === true,
    apply: (draft) => {
      draft.services.cache = ['REDIS'];
    },
    explanation: 'Real-time collaboration uses Redis coordination.',
  },
];
