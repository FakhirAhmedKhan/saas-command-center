 
 
 

import type { Response } from 'supertest';

import {
  BlockerStatus,
  DevelopmentTemplateType,
  WorkItemPriority,
} from 'src/generated/prisma/enums';

import {
  applicationRoutes,
  asRecord,
  enumValue,
  readApiItems,
  readApiRecord,
  readEntityId,
  recordString,
} from './application';

import { withBearer } from './auth';

import type {
  WorkspaceTestUser,
} from './workspace';

export type ActiveTaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'BLOCKED';

export interface MilestonePayload {
  title: string;
  description?: string | null;
  weight?: number;
  startsAt?: string | null;
  dueAt?: string | null;
}

export interface TaskPayload {
  title: string;
  description?: string | null;
  priority?: WorkItemPriority;
  weight?: number;
  assigneeUserId?: string | null;
  dueAt?: string | null;
}

export interface BlockerPayload {
  title: string;
  description?: string | null;
  severity?: WorkItemPriority;
  milestoneId?: string | null;
  taskId?: string | null;
}

export interface CreatedDevelopmentEntity<
  TPayload,
> {
  id: string;
  payload: TPayload;
  record: Record<string, unknown>;
  response: Response;
}

export const developmentRoutes = {
  templates(
    workspaceId: string,
  ): string {
    return `/api/v1/workspaces/${workspaceId}/development/templates`;
  },

  root(
    workspaceId: string,
    applicationId: string,
  ): string {
    return `/api/v1/workspaces/${workspaceId}/applications/${applicationId}/development`;
  },

  summary(
    workspaceId: string,
    applicationId: string,
  ): string {
    return `${this.root(
      workspaceId,
      applicationId,
    )}/summary`;
  },

  applyTemplate(
    workspaceId: string,
    applicationId: string,
  ): string {
    return `${this.root(
      workspaceId,
      applicationId,
    )}/apply-template`;
  },

  milestones(
    workspaceId: string,
    applicationId: string,
  ): string {
    return `${this.root(
      workspaceId,
      applicationId,
    )}/milestones`;
  },

  milestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
  ): string {
    return `${this.milestones(
      workspaceId,
      applicationId,
    )}/${milestoneId}`;
  },

  completeMilestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
  ): string {
    return `${this.milestone(
      workspaceId,
      applicationId,
      milestoneId,
    )}/complete`;
  },

  reopenMilestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
  ): string {
    return `${this.milestone(
      workspaceId,
      applicationId,
      milestoneId,
    )}/reopen`;
  },

  skipMilestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
  ): string {
    return `${this.milestone(
      workspaceId,
      applicationId,
      milestoneId,
    )}/skip`;
  },

  reorderMilestones(
    workspaceId: string,
    applicationId: string,
  ): string {
    return `${this.milestones(
      workspaceId,
      applicationId,
    )}/reorder`;
  },

  tasks(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
  ): string {
    return `${this.milestone(
      workspaceId,
      applicationId,
      milestoneId,
    )}/tasks`;
  },

  task(
    workspaceId: string,
    applicationId: string,
    taskId: string,
  ): string {
    return `${this.root(
      workspaceId,
      applicationId,
    )}/tasks/${taskId}`;
  },

  taskStatus(
    workspaceId: string,
    applicationId: string,
    taskId: string,
  ): string {
    return `${this.task(
      workspaceId,
      applicationId,
      taskId,
    )}/status`;
  },

  completeTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
  ): string {
    return `${this.task(
      workspaceId,
      applicationId,
      taskId,
    )}/complete`;
  },

  reopenTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
  ): string {
    return `${this.task(
      workspaceId,
      applicationId,
      taskId,
    )}/reopen`;
  },

  skipTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
  ): string {
    return `${this.task(
      workspaceId,
      applicationId,
      taskId,
    )}/skip`;
  },

  moveTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
  ): string {
    return `${this.task(
      workspaceId,
      applicationId,
      taskId,
    )}/move`;
  },

  reorderTasks(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
  ): string {
    return `${this.tasks(
      workspaceId,
      applicationId,
      milestoneId,
    )}/reorder`;
  },

  blockers(
    workspaceId: string,
    applicationId: string,
  ): string {
    return `${this.root(
      workspaceId,
      applicationId,
    )}/blockers`;
  },

  blocker(
    workspaceId: string,
    applicationId: string,
    blockerId: string,
  ): string {
    return `${this.blockers(
      workspaceId,
      applicationId,
    )}/${blockerId}`;
  },

  resolveBlocker(
    workspaceId: string,
    applicationId: string,
    blockerId: string,
  ): string {
    return `${this.blocker(
      workspaceId,
      applicationId,
      blockerId,
    )}/resolve`;
  },

  reopenBlocker(
    workspaceId: string,
    applicationId: string,
    blockerId: string,
  ): string {
    return `${this.blocker(
      workspaceId,
      applicationId,
      blockerId,
    )}/reopen`;
  },
} as const;

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function buildMilestonePayload(
  overrides:
    Partial<MilestonePayload> = {},
): MilestonePayload {
  return {
    title:
      `Milestone ${uniqueSuffix()}`,

    description:
      'Batch 4 development milestone',

    weight: 1,

    ...overrides,
  };
}

export function buildTaskPayload(
  overrides:
    Partial<TaskPayload> = {},
): TaskPayload {
  return {
    title:
      `Task ${uniqueSuffix()}`,

    description:
      'Batch 4 development task',

    priority:
      enumValue(
        WorkItemPriority,
      ),

    weight: 1,

    ...overrides,
  };
}

export function buildBlockerPayload(
  overrides:
    Partial<BlockerPayload> = {},
): BlockerPayload {
  return {
    title:
      `Blocker ${uniqueSuffix()}`,

    description:
      'Batch 4 development blocker',

    severity:
      enumValue(
        WorkItemPriority,
        1,
      ),

    ...overrides,
  };
}

export function expectDevelopmentSuccess(
  response: Response,
): void {
  expect([
    200,
    201,
    202,
  ]).toContain(
    response.status,
  );
}

export function readDevelopmentRecord(
  response: Response,
  preferredKeys:
    string[] = [],
): Record<string, unknown> {
  return readApiRecord(
    response,
    [
      'milestone',
      'task',
      'blocker',
      'summary',
      ...preferredKeys,
    ],
  );
}

export function readDevelopmentItems(
  response: Response,
  preferredKeys:
    string[] = [],
): Record<string, unknown>[] {
  return readApiItems(
    response,
    [
      'milestones',
      'tasks',
      'blockers',
      'templates',
      ...preferredKeys,
    ],
  );
}

export function findRecordById(
  records:
    Record<string, unknown>[],
  id: string,
): Record<string, unknown> | undefined {
  for (const record of records) {
    if (
      recordString(
        record,
        'id',
        'milestoneId',
        'taskId',
        'blockerId',
      ) === id
    ) {
      return record;
    }

    for (
      const value
      of Object.values(record)
    ) {
      if (Array.isArray(value)) {
        const nested =
          value
            .map(asRecord)
            .filter(
              (
                item,
              ): item is Record<
                string,
                unknown
              > => item !== undefined,
            );

        const found =
          findRecordById(
            nested,
            id,
          );

        if (found) {
          return found;
        }
      }
    }
  }

  return undefined;
}

export function findNumberDeep(
  value: unknown,
  keys: string[],
): number | undefined {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found =
        findNumberDeep(
          item,
          keys,
        );

      if (
        found !== undefined
      ) {
        return found;
      }
    }

    return undefined;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  for (const key of keys) {
    const candidate =
      record[key];

    if (
      typeof candidate ===
      'number'
    ) {
      return candidate;
    }
  }

  for (
    const candidate
    of Object.values(record)
  ) {
    const found =
      findNumberDeep(
        candidate,
        keys,
      );

    if (
      found !== undefined
    ) {
      return found;
    }
  }

  return undefined;
}

export function findStringDeep(
  value: unknown,
  keys: string[],
): string | undefined {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found =
        findStringDeep(
          item,
          keys,
        );

      if (found) {
        return found;
      }
    }

    return undefined;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  for (const key of keys) {
    const candidate =
      record[key];

    if (
      typeof candidate ===
      'string'
    ) {
      return candidate;
    }
  }

  for (
    const candidate
    of Object.values(record)
  ) {
    const found =
      findStringDeep(
        candidate,
        keys,
      );

    if (found) {
      return found;
    }
  }

  return undefined;
}

