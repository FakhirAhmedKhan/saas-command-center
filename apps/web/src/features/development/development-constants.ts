import type {
    ApplicationTaskStatus,
    BlockerStatus,
    DevelopmentTemplateType,
    MilestoneStatus,
    WorkItemPriority,
} from './development-types';

export type BadgeVariant =
    | 'default'
    | 'blue'
    | 'green'
    | 'yellow'
    | 'orange'
    | 'red'
    | 'purple'
    | 'slate';

export const MILESTONE_STATUS_LABELS: Record<
    MilestoneStatus,
    string
> = {
    PLANNED: 'Planned',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    SKIPPED: 'Skipped',
};

export const MILESTONE_STATUS_VARIANTS: Record<
    MilestoneStatus,
    BadgeVariant
> = {
    PLANNED: 'slate',
    IN_PROGRESS: 'blue',
    COMPLETED: 'green',
    SKIPPED: 'yellow',
};

export const TASK_STATUS_LABELS: Record<
    ApplicationTaskStatus,
    string
> = {
    TODO: 'To do',
    IN_PROGRESS: 'In progress',
    BLOCKED: 'Blocked',
    COMPLETED: 'Completed',
    SKIPPED: 'Skipped',
};

export const TASK_STATUS_VARIANTS: Record<
    ApplicationTaskStatus,
    BadgeVariant
> = {
    TODO: 'slate',
    IN_PROGRESS: 'blue',
    BLOCKED: 'red',
    COMPLETED: 'green',
    SKIPPED: 'yellow',
};

export const PRIORITY_LABELS: Record<
    WorkItemPriority,
    string
> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
};

export const PRIORITY_VARIANTS: Record<
    WorkItemPriority,
    BadgeVariant
> = {
    LOW: 'green',
    MEDIUM: 'blue',
    HIGH: 'orange',
    CRITICAL: 'red',
};

export const BLOCKER_STATUS_LABELS: Record<
    BlockerStatus,
    string
> = {
    OPEN: 'Open',
    RESOLVED: 'Resolved',
};

export const TEMPLATE_LABELS: Record<
    DevelopmentTemplateType,
    string
> = {
    STANDARD_SAAS: 'Standard SaaS',
    AI_SAAS: 'AI SaaS',
    MOBILE: 'Mobile',
    API: 'API',
    ECOMMERCE: 'E-commerce',
};