import type { WorkspaceOnboardingAnswers, WorkspaceQuestionDefinition } from '@command-center/shared-types';

interface CatalogQuestion extends WorkspaceQuestionDefinition {
  visibleWhen?: (answers: WorkspaceOnboardingAnswers) => boolean;
}

export const QUESTION_CATALOG_VERSION = '1.0.0';

export const questionCatalog: readonly CatalogQuestion[] = [
  {
    key: 'productIdea',
    prompt: 'What are you building?',
    type: 'TEXT',
    required: true,
  },
  {
    key: 'workspaceName',
    prompt: 'What should the workspace be called?',
    type: 'TEXT',
    required: true,
  },
  {
    key: 'productType',
    prompt: 'What type of product is it?',
    type: 'SINGLE_SELECT',
    required: true,
    options: [
      { label: 'Productivity SaaS', value: 'PRODUCTIVITY_SAAS' },
      { label: 'E-commerce', value: 'ECOMMERCE' },
      { label: 'Marketplace', value: 'MARKETPLACE' },
      { label: 'Social product', value: 'SOCIAL' },
      { label: 'Internal tool', value: 'INTERNAL_TOOL' },
      { label: 'Other', value: 'OTHER' },
    ],
  },
  {
    key: 'targetUsers',
    prompt: 'Who will use the product?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Consumers', value: 'CONSUMERS' },
      { label: 'Businesses', value: 'BUSINESSES' },
      { label: 'Internal teams', value: 'INTERNAL_TEAMS' },
      { label: 'Developers', value: 'DEVELOPERS' },
    ],
  },
  {
    key: 'applicationTypes',
    prompt: 'Which applications do you need?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Web', value: 'WEB' },
      { label: 'Mobile', value: 'MOBILE' },
      { label: 'Desktop', value: 'DESKTOP' },
    ],
  },
  {
    key: 'mobilePlatforms',
    prompt: 'Which mobile platforms do you need?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Android', value: 'ANDROID' },
      { label: 'iOS', value: 'IOS' },
    ],
    visibleWhen: (answers) => answers.applicationTypes?.includes('MOBILE') === true,
  },
  {
    key: 'desktopPlatforms',
    prompt: 'Which desktop platforms do you need?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Windows', value: 'WINDOWS' },
      { label: 'macOS', value: 'MACOS' },
      { label: 'Linux', value: 'LINUX' },
    ],
    visibleWhen: (answers) => answers.applicationTypes?.includes('DESKTOP') === true,
  },
  {
    key: 'coreFeatures',
    prompt: 'Which core features are required?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Dashboard', value: 'DASHBOARD' },
      { label: 'Search', value: 'SEARCH' },
      { label: 'Payments', value: 'PAYMENTS' },
      { label: 'Notifications', value: 'NOTIFICATIONS' },
      { label: 'Real-time collaboration', value: 'COLLABORATION' },
    ],
  },
  {
    key: 'authentication',
    prompt: 'Does the product require user accounts?',
    type: 'BOOLEAN',
    required: true,
  },
  {
    key: 'collaboration',
    prompt: 'Does it require real-time collaboration?',
    type: 'BOOLEAN',
    required: false,
    visibleWhen: (answers) => answers.coreFeatures?.includes('COLLABORATION') === true,
  },
  {
    key: 'notifications',
    prompt: 'Which notification channels are required?',
    type: 'MULTI_SELECT',
    required: false,
    options: [
      { label: 'Email', value: 'EMAIL' },
      { label: 'Push', value: 'PUSH' },
      { label: 'In-app', value: 'IN_APP' },
    ],
    visibleWhen: (answers) => answers.coreFeatures?.includes('NOTIFICATIONS') === true,
  },
  {
    key: 'repositories',
    prompt: 'Do repositories already exist?',
    type: 'SINGLE_SELECT',
    required: true,
    options: [
      { label: 'No repositories', value: 'NONE' },
      { label: 'Connect later', value: 'CONNECT_LATER' },
      { label: 'Connect now', value: 'CONNECT_NOW' },
    ],
  },
  {
    key: 'environments',
    prompt: 'Which environments are required?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Development', value: 'DEVELOPMENT' },
      { label: 'Staging', value: 'STAGING' },
      { label: 'Production', value: 'PRODUCTION' },
    ],
  },
  {
    key: 'qualityRequirements',
    prompt: 'Which engineering systems are required?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'CI/CD', value: 'CI_CD' },
      { label: 'Monitoring', value: 'MONITORING' },
      { label: 'Analytics', value: 'ANALYTICS' },
      { label: 'Performance', value: 'PERFORMANCE' },
      { label: 'Alerts', value: 'ALERTS' },
      { label: 'Security', value: 'SECURITY' },
      { label: 'Backups', value: 'BACKUPS' },
    ],
  },
];
