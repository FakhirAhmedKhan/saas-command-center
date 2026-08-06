 
 
 

import type { Response } from 'supertest';

import {
    ApplicationCategory,
    ApplicationLinkType,
    ApplicationPriority,
    ApplicationStatus,
    TechnologyType,
} from 'src/generated/prisma/enums';

import { withBearer } from './auth';
import { expectSuccessfulStatus } from './response';

import type {
    WorkspaceTestUser,
} from './workspace';

type StringEnumObject<T extends string> =
    Readonly<Record<string, T>>;

export interface CreateApplicationPayload {
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

export interface TechnologyPayload {
    name: string;
    type: TechnologyType;
    version?: string | null;
}

export interface LinkPayload {
    label: string;
    type: ApplicationLinkType;
    url: string;
}

export interface CreatedApplication {
    id: string;
    payload: CreateApplicationPayload;
    record: Record<string, unknown>;
    response: Response;
}

export const applicationRoutes = {
    root: (
        workspaceId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications`,

    details: (
        workspaceId: string,
        applicationId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications/${applicationId}`,

    archive: (
        workspaceId: string,
        applicationId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications/${applicationId}/archive`,

    restore: (
        workspaceId: string,
        applicationId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications/${applicationId}/restore`,

    technologies: (
        workspaceId: string,
        applicationId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications/${applicationId}/technologies`,

    technology: (
        workspaceId: string,
        applicationId: string,
        technologyId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications/${applicationId}/technologies/${technologyId}`,

    links: (
        workspaceId: string,
        applicationId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications/${applicationId}/links`,

    link: (
        workspaceId: string,
        applicationId: string,
        linkId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications/${applicationId}/links/${linkId}`,

    workspaceActivities: (
        workspaceId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/activities`,

    applicationActivities: (
        workspaceId: string,
        applicationId: string,
    ): string =>
        `/api/v1/workspaces/${workspaceId}/applications/${applicationId}/activities`,
} as const;

function uniqueSuffix(): string {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}

export function enumValue<T extends string>(
    enumObject: StringEnumObject<T>,
    index = 0,
): T {
    const values =
        Object.values(enumObject);

    const value =
        values[index] ??
        values[0];

    if (!value) {
        throw new Error(
            'Generated enum has no values',
        );
    }

    return value;
}

export function buildApplicationPayload(
    overrides:
        Partial<CreateApplicationPayload> = {},
): CreateApplicationPayload {
    const suffix =
        uniqueSuffix();

    return {
        name:
            `Batch 3 Application ${suffix}`,

        slug:
            `batch-3-${suffix}`,

        shortDescription:
            'Batch 3 E2E short description',

        longDescription:
            'Batch 3 E2E long description',

        category:
            enumValue(
                ApplicationCategory,
            ),

        status:
            enumValue(
                ApplicationStatus,
            ),

        priority:
            enumValue(
                ApplicationPriority,
            ),

        startedAt:
            '2026-08-01T00:00:00.000Z',

        targetLaunchAt:
            '2026-10-01T00:00:00.000Z',

        launchedAt:
            null,

        ...overrides,
    };
}

export function buildTechnologyPayload(
    overrides:
        Partial<TechnologyPayload> = {},
): TechnologyPayload {
    return {
        name:
            `Technology ${uniqueSuffix()}`,

        type:
            enumValue(
                TechnologyType,
            ),

        version:
            '1.0.0',

        ...overrides,
    };
}

export function buildLinkPayload(
    overrides:
        Partial<LinkPayload> = {},
): LinkPayload {
    return {
        label:
            `Production ${uniqueSuffix()}`,

        type:
            enumValue(
                ApplicationLinkType,
            ),

        url:
            `https://example-${uniqueSuffix()}.test`,

        ...overrides,
    };
}

export function asRecord(
    value: unknown,
): Record<string, unknown> | undefined {
    if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value)
    ) {
        return undefined;
    }

    return value as Record<
        string,
        unknown
    >;
}

function asRecordArray(
    value: unknown,
): Record<string, unknown>[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value
        .map(asRecord)
        .filter(
            (
                item,
            ): item is Record<
                string,
                unknown
            > => item !== undefined,
        );
}

export function recordString(
    record:
        Record<string, unknown>,
    ...keys: string[]
): string | undefined {
    for (const key of keys) {
        const value =
            record[key];

        if (
            typeof value === 'string'
        ) {
            return value;
        }
    }

    return undefined;
}

export function readApiRecord(
    response: Response,
    preferredKeys:
        string[] = [],
): Record<string, unknown> {
    const body =
        asRecord(response.body);

    const data =
        asRecord(body?.data);

    const candidates: unknown[] = [
        response.body,
        body?.data,
        body?.item,
        body?.application,
        body?.technology,
        body?.link,
        data?.item,
        data?.application,
        data?.technology,
        data?.link,
    ];

    for (
        const key
        of preferredKeys
    ) {
        candidates.push(
            body?.[key],
            data?.[key],
        );
    }

    for (
        const candidate
        of candidates
    ) {
        const record =
            asRecord(candidate);

        if (record) {
            return record;
        }
    }

    throw new Error(
        [
            'Expected an object response.',
            `Received: ${JSON.stringify(
                response.body,
            )}`,
        ].join(' '),
    );
}

export function readApiItems(
    response: Response,
    preferredKeys:
        string[] = [],
): Record<string, unknown>[] {
    const body =
        asRecord(response.body);

    const data =
        asRecord(body?.data);

    const candidates: unknown[] = [
        response.body,
        body?.items,
        body?.results,
        body?.applications,
        body?.activities,
        body?.data,
        data?.items,
        data?.results,
        data?.applications,
        data?.activities,
    ];

    for (
        const key
        of preferredKeys
    ) {
        candidates.push(
            body?.[key],
            data?.[key],
        );
    }

    for (
        const candidate
        of candidates
    ) {
        const items =
            asRecordArray(
                candidate,
            );

        if (items) {
            return items;
        }
    }

    throw new Error(
        [
            'Expected an array response.',
            `Received: ${JSON.stringify(
                response.body,
            )}`,
        ].join(' '),
    );
}

export function readEntityId(
    response: Response,
    preferredKeys:
        string[] = [],
): string {
    const record =
        readApiRecord(
            response,
            preferredKeys,
        );

    const id =
        recordString(
            record,
            'id',
            'applicationId',
            'technologyId',
            'linkId',
        );

    if (!id) {
        throw new Error(
            [
                'Response does not contain an entity ID.',
                `Received: ${JSON.stringify(
                    response.body,
                )}`,
            ].join(' '),
        );
    }

    return id;
}

export function expectMutationSuccess(
    response: Response,
): void {
    expect([
        200,
        201,
    ]).toContain(
        response.status,
    );
}

export async function createApplication(
    actor: WorkspaceTestUser,
    overrides:
        Partial<CreateApplicationPayload> = {},
): Promise<CreatedApplication> {
    const payload =
        buildApplicationPayload(
            overrides,
        );

    const response =
        await actor.agent
            .post(
                applicationRoutes.root(
                    actor.workspaceId,
                ),
            )
            .set(
                withBearer(
                    actor.accessToken,
                ),
            )
            .send(payload);

    expectSuccessfulStatus(
        response,
    );

    return {
        id:
            readEntityId(
                response,
                [
                    'application',
                ],
            ),

        payload,

        record:
            readApiRecord(
                response,
                [
                    'application',
                ],
            ),

        response,
    };
}

export async function listApplications(
    actor: WorkspaceTestUser,
    query:
        Record<
            string,
            string | number | boolean
        > = {},
): Promise<Response> {
    return actor.agent
        .get(
            applicationRoutes.root(
                actor.workspaceId,
            ),
        )
        .set(
            withBearer(
                actor.accessToken,
            ),
        )
        .query(query);
}

export async function getApplication(
    actor: WorkspaceTestUser,
    applicationId: string,
): Promise<Response> {
    return actor.agent
        .get(
            applicationRoutes.details(
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

export async function updateApplication(
    actor: WorkspaceTestUser,
    applicationId: string,
    payload:
        Partial<CreateApplicationPayload>,
): Promise<Response> {
    return actor.agent
        .patch(
            applicationRoutes.details(
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
}

export async function archiveApplication(
    actor: WorkspaceTestUser,
    applicationId: string,
): Promise<Response> {
    return actor.agent
        .post(
            applicationRoutes.archive(
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

export async function restoreApplication(
    actor: WorkspaceTestUser,
    applicationId: string,
): Promise<Response> {
    return actor.agent
        .post(
            applicationRoutes.restore(
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

export async function permanentlyDeleteApplication(
    actor: WorkspaceTestUser,
    applicationId: string,
): Promise<Response> {
    return actor.agent
        .delete(
            applicationRoutes.details(
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

export async function addTechnology(
    actor: WorkspaceTestUser,
    applicationId: string,
    overrides:
        Partial<TechnologyPayload> = {},
): Promise<Response> {
    return actor.agent
        .post(
            applicationRoutes.technologies(
                actor.workspaceId,
                applicationId,
            ),
        )
        .set(
            withBearer(
                actor.accessToken,
            ),
        )
        .send(
            buildTechnologyPayload(
                overrides,
            ),
        );
}

export async function updateTechnology(
    actor: WorkspaceTestUser,
    applicationId: string,
    technologyId: string,
    payload:
        Partial<TechnologyPayload>,
): Promise<Response> {
    return actor.agent
        .patch(
            applicationRoutes.technology(
                actor.workspaceId,
                applicationId,
                technologyId,
            ),
        )
        .set(
            withBearer(
                actor.accessToken,
            ),
        )
        .send(payload);
}

export async function removeTechnology(
    actor: WorkspaceTestUser,
    applicationId: string,
    technologyId: string,
): Promise<Response> {
    return actor.agent
        .delete(
            applicationRoutes.technology(
                actor.workspaceId,
                applicationId,
                technologyId,
            ),
        )
        .set(
            withBearer(
                actor.accessToken,
            ),
        );
}

export async function addLink(
    actor: WorkspaceTestUser,
    applicationId: string,
    overrides:
        Partial<LinkPayload> = {},
): Promise<Response> {
    return actor.agent
        .post(
            applicationRoutes.links(
                actor.workspaceId,
                applicationId,
            ),
        )
        .set(
            withBearer(
                actor.accessToken,
            ),
        )
        .send(
            buildLinkPayload(
                overrides,
            ),
        );
}

export async function updateLink(
    actor: WorkspaceTestUser,
    applicationId: string,
    linkId: string,
    payload:
        Partial<LinkPayload>,
): Promise<Response> {
    return actor.agent
        .patch(
            applicationRoutes.link(
                actor.workspaceId,
                applicationId,
                linkId,
            ),
        )
        .set(
            withBearer(
                actor.accessToken,
            ),
        )
        .send(payload);
}

export async function removeLink(
    actor: WorkspaceTestUser,
    applicationId: string,
    linkId: string,
): Promise<Response> {
    return actor.agent
        .delete(
            applicationRoutes.link(
                actor.workspaceId,
                applicationId,
                linkId,
            ),
        )
        .set(
            withBearer(
                actor.accessToken,
            ),
        );
}

export function inWorkspace(
    user: WorkspaceTestUser,
    workspaceId: string,
): WorkspaceTestUser {
    return {
        ...user,
        workspaceId,
    };
}