export type ReleaseStatus =
    | 'DRAFT'
    | 'SCHEDULED'
    | 'IN_PROGRESS'
    | 'SUCCESSFUL'
    | 'FAILED'
    | 'ROLLED_BACK';

export type DeploymentStatus =
    ReleaseStatus;

export interface UserSummary {
    id: string;
    name:
    string | null;
    email: string;
}

export interface Release {
    id: string;
    version: string;
    name:
    string | null;
    notes:
    string | null;
    commitRef:
    string | null;
    repositoryUrl:
    string | null;
    status:
    ReleaseStatus;
    scheduledAt:
    string | null;
    releasedAt:
    string | null;
    createdAt:
    string;
    updatedAt:
    string;

    createdBy:
    UserSummary;

    _count?: {
        deployments:
        number;
    };
}

export interface DeploymentActivity {
    id: string;
    action: string;
    fromStatus:
    DeploymentStatus | null;
    toStatus:
    DeploymentStatus | null;
    message:
    string | null;
    metadata:
    Record<
        string,
        unknown
    > | null;
    createdAt:
    string;
    actor:
    UserSummary;
}

export interface Deployment {
    id: string;
    releaseId: string;
    environmentId:
    string;
    attempt: number;

    status:
    DeploymentStatus;

    commitRef:
    string | null;

    repositoryUrl:
    string | null;

    ciJobUrl:
    string | null;

    liveUrl:
    string | null;

    deploymentNotes:
    string | null;

    failureReason:
    string | null;

    scheduledAt:
    string | null;

    startedAt:
    string | null;

    finishedAt:
    string | null;

    durationMs:
    number | null;

    statusChangedAt:
    string;

    createdAt:
    string;

    release:
    Release;

    environment: {
        id: string;
        name: string;
    };

    deployedBy:
    UserSummary | null;

    healthIncident: {
        id: string;
        status: string;
        summary: string;
        startedAt: string;
        resolvedAt:
        string | null;
    } | null;

    rollbackTo: {
        id: string;
        release:
        Release;
        environment: {
            id: string;
            name: string;
        };
    } | null;

    activities:
    DeploymentActivity[];

    allowedTransitions:
    DeploymentStatus[];
}

export interface CurrentEnvironmentVersion {
    environmentId:
    string;

    environmentName:
    string;

    deploymentId:
    string | null;

    releaseId:
    string | null;

    version:
    string | null;

    status:
    DeploymentStatus | null;

    deployedAt:
    string | null;

    liveUrl:
    string | null;
}

export interface DeploymentOptions {
    canManage:
    boolean;

    environments: Array<{
        id: string;
        name: string;
    }>;

    openIncidents: Array<{
        id: string;
        name: string;
        summary: string;
        startedAt:
        string;
    }>;
}

export interface PaginatedResponse<T> {
    items: T[];

    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages:
        number;
        hasPreviousPage:
        boolean;
        hasNextPage:
        boolean;
    };
}