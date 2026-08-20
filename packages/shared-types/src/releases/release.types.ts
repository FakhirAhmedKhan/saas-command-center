export const RELEASE_STATUSES = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'ROLLED_BACK'] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const DEPLOYMENT_STATUSES = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'ROLLED_BACK'] as const;

export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export interface CreateReleaseInput {
  version: string;
  name?: string;
  notes?: string;
  commitRef?: string;
  repositoryUrl?: string;
  scheduledAt?: string;
}

export type UpdateReleaseInput = Partial<CreateReleaseInput>;

export interface CreateDeploymentInput {
  releaseId: string;
  environmentId: string;
  commitRef?: string;
  repositoryUrl?: string;
  ciJobUrl?: string;
  liveUrl?: string;
  deploymentNotes?: string;
  scheduledAt?: string;
  healthIncidentId?: string;
}

export interface TransitionDeploymentInput {
  status: DeploymentStatus;
  scheduledAt?: string;
  failureReason?: string;
  rollbackToDeploymentId?: string;
  healthIncidentId?: string;
  message?: string;
}

export interface DeploymentListQueryInput {
  environmentId?: string;
  releaseId?: string;
  status?: DeploymentStatus;
  page?: number;
  limit?: number;
}

export interface ReleaseListQueryInput {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReleaseUserSummary {
  id: string;
  name: string | null;
  email: string;
}

export interface ReleaseRecord {
  id: string;
  version: string;
  name: string | null;
  notes: string | null;
  commitRef: string | null;
  repositoryUrl: string | null;
  status: ReleaseStatus;
  scheduledAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ReleaseUserSummary;

  _count?: {
    deployments: number;
  };
}

export interface DeploymentActivityRecord {
  id: string;
  action: string;
  fromStatus: DeploymentStatus | null;
  toStatus: DeploymentStatus | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: ReleaseUserSummary;
}

export interface DeploymentRecord {
  id: string;
  releaseId: string;
  environmentId: string;
  attempt: number;
  status: DeploymentStatus;
  commitRef: string | null;
  repositoryUrl: string | null;
  ciJobUrl: string | null;
  liveUrl: string | null;
  deploymentNotes: string | null;
  failureReason: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  statusChangedAt: string;
  createdAt: string;

  release: ReleaseRecord;

  environment: {
    id: string;
    name: string;
  };

  deployedBy: ReleaseUserSummary | null;

  healthIncident: {
    id: string;
    status: string;
    summary: string;
    startedAt: string;
    resolvedAt: string | null;
  } | null;

  rollbackTo: {
    id: string;
    release: ReleaseRecord;
    environment: {
      id: string;
      name: string;
    };
  } | null;

  activities: DeploymentActivityRecord[];

  allowedTransitions: DeploymentStatus[];
}

export interface CurrentEnvironmentVersion {
  environmentId: string;
  environmentName: string;
  deploymentId: string | null;
  releaseId: string | null;
  version: string | null;
  status: DeploymentStatus | null;
  deployedAt: string | null;
  liveUrl: string | null;
}

export interface DeploymentOptions {
  canManage: boolean;

  environments: Array<{
    id: string;
    name: string;
  }>;

  openIncidents: Array<{
    id: string;
    name: string;
    summary: string;
    startedAt: string;
  }>;
}

export interface ReleasePaginatedResponse<T> {
  items: T[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
