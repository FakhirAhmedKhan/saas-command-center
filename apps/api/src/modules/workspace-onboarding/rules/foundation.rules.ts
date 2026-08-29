import type { WorkspaceRule } from './rule-engine';

export const foundationRules: readonly WorkspaceRule[] = [
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
