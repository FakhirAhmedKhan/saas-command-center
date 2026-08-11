export const APPLICATION_STATUSES = ['IDEA', 'PLANNING', 'IN_DEVELOPMENT', 'TESTING', 'LIVE', 'MAINTENANCE', 'PAUSED'] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type ApplicationPriority = (typeof APPLICATION_PRIORITIES)[number];

export const APPLICATION_CATEGORIES = ['SAAS', 'AI', 'MOBILE', 'ECOMMERCE', 'API', 'INTERNAL_TOOL', 'OTHER'] as const;

export type ApplicationCategory = (typeof APPLICATION_CATEGORIES)[number];

export const APPLICATION_SORT_FIELDS = ['name', 'status', 'priority', 'createdAt', 'updatedAt', 'targetLaunchAt'] as const;

export type ApplicationSortBy = (typeof APPLICATION_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

export interface CreateApplicationInput {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  category?: ApplicationCategory;
  status?: ApplicationStatus;
  priority?: ApplicationPriority;
  startedAt?: string | null;
  targetLaunchAt?: string | null;
  launchedAt?: string | null;
}

export type UpdateApplicationInput = Partial<CreateApplicationInput>;

export interface ApplicationListQueryInput {
  search?: string;
  status?: ApplicationStatus;
  priority?: ApplicationPriority;
  category?: ApplicationCategory;
  archived?: boolean;
  sortBy?: ApplicationSortBy;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}

export const TECHNOLOGY_TYPES = ['FRONTEND', 'BACKEND', 'DATABASE', 'MOBILE', 'AI', 'INFRASTRUCTURE', 'OTHER'] as const;

export type TechnologyType = (typeof TECHNOLOGY_TYPES)[number];

export const APPLICATION_LINK_TYPES = ['PRODUCTION', 'STAGING', 'REPOSITORY', 'DOCUMENTATION', 'DESIGN', 'API', 'OTHER'] as const;

export type ApplicationLinkType = (typeof APPLICATION_LINK_TYPES)[number];

export interface ApplicationTechnology {
  id: string;
  applicationId: string;
  name: string;
  type: TechnologyType;
  version: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationLink {
  id: string;
  applicationId: string;
  label: string;
  type: ApplicationLinkType;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaasApplication {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  category: ApplicationCategory;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  startedAt: string | null;
  targetLaunchAt: string | null;
  launchedAt: string | null;
  lastActivityAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progressPercent: number;
  progressUpdatedAt: string | null;
  technologies: ApplicationTechnology[];
  links: ApplicationLink[];
  _count?: {
    technologies: number;
    links: number;
    activities: number;
  };
}

export interface ApplicationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApplicationListResponse {
  data: SaasApplication[];
  meta: ApplicationPagination;
}

export interface CreateApplicationTechnologyInput {
  name: string;
  type: TechnologyType;
  version?: string | null;
}

export type UpdateApplicationTechnologyInput = Partial<CreateApplicationTechnologyInput>;

export interface CreateApplicationLinkInput {
  label: string;
  type: ApplicationLinkType;
  url: string;
}

export type UpdateApplicationLinkInput = Partial<CreateApplicationLinkInput>;
