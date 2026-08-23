import { APPLICATION_TYPES, type ApplicationType, type MobileApplication } from '@command-center/shared-types';

export { APPLICATION_TYPES };
export type { ApplicationType, MobileApplication };
export { APPLICATION_CATEGORIES, APPLICATION_LINK_TYPES, APPLICATION_PRIORITIES, APPLICATION_STATUSES, TECHNOLOGY_TYPES } from '@command-center/shared-types';

export type {
  ApplicationCategory,
  ApplicationLink,
  ApplicationLinkType,
  ApplicationListQueryInput as ApplicationListQuery,
  ApplicationListResponse,
  ApplicationPagination,
  ApplicationPriority,
  ApplicationStatus,
  ApplicationTechnology,
  CreateApplicationInput as CreateApplicationPayload,
  CreateApplicationLinkInput as CreateApplicationLinkPayload,
  CreateApplicationTechnologyInput as CreateTechnologyPayload,
  SaasApplication,
  TechnologyType,
  UpdateApplicationInput as UpdateApplicationPayload,
  UpdateApplicationLinkInput as UpdateApplicationLinkPayload,
  UpdateApplicationTechnologyInput as UpdateTechnologyPayload,
} from '@command-center/shared-types';