export async function listTemplates(
  actor: WorkspaceTestUser,
): Promise<Response> {
  return actor.agent
    .get(
      developmentRoutes.templates(
        actor.workspaceId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function getDevelopmentSummary(
  actor: WorkspaceTestUser,
  applicationId: string,
): Promise<Response> {
  return actor.agent
    .get(
      developmentRoutes.summary(
        actor.workspaceId,
        applicationId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function applyDevelopmentTemplate(
  actor: WorkspaceTestUser,
  applicationId: string,
  template:
    DevelopmentTemplateType =
      enumValue(
        DevelopmentTemplateType,
      ),
  replaceExisting = false,
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.applyTemplate(
        actor.workspaceId,
        applicationId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send({
      template,
      replaceExisting,
    });
}

export async function listMilestones(
  actor: WorkspaceTestUser,
  applicationId: string,
): Promise<Response> {
  return actor.agent
    .get(
      developmentRoutes.milestones(
        actor.workspaceId,
        applicationId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function createMilestone(
  actor: WorkspaceTestUser,
  applicationId: string,
  overrides:
    Partial<MilestonePayload> = {},
): Promise<
  CreatedDevelopmentEntity<
    MilestonePayload
  >
> {
  const payload =
    buildMilestonePayload(
      overrides,
    );

  const response =
    await actor.agent
      .post(
        developmentRoutes.milestones(
          actor.workspaceId,
          applicationId,
        ),
      )
      .set(
        withBearer(
          actor.accessToken,
        ),
      )
      .send(payload);

  expectDevelopmentSuccess(
    response,
  );

  return {
    id:
      readEntityId(
        response,
        [
          'milestone',
        ],
      ),

    payload,

    record:
      readDevelopmentRecord(
        response,
        [
          'milestone',
        ],
      ),

    response,
  };
}

export async function updateMilestone(
  actor: WorkspaceTestUser,
  applicationId: string,
  milestoneId: string,
  payload:
    Partial<MilestonePayload>,
): Promise<Response> {
  return actor.agent
    .patch(
      developmentRoutes.milestone(
        actor.workspaceId,
        applicationId,
        milestoneId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send(payload);
}

export async function completeMilestone(
  actor: WorkspaceTestUser,
  applicationId: string,
  milestoneId: string,
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.completeMilestone(
        actor.workspaceId,
        applicationId,
        milestoneId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function reopenMilestone(
  actor: WorkspaceTestUser,
  applicationId: string,
  milestoneId: string,
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.reopenMilestone(
        actor.workspaceId,
        applicationId,
        milestoneId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function skipMilestone(
  actor: WorkspaceTestUser,
  applicationId: string,
  milestoneId: string,
  reason =
    'Removed from current scope',
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.skipMilestone(
        actor.workspaceId,
        applicationId,
        milestoneId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send({
      reason,
    });
}

export async function deleteMilestone(
  actor: WorkspaceTestUser,
  applicationId: string,
  milestoneId: string,
): Promise<Response> {
  return actor.agent
    .delete(
      developmentRoutes.milestone(
        actor.workspaceId,
        applicationId,
        milestoneId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function reorderMilestones(
  actor: WorkspaceTestUser,
  applicationId: string,
  orderedIds: string[],
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.reorderMilestones(
        actor.workspaceId,
        applicationId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send({
      orderedIds,
    });
}

export async function createTask(
  actor: WorkspaceTestUser,
  applicationId: string,
  milestoneId: string,
  overrides:
    Partial<TaskPayload> = {},
): Promise<
  CreatedDevelopmentEntity<
    TaskPayload
  >
> {
  const payload =
    buildTaskPayload(
      overrides,
    );

  const response =
    await actor.agent
      .post(
        developmentRoutes.tasks(
          actor.workspaceId,
          applicationId,
          milestoneId,
        ),
      )
      .set(
        withBearer(
          actor.accessToken,
        ),
      )
      .send(payload);

  expectDevelopmentSuccess(
    response,
  );

  return {
    id:
      readEntityId(
        response,
        [
          'task',
        ],
      ),

    payload,

    record:
      readDevelopmentRecord(
        response,
        [
          'task',
        ],
      ),

    response,
  };
}

export async function updateTask(
  actor: WorkspaceTestUser,
  applicationId: string,
  taskId: string,
  payload:
    Partial<TaskPayload>,
): Promise<Response> {
  return actor.agent
    .patch(
      developmentRoutes.task(
        actor.workspaceId,
        applicationId,
        taskId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send(payload);
}

export async function setTaskStatus(
  actor: WorkspaceTestUser,
  applicationId: string,
  taskId: string,
  status: ActiveTaskStatus,
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.taskStatus(
        actor.workspaceId,
        applicationId,
        taskId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send({
      status,
    });
}

export async function completeTask(
  actor: WorkspaceTestUser,
  applicationId: string,
  taskId: string,
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.completeTask(
        actor.workspaceId,
        applicationId,
        taskId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function reopenTask(
  actor: WorkspaceTestUser,
  applicationId: string,
  taskId: string,
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.reopenTask(
        actor.workspaceId,
        applicationId,
        taskId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function skipTask(
  actor: WorkspaceTestUser,
  applicationId: string,
  taskId: string,
  reason =
    'Removed from current scope',
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.skipTask(
        actor.workspaceId,
        applicationId,
        taskId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send({
      reason,
    });
}

export async function moveTask(
  actor: WorkspaceTestUser,
  applicationId: string,
  taskId: string,
  targetMilestoneId: string,
  position?: number,
): Promise<Response> {
  const payload: {
    targetMilestoneId: string;
    position?: number;
  } = {
    targetMilestoneId,
  };

  if (
    position !== undefined
  ) {
    payload.position =
      position;
  }

  return actor.agent
    .post(
      developmentRoutes.moveTask(
        actor.workspaceId,
        applicationId,
        taskId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send(payload);
}

export async function reorderTasks(
  actor: WorkspaceTestUser,
  applicationId: string,
  milestoneId: string,
  orderedIds: string[],
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.reorderTasks(
        actor.workspaceId,
        applicationId,
        milestoneId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send({
      orderedIds,
    });
}

export async function deleteTask(
  actor: WorkspaceTestUser,
  applicationId: string,
  taskId: string,
): Promise<Response> {
  return actor.agent
    .delete(
      developmentRoutes.task(
        actor.workspaceId,
        applicationId,
        taskId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function listBlockers(
  actor: WorkspaceTestUser,
  applicationId: string,
  query:
    Record<
      string,
      string | number
    > = {},
): Promise<Response> {
  return actor.agent
    .get(
      developmentRoutes.blockers(
        actor.workspaceId,
        applicationId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .query(query);
}

export async function createBlocker(
  actor: WorkspaceTestUser,
  applicationId: string,
  overrides:
    Partial<BlockerPayload> = {},
): Promise<
  CreatedDevelopmentEntity<
    BlockerPayload
  >
> {
  const payload =
    buildBlockerPayload(
      overrides,
    );

  const response =
    await actor.agent
      .post(
        developmentRoutes.blockers(
          actor.workspaceId,
          applicationId,
        ),
      )
      .set(
        withBearer(
          actor.accessToken,
        ),
      )
      .send(payload);

  expectDevelopmentSuccess(
    response,
  );

  return {
    id:
      readEntityId(
        response,
        [
          'blocker',
        ],
      ),

    payload,

    record:
      readDevelopmentRecord(
        response,
        [
          'blocker',
        ],
      ),

    response,
  };
}

export async function updateBlocker(
  actor: WorkspaceTestUser,
  applicationId: string,
  blockerId: string,
  payload:
    Partial<BlockerPayload>,
): Promise<Response> {
  return actor.agent
    .patch(
      developmentRoutes.blocker(
        actor.workspaceId,
        applicationId,
        blockerId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send(payload);
}

export async function resolveBlocker(
  actor: WorkspaceTestUser,
  applicationId: string,
  blockerId: string,
  resolution =
    'Credentials were issued',
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.resolveBlocker(
        actor.workspaceId,
        applicationId,
        blockerId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    )
    .send({
      resolution,
    });
}

export async function reopenBlocker(
  actor: WorkspaceTestUser,
  applicationId: string,
  blockerId: string,
): Promise<Response> {
  return actor.agent
    .post(
      developmentRoutes.reopenBlocker(
        actor.workspaceId,
        applicationId,
        blockerId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export async function deleteBlocker(
  actor: WorkspaceTestUser,
  applicationId: string,
  blockerId: string,
): Promise<Response> {
  return actor.agent
    .delete(
      developmentRoutes.blocker(
        actor.workspaceId,
        applicationId,
        blockerId,
      ),
    )
    .set(
      withBearer(
        actor.accessToken,
      ),
    );
}

export const developmentEnums = {
  BlockerStatus,
  DevelopmentTemplateType,
  WorkItemPriority,
} as const;

export {
  applicationRoutes,
};
