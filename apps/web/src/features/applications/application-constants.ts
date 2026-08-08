import type {
  ApplicationCategory,
  ApplicationLinkType,
  ApplicationPriority,
  ApplicationStatus,
  TechnologyType,
} from './application-types';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  IDEA: 'Idea',
  PLANNING: 'Planning',
  IN_DEVELOPMENT: 'In development',
  TESTING: 'Testing',
  LIVE: 'Live',
  MAINTENANCE: 'Maintenance',
  PAUSED: 'Paused',
};

export const STATUS_BADGE_VARIANTS: Record<
  ApplicationStatus,
  'default' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'slate'
> = {
  IDEA: 'slate',
  PLANNING: 'purple',
  IN_DEVELOPMENT: 'blue',
  TESTING: 'yellow',
  LIVE: 'green',
  MAINTENANCE: 'orange',
  PAUSED: 'red',
};

export const PRIORITY_LABELS: Record<ApplicationPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_BADGE_VARIANTS: Record<
  ApplicationPriority,
  'green' | 'blue' | 'orange' | 'red'
> = {
  LOW: 'green',
  MEDIUM: 'blue',
  HIGH: 'orange',
  CRITICAL: 'red',
};

export const CATEGORY_LABELS: Record<ApplicationCategory, string> = {
  SAAS: 'SaaS',
  AI: 'Artificial intelligence',
  MOBILE: 'Mobile',
  ECOMMERCE: 'E-commerce',
  API: 'API',
  INTERNAL_TOOL: 'Internal tool',
  OTHER: 'Other',
};

export const TECHNOLOGY_TYPE_LABELS: Record<TechnologyType, string> = {
  FRONTEND: 'Frontend',
  BACKEND: 'Backend',
  DATABASE: 'Database',
  MOBILE: 'Mobile',
  AI: 'AI',
  INFRASTRUCTURE: 'Infrastructure',
  OTHER: 'Other',
};

export const LINK_TYPE_LABELS: Record<ApplicationLinkType, string> = {
  PRODUCTION: 'Production',
  STAGING: 'Staging',
  REPOSITORY: 'Repository',
  DOCUMENTATION: 'Documentation',
  DESIGN: 'Design',
  API: 'API',
  OTHER: 'Other',
};
