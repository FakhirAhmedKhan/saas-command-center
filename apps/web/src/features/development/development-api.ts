import {
    apiRequest,
} from '@/features/lib/api/api-client';

import type {
    ApplicationBlocker,
    ApplicationMilestone,
    ApplicationTask,
    ApplicationTaskStatus,
    CreateBlockerPayload,
    CreateMilestonePayload,
    CreateTaskPayload,
    DevelopmentSummary,
    DevelopmentTemplate,
    DevelopmentTemplateType,
} from './development-types';

function basePath(
    workspaceId: string,
    applicationId: string,
): string {
    return `/workspaces/${workspaceId}/applications/${applicationId}/development`;
}

export function getDevelopmentTemplates(
    workspaceId: string,
) {
    return apiRequest<DevelopmentTemplate[]>(
        `/workspaces/${workspaceId}/development/templates`,
    );
}

export function getDevelopmentSummary(
    workspaceId: string,
    applicationId: string,
) {
    return apiRequest<DevelopmentSummary>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/summary`,
    );
}

export function applyDevelopmentTemplate(
    workspaceId: string,
    applicationId: string,
    template: DevelopmentTemplateType,
    replaceExisting = false,
) {
    return apiRequest<DevelopmentSummary>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/apply-template`,
        {
            method: 'POST',
            body: JSON.stringify({
                template,
                replaceExisting,
            }),
        },
    );
}

export function createMilestone(
    workspaceId: string,
    applicationId: string,
    payload: CreateMilestonePayload,
) {
    return apiRequest<ApplicationMilestone>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
    );
}

export function updateMilestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
    payload: Partial<CreateMilestonePayload>,
) {
    return apiRequest<ApplicationMilestone>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones/${milestoneId}`,
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        },
    );
}

export function completeMilestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
) {
    return apiRequest<ApplicationMilestone>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones/${milestoneId}/complete`,
        {
            method: 'POST',
        },
    );
}

export function reopenMilestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
) {
    return apiRequest<ApplicationMilestone>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones/${milestoneId}/reopen`,
        {
            method: 'POST',
        },
    );
}

export function skipMilestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
    reason: string,
) {
    return apiRequest<ApplicationMilestone>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones/${milestoneId}/skip`,
        {
            method: 'POST',
            body: JSON.stringify({
                reason,
            }),
        },
    );
}

export function deleteMilestone(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
) {
    return apiRequest<{
        message: string;
    }>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones/${milestoneId}`,
        {
            method: 'DELETE',
        },
    );
}

export function reorderMilestones(
    workspaceId: string,
    applicationId: string,
    orderedIds: string[],
) {
    return apiRequest<ApplicationMilestone[]>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones/reorder`,
        {
            method: 'POST',
            body: JSON.stringify({
                orderedIds,
            }),
        },
    );
}

export function createTask(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
    payload: CreateTaskPayload,
) {
    return apiRequest<ApplicationTask>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones/${milestoneId}/tasks`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
    );
}

export function updateTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
    payload: Partial<CreateTaskPayload>,
) {
    return apiRequest<ApplicationTask>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/tasks/${taskId}`,
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        },
    );
}

export function setTaskStatus(
    workspaceId: string,
    applicationId: string,
    taskId: string,
    status: Extract<
        ApplicationTaskStatus,
        'TODO' | 'IN_PROGRESS' | 'BLOCKED'
    >,
) {
    return apiRequest<ApplicationTask>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/tasks/${taskId}/status`,
        {
            method: 'POST',
            body: JSON.stringify({
                status,
            }),
        },
    );
}

export function completeTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
) {
    return apiRequest<ApplicationTask>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/tasks/${taskId}/complete`,
        {
            method: 'POST',
        },
    );
}

export function reopenTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
) {
    return apiRequest<ApplicationTask>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/tasks/${taskId}/reopen`,
        {
            method: 'POST',
        },
    );
}

export function skipTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
    reason: string,
) {
    return apiRequest<ApplicationTask>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/tasks/${taskId}/skip`,
        {
            method: 'POST',
            body: JSON.stringify({
                reason,
            }),
        },
    );
}

export function moveTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
    targetMilestoneId: string,
) {
    return apiRequest<ApplicationTask>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/tasks/${taskId}/move`,
        {
            method: 'POST',
            body: JSON.stringify({
                targetMilestoneId,
            }),
        },
    );
}

export function reorderTasks(
    workspaceId: string,
    applicationId: string,
    milestoneId: string,
    orderedIds: string[],
) {
    return apiRequest<ApplicationTask[]>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/milestones/${milestoneId}/tasks/reorder`,
        {
            method: 'POST',
            body: JSON.stringify({
                orderedIds,
            }),
        },
    );
}

export function deleteTask(
    workspaceId: string,
    applicationId: string,
    taskId: string,
) {
    return apiRequest<{
        message: string;
    }>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/tasks/${taskId}`,
        {
            method: 'DELETE',
        },
    );
}

export function createBlocker(
    workspaceId: string,
    applicationId: string,
    payload: CreateBlockerPayload,
) {
    return apiRequest<ApplicationBlocker>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/blockers`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
    );
}

export function updateBlocker(
    workspaceId: string,
    applicationId: string,
    blockerId: string,
    payload: Partial<CreateBlockerPayload>,
) {
    return apiRequest<ApplicationBlocker>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/blockers/${blockerId}`,
        {
            method: 'PATCH',
            body: JSON.stringify(payload),
        },
    );
}

export function resolveBlocker(
    workspaceId: string,
    applicationId: string,
    blockerId: string,
    resolution: string,
) {
    return apiRequest<ApplicationBlocker>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/blockers/${blockerId}/resolve`,
        {
            method: 'POST',
            body: JSON.stringify({
                resolution,
            }),
        },
    );
}

export function reopenBlocker(
    workspaceId: string,
    applicationId: string,
    blockerId: string,
) {
    return apiRequest<ApplicationBlocker>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/blockers/${blockerId}/reopen`,
        {
            method: 'POST',
        },
    );
}

export function deleteBlocker(
    workspaceId: string,
    applicationId: string,
    blockerId: string,
) {
    return apiRequest<{
        message: string;
    }>(
        `${basePath(
            workspaceId,
            applicationId,
        )}/blockers/${blockerId}`,
        {
            method: 'DELETE',
        },
    );
}