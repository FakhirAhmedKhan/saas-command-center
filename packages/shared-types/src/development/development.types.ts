export const MILESTONE_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const APPLICATION_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'SKIPPED'] as const;

export type ApplicationTaskStatus = (typeof APPLICATION_TASK_STATUSES)[number];

export const WORK_ITEM_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];

export const BLOCKER_STATUSES = ['OPEN', 'RESOLVED'] as const;

export type BlockerStatus = (typeof BLOCKER_STATUSES)[number];

export const DEVELOPMENT_TEMPLATE_TYPES = ['STANDARD_SAAS', 'AI_SAAS', 'MOBILE', 'API', 'ECOMMERCE'] as const;

export type DevelopmentTemplateType = (typeof DEVELOPMENT_TEMPLATE_TYPES)[number];

export interface DevelopmentUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface ApplicationBlocker {
  id: string;
  applicationId: string;
  milestoneId: string | null;
  taskId: string | null;
  title: string;
  description: string | null;
  severity: WorkItemPriority;
  status: BlockerStatus;
  openedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;

  milestone?: {
    id: string;
    title: string;
  } | null;

  task?: {
    id: string;
    title: string;
  } | null;
}

export interface ApplicationTask {
  id: string;
  milestoneId: string;
  assigneeUserId: string | null;
  title: string;
  description: string | null;
  status: ApplicationTaskStatus;
  priority: WorkItemPriority;
  weight: number;
  position: number;
  dueAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  skipReason: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: DevelopmentUser | null;
  blockers: ApplicationBlocker[];
  milestoneTitle?: string;
}

export interface ApplicationMilestone {
  id: string;
  applicationId: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  weight: number;
  position: number;
  progressPercent: number;
  startsAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  skipReason: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: ApplicationTask[];
  blockers: ApplicationBlocker[];
}

export interface DevelopmentTemplate {
  type: DevelopmentTemplateType;
  label: string;
  description: string;
  milestoneCount: number;
  taskCount: number;
}

export interface MilestoneProgressExplanation {
  milestoneId: string;
  title: string;
  included: boolean;
  weight: number;
  progressPercent: number;
  applicableTaskWeight: number;
  completedTaskWeight: number;
  excludedTaskCount: number;
  derivedStatus: MilestoneStatus;
}

export interface ApplicationProgressExplanation {
  percentage: number;
  totalMilestoneWeight: number;
  weightedProgressPoints: number;
  includedMilestones: number;
  excludedMilestones: number;
  formula: string;
  milestones: MilestoneProgressExplanation[];
}

export interface DevelopmentSummary {
  application: {
    id: string;
    workspaceId: string;
    name: string;
    archivedAt: string | null;
    progressPercent: number;
    progressUpdatedAt: string | null;
    developmentTemplate: DevelopmentTemplateType | null;
    templateAppliedAt: string | null;
  };

  progress: ApplicationProgressExplanation;

  counts: {
    milestones: number;
    tasks: number;
    completedTasks: number;
    skippedTasks: number;
    openBlockers: number;
    overdueTasks: number;
    upcomingTasks: number;
  };

  milestones: ApplicationMilestone[];
  blockers: ApplicationBlocker[];
  overdueTasks: ApplicationTask[];
  upcomingTasks: ApplicationTask[];
}

export interface CreateMilestoneInput {
  title: string;
  description?: string | null;
  weight?: number;
  startsAt?: string | null;
  dueAt?: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: WorkItemPriority;
  weight?: number;
  assigneeUserId?: string | null;
  dueAt?: string | null;
}

export interface CreateBlockerInput {
  title: string;
  description?: string | null;
  severity?: WorkItemPriority;
  milestoneId?: string | null;
  taskId?: string | null;
}
