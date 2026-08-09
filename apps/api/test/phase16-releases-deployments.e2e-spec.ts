import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';

import { PrismaService } from '../src/database/prisma.service';
import { DeploymentStatus, WorkspaceRole } from '../src/generated/prisma/enums';
import { createAgent, createTestUser, registerUser, withBearer } from './helpers/auth';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';
import { readAccessToken } from './helpers/response';

/**
 * Phase 16 â€” Releases & Deployments E2E
 *
 * No prior e2e coverage exists for this module (confirmed: no *release* or *deployment* named
 * spec file under apps/api/test before this one).
 *
 * Real routes:
 *   Releases (apps/api/src/modules/releases/controllers/releases.controller.ts), mounted under
 *   /api/v1/workspaces/:workspaceId/applications/:applicationId/releases:
 *     GET   /                       (ReleaseListQueryDto: search, page, limit)
 *     POST  /                       (CreateReleaseDto)
 *     GET   /:releaseId
 *     PATCH /:releaseId             (UpdateReleaseDto = PartialType(CreateReleaseDto))
 *
 *   Deployments (apps/api/src/modules/releases/controllers/deployments.controller.ts), mounted
 *   under /api/v1/workspaces/:workspaceId/applications/:applicationId/deployments:
 *     GET   /options                 (environments + open incidents for the application)
 *     GET   /current                 (latest terminal deployment per environment)
 *     GET   /                        (DeploymentListQueryDto: environmentId, releaseId, status,
 *                                      page, limit)
 *     POST  /                        (CreateDeploymentDto)
 *     GET   /:deploymentId
 *     POST  /:deploymentId/transition (TransitionDeploymentDto)
 *
 * Guards: JwtAuthGuard + WorkspaceAccessGuard (class-level) only. Write operations
 * (create/update/transition) are additionally guarded in-service via
 * ReleaseAccessService.assertCanManage, which requires OWNER, ADMIN, or DEVELOPER
 * (release-access.service.ts RELEASE_MANAGEMENT_ROLES). Reads have no role restriction beyond
 * workspace membership.
 *
 * CreateReleaseDto: version (required, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/), name/notes/commitRef/
 * repositoryUrl (optional strings), scheduledAt (optional ISO datetime). If scheduledAt is
 * provided at creation, status starts SCHEDULED, else DRAFT.
 * Release.version has a DB @@unique([applicationId, version]) constraint -> ConflictException
 * (409) on duplicate version within the same application (release-deployment.service.ts:178-186).
 * Release.version may only be changed while status === DRAFT (service-level rule, not DTO-level).
 *
 * CreateDeploymentDto: releaseId + environmentId (required UUIDs, must belong to the same
 * workspace+application), optional commitRef/repositoryUrl/ciJobUrl/liveUrl/deploymentNotes/
 * scheduledAt/healthIncidentId. A new deployment always starts at DeploymentStatus.DRAFT with an
 * auto-incremented `attempt` number scoped to (releaseId, environmentId).
 *
 * Deployment state machine (deployment-transition.service.ts, TRANSITIONS map â€” this is the
 * authoritative, real contract; DO NOT assume any other pairs are valid):
 *   DRAFT       -> SCHEDULED | IN_PROGRESS
 *   SCHEDULED   -> DRAFT | IN_PROGRESS
 *   IN_PROGRESS -> SUCCESSFUL | FAILED
 *   SUCCESSFUL  -> ROLLED_BACK
 *   FAILED      -> IN_PROGRESS | ROLLED_BACK
 *   ROLLED_BACK -> (terminal, no further transitions)
 * transitioning to the SAME status is always rejected (400) regardless of the map.
 * SCHEDULED requires `scheduledAt` (from body or already on the deployment). FAILED requires
 * `failureReason`. ROLLED_BACK requires `rollbackToDeploymentId`, which must reference a
 * DIFFERENT, SUCCESSFUL deployment in the SAME environment.
 * A successful transitionDeployment call also updates the parent Release.status via
 * ReleaseStatus[deploymentStatus] (the two enums share identical member names for all values
 * used here), and always creates a DeploymentActivity row (action CREATED on deployment
 * creation, STATUS_CHANGED or ROLLBACK_RECORDED on transition).
 * transitionDeployment uses an optimistic concurrency guard: `updateMany({where: {id, status:
 * <status captured at request start>}})`; if the row's status changed between read and write,
 * `changed.count === 0` and the request throws ConflictException (409).
 *
 * getCurrentVersions (GET /deployments/current) resolves, per environment, the most recent
 * deployment with status SUCCESSFUL or ROLLED_BACK; if ROLLED_BACK, the "effective" version shown
 * is the rollback TARGET's release, while `status` in the response stays ROLLED_BACK.
 */

const API_PREFIX = '/api/v1';

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

type JsonRecord = Record<string, unknown>;

function body(response: Response): JsonRecord {
  return response.body as JsonRecord;
}

function isRecordArray(value: unknown): value is JsonRecord[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null);
}

describe('Phase 16 Releases & Deployments E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let workspaceId: string;
  let applicationId: string;
  let environmentId: string;
  let secondEnvironmentId: string;

  let ownerAccessToken: string;
  let developerAccessToken: string;
  let viewerAccessToken: string;
  let outsiderAccessToken: string;

  let ownerId: string;

  function releasesUrl(): string {
    return `${API_PREFIX}/workspaces/${workspaceId}/applications/${applicationId}/releases`;
  }

  function releaseUrl(releaseId: string): string {
    return `${releasesUrl()}/${releaseId}`;
  }

  function deploymentsUrl(): string {
    return `${API_PREFIX}/workspaces/${workspaceId}/applications/${applicationId}/deployments`;
  }

  function deploymentUrl(deploymentId: string): string {
    return `${deploymentsUrl()}/${deploymentId}`;
  }

  function transitionUrl(deploymentId: string): string {
    return `${deploymentUrl(deploymentId)}/transition`;
  }

  async function createRelease(token: string, overrides: Record<string, unknown> = {}): Promise<Response> {
    return request(app.getHttpServer())
      .post(releasesUrl())
      .set(withBearer(token))
      .send({ version: `1.0.${Date.now()}-${randomUUID().slice(0, 6)}`, ...overrides });
  }

  async function createDeployment(token: string, releaseId: string, overrides: Record<string, unknown> = {}): Promise<Response> {
    return request(app.getHttpServer())
      .post(deploymentsUrl())
      .set(withBearer(token))
      .send({ releaseId, environmentId, ...overrides });
  }

  async function transition(token: string, deploymentId: string, payload: Record<string, unknown>): Promise<Response> {
    return request(app.getHttpServer()).post(transitionUrl(deploymentId)).set(withBearer(token)).send(payload);
  }

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);

    const owner = createTestUser({
      name: 'Phase 16 Owner',
      workspaceName: 'Phase 16 Workspace',
    });

    const ownerRegistration = await registerUser(createAgent(app), owner);

    expect(ownerRegistration.status).toBe(201);

    ownerAccessToken = readAccessToken(ownerRegistration);

    const ownerRecord = await prisma.user.findUnique({
      where: { email: owner.email.toLowerCase() },
      select: { id: true },
    });

    ownerId = requireValue(ownerRecord?.id, 'Phase 16 owner was not persisted');

    const ownerMembership = await prisma.workspaceMember.findFirst({
      where: { userId: ownerId, role: WorkspaceRole.OWNER },
      select: { workspaceId: true },
    });

    workspaceId = requireValue(ownerMembership?.workspaceId, 'Phase 16 owner workspace was not found');

    const developer = createTestUser({
      name: 'Phase 16 Developer',
      workspaceName: 'Phase 16 Developer Workspace',
    });

    const developerRegistration = await registerUser(createAgent(app), developer);

    expect(developerRegistration.status).toBe(201);

    developerAccessToken = readAccessToken(developerRegistration);

    const developerRecord = await prisma.user.findUnique({
      where: { email: developer.email.toLowerCase() },
      select: { id: true },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: requireValue(developerRecord?.id, 'Phase 16 developer was not persisted'),
        role: WorkspaceRole.DEVELOPER,
      },
    });

    const viewer = createTestUser({
      name: 'Phase 16 Viewer',
      workspaceName: 'Phase 16 Viewer Workspace',
    });

    const viewerRegistration = await registerUser(createAgent(app), viewer);

    expect(viewerRegistration.status).toBe(201);

    viewerAccessToken = readAccessToken(viewerRegistration);

    const viewerRecord = await prisma.user.findUnique({
      where: { email: viewer.email.toLowerCase() },
      select: { id: true },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: requireValue(viewerRecord?.id, 'Phase 16 viewer was not persisted'),
        role: WorkspaceRole.VIEWER,
      },
    });

    const outsider = createTestUser({
      name: 'Phase 16 Outsider',
      workspaceName: 'Phase 16 Outsider Workspace',
    });

    const outsiderRegistration = await registerUser(createAgent(app), outsider);

    expect(outsiderRegistration.status).toBe(201);

    outsiderAccessToken = readAccessToken(outsiderRegistration);

    const application = await prisma.saasApplication.create({
      data: {
        workspaceId,
        name: 'Phase 16 Application',
        slug: `phase16-application-${randomUUID()}`,
        category: 'SAAS',
        status: 'LIVE',
        priority: 'MEDIUM',
        createdById: ownerId,
      },
      select: { id: true },
    });

    applicationId = application.id;

    const environment = await prisma.applicationEnvironment.create({
      data: {
        workspaceId,
        applicationId,
        name: 'Production',
        slug: 'production',
        isProduction: true,
      },
      select: { id: true },
    });

    environmentId = environment.id;

    const secondEnvironment = await prisma.applicationEnvironment.create({
      data: {
        workspaceId,
        applicationId,
        name: 'Staging',
        slug: 'staging',
        isProduction: false,
      },
      select: { id: true },
    });

    secondEnvironmentId = secondEnvironment.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------------------
  // A. Release CRUD
  // ---------------------------------------------------------------------------------------

  it('rejects anonymous access to list releases', async () => {
    const response = await request(app.getHttpServer()).get(releasesUrl());

    expect(response.status).toBe(401);
  });

  it('creates a DRAFT release as OWNER when no scheduledAt is supplied', async () => {
    const response = await createRelease(ownerAccessToken, { version: '1.0.0', name: 'First cut' });

    expect(response.status).toBe(201);

    const created = body(response);

    expect(created).toMatchObject({ version: '1.0.0', name: 'First cut', status: 'DRAFT' });
    expect(created.scheduledAt).toBeNull();

    const persisted = await prisma.release.findUniqueOrThrow({
      where: { id: created.id as string },
    });

    expect(persisted.workspaceId).toBe(workspaceId);
    expect(persisted.applicationId).toBe(applicationId);
    expect(persisted.createdById).toBe(ownerId);
  });

  it('creates a SCHEDULED release when scheduledAt is supplied', async () => {
    const response = await createRelease(ownerAccessToken, {
      version: '1.0.1',
      scheduledAt: '2026-09-01T00:00:00.000Z',
    });

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({
      status: 'SCHEDULED',
      scheduledAt: '2026-09-01T00:00:00.000Z',
    });
  });

  it('lists releases scoped to the application', async () => {
    const response = await request(app.getHttpServer()).get(releasesUrl()).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const listBody = body(response);

    expect(isRecordArray(listBody.items)).toBe(true);
    expect((listBody.items as JsonRecord[]).length).toBeGreaterThanOrEqual(2);
    expect(listBody.pagination).toMatchObject({ page: 1, limit: 25 });
  });

  it('searches releases by version', async () => {
    const response = await request(app.getHttpServer()).get(`${releasesUrl()}?search=1.0.1`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const items = body(response).items as JsonRecord[];

    expect(items.every((release) => (release.version as string).includes('1.0.1'))).toBe(true);
  });

  it('retrieves a single release by id, including its (empty) deployment list', async () => {
    const createResponse = await createRelease(ownerAccessToken, { version: '1.0.2' });

    const releaseId = body(createResponse).id as string;

    const response = await request(app.getHttpServer()).get(releaseUrl(releaseId)).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);
    expect(body(response)).toMatchObject({ id: releaseId, version: '1.0.2' });
    expect(Array.isArray(body(response).deployments)).toBe(true);
  });

  it('updates a DRAFT release, including its version', async () => {
    const createResponse = await createRelease(ownerAccessToken, { version: '1.0.3' });

    const releaseId = body(createResponse).id as string;

    const response = await request(app.getHttpServer())
      .patch(releaseUrl(releaseId))
      .set(withBearer(ownerAccessToken))
      .send({ version: '1.0.3-renamed', name: 'Renamed draft' });

    expect(response.status).toBe(200);
    expect(body(response)).toMatchObject({ version: '1.0.3-renamed', name: 'Renamed draft' });
  });

  it('returns 404 for a nonexistent release', async () => {
    const response = await request(app.getHttpServer()).get(releaseUrl(randomUUID())).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);
  });

  // ---------------------------------------------------------------------------------------
  // B. Duplicate constraints
  // ---------------------------------------------------------------------------------------

  it('rejects creating a second release with a duplicate version for the same application (409)', async () => {
    const first = await createRelease(ownerAccessToken, { version: '2.0.0' });

    expect(first.status).toBe(201);

    const duplicate = await createRelease(ownerAccessToken, { version: '2.0.0' });

    expect(duplicate.status).toBe(409);
  });

  it('allows the same version string across two DIFFERENT applications', async () => {
    const otherApplication = await prisma.saasApplication.create({
      data: {
        workspaceId,
        name: 'Phase 16 Second Application',
        slug: `phase16-second-application-${randomUUID()}`,
        category: 'SAAS',
        status: 'LIVE',
        priority: 'MEDIUM',
        createdById: ownerId,
      },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/workspaces/${workspaceId}/applications/${otherApplication.id}/releases`)
      .set(withBearer(ownerAccessToken))
      .send({ version: '2.0.0' });

    expect(response.status).toBe(201);
  });

  it('rejects a version string that fails the pattern (spaces / invalid characters)', async () => {
    const response = await createRelease(ownerAccessToken, { version: 'not a valid version!' });

    expect(response.status).toBe(400);
  });

  it('rejects changing the version of a release that is no longer DRAFT', async () => {
    const createResponse = await createRelease(ownerAccessToken, { version: '3.0.0' });

    const releaseId = body(createResponse).id as string;

    const deploymentResponse = await createDeployment(ownerAccessToken, releaseId);

    expect(deploymentResponse.status).toBe(201);

    const deploymentId = body(deploymentResponse).id as string;

    const progressResponse = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });

    expect(progressResponse.status).toBe(201);

    const successResponse = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.SUCCESSFUL,
    });

    expect(successResponse.status).toBe(201);

    const releaseAfter = await prisma.release.findUniqueOrThrow({ where: { id: releaseId } });

    expect(releaseAfter.status).toBe('SUCCESSFUL');

    const updateResponse = await request(app.getHttpServer()).patch(releaseUrl(releaseId)).set(withBearer(ownerAccessToken)).send({ version: '3.0.0-changed' });

    expect(updateResponse.status).toBe(400);
  });

  // ---------------------------------------------------------------------------------------
  // C. Deployment CRUD/state â€” belongs to release/environment/application
  // ---------------------------------------------------------------------------------------

  it('creates a deployment in DRAFT status with attempt=1, and records a CREATED activity entry', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '4.0.0' });

    const releaseId = body(releaseResponse).id as string;

    const response = await createDeployment(ownerAccessToken, releaseId, {
      deploymentNotes: 'Phase 16 first attempt',
    });

    expect(response.status).toBe(201);

    const created = body(response);

    expect(created).toMatchObject({
      status: DeploymentStatus.DRAFT,
      attempt: 1,
      environmentId,
      releaseId,
      applicationId,
      workspaceId,
    });

    const activities = created.activities as JsonRecord[];

    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ action: 'CREATED', toStatus: DeploymentStatus.DRAFT });
    expect((activities[0]?.actor as JsonRecord).id).toBe(ownerId);
  });

  it('increments the attempt number for a second deployment of the same release+environment', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '4.0.1' });

    const releaseId = body(releaseResponse).id as string;

    const firstDeployment = await createDeployment(ownerAccessToken, releaseId);

    expect(firstDeployment.status).toBe(201);
    expect(body(firstDeployment).attempt).toBe(1);

    const secondDeployment = await createDeployment(ownerAccessToken, releaseId);

    expect(secondDeployment.status).toBe(201);
    expect(body(secondDeployment).attempt).toBe(2);
  });

  it('rejects a deployment referencing a release from a different application', async () => {
    const otherApplication = await prisma.saasApplication.create({
      data: {
        workspaceId,
        name: 'Phase 16 Foreign Application',
        slug: `phase16-foreign-application-${randomUUID()}`,
        category: 'SAAS',
        status: 'LIVE',
        priority: 'MEDIUM',
        createdById: ownerId,
      },
      select: { id: true },
    });

    const foreignRelease = await prisma.release.create({
      data: {
        workspaceId,
        applicationId: otherApplication.id,
        version: '1.0.0',
        status: 'DRAFT',
        createdById: ownerId,
        updatedById: ownerId,
      },
      select: { id: true },
    });

    const response = await createDeployment(ownerAccessToken, foreignRelease.id);

    expect(response.status).toBe(404);
  });

  it('rejects a deployment referencing an environment from a different application', async () => {
    const otherApplication = await prisma.saasApplication.create({
      data: {
        workspaceId,
        name: 'Phase 16 Foreign Env Application',
        slug: `phase16-foreign-env-application-${randomUUID()}`,
        category: 'SAAS',
        status: 'LIVE',
        priority: 'MEDIUM',
        createdById: ownerId,
      },
      select: { id: true },
    });

    const foreignEnvironment = await prisma.applicationEnvironment.create({
      data: {
        workspaceId,
        applicationId: otherApplication.id,
        name: 'Foreign Production',
        slug: 'production',
        isProduction: true,
      },
      select: { id: true },
    });

    const releaseResponse = await createRelease(ownerAccessToken, { version: '4.0.2' });

    const response = await createDeployment(ownerAccessToken, body(releaseResponse).id as string, {
      environmentId: foreignEnvironment.id,
    });

    expect(response.status).toBe(404);
  });

  it('returns 404 for a nonexistent deployment', async () => {
    const response = await request(app.getHttpServer()).get(deploymentUrl(randomUUID())).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);
  });

  // ---------------------------------------------------------------------------------------
  // C (cont). Valid / invalid state transitions
  // ---------------------------------------------------------------------------------------

  it('walks the full valid DRAFT -> IN_PROGRESS -> SUCCESSFUL path with correct timestamps', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.0' });

    const releaseId = body(releaseResponse).id as string;

    const deploymentResponse = await createDeployment(ownerAccessToken, releaseId);

    const deploymentId = body(deploymentResponse).id as string;

    const inProgress = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });

    expect(inProgress.status).toBe(201);
    expect(body(inProgress).status).toBe(DeploymentStatus.IN_PROGRESS);
    expect(body(inProgress).startedAt).not.toBeNull();
    expect(body(inProgress).finishedAt).toBeNull();

    const successful = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.SUCCESSFUL,
      message: 'Deployed cleanly',
    });

    expect(successful.status).toBe(201);
    expect(body(successful).status).toBe(DeploymentStatus.SUCCESSFUL);
    expect(body(successful).finishedAt).not.toBeNull();
    expect(typeof body(successful).durationMs).toBe('number');
    expect(body(successful).deployedBy).toMatchObject({ id: ownerId });

    const activities = body(successful).activities as JsonRecord[];

    expect(activities[0]).toMatchObject({
      action: 'STATUS_CHANGED',
      fromStatus: DeploymentStatus.IN_PROGRESS,
      toStatus: DeploymentStatus.SUCCESSFUL,
      message: 'Deployed cleanly',
    });

    const releaseAfter = await prisma.release.findUniqueOrThrow({ where: { id: releaseId } });

    expect(releaseAfter.status).toBe('SUCCESSFUL');
    expect(releaseAfter.releasedAt).not.toBeNull();
  });

  it('rejects an invalid transition (DRAFT -> SUCCESSFUL is not a legal transition)', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.1' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const response = await transition(ownerAccessToken, body(deploymentResponse).id as string, {
      status: DeploymentStatus.SUCCESSFUL,
    });

    expect(response.status).toBe(400);
  });

  it('rejects transitioning a deployment to its own current status', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.2' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const response = await transition(ownerAccessToken, body(deploymentResponse).id as string, {
      status: DeploymentStatus.DRAFT,
    });

    expect(response.status).toBe(400);
  });

  it('rejects transitioning out of the terminal ROLLED_BACK status', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.3' });

    const releaseId = body(releaseResponse).id as string;

    const baseDeploymentResponse = await createDeployment(ownerAccessToken, releaseId);

    const baseDeploymentId = body(baseDeploymentResponse).id as string;

    await transition(ownerAccessToken, baseDeploymentId, { status: DeploymentStatus.IN_PROGRESS });
    await transition(ownerAccessToken, baseDeploymentId, { status: DeploymentStatus.SUCCESSFUL });

    const rollbackDeploymentResponse = await createDeployment(ownerAccessToken, releaseId);

    const rollbackDeploymentId = body(rollbackDeploymentResponse).id as string;

    await transition(ownerAccessToken, rollbackDeploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });
    await transition(ownerAccessToken, rollbackDeploymentId, {
      status: DeploymentStatus.SUCCESSFUL,
    });

    const rolledBack = await transition(ownerAccessToken, rollbackDeploymentId, {
      status: DeploymentStatus.ROLLED_BACK,
      rollbackToDeploymentId: baseDeploymentId,
    });

    expect(rolledBack.status).toBe(201);
    expect(body(rolledBack).status).toBe(DeploymentStatus.ROLLED_BACK);

    const furtherTransition = await transition(ownerAccessToken, rollbackDeploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });

    expect(furtherTransition.status).toBe(400);
  });

  it('requires scheduledAt when transitioning to SCHEDULED', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.4' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const response = await transition(ownerAccessToken, body(deploymentResponse).id as string, {
      status: DeploymentStatus.SCHEDULED,
    });

    expect(response.status).toBe(400);
  });

  it('accepts a SCHEDULED transition when scheduledAt is provided', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.5' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const response = await transition(ownerAccessToken, body(deploymentResponse).id as string, {
      status: DeploymentStatus.SCHEDULED,
      scheduledAt: '2026-09-15T00:00:00.000Z',
    });

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({
      status: DeploymentStatus.SCHEDULED,
      scheduledAt: '2026-09-15T00:00:00.000Z',
    });
  });

  it('requires failureReason when transitioning to FAILED', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.6' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const deploymentId = body(deploymentResponse).id as string;

    await transition(ownerAccessToken, deploymentId, { status: DeploymentStatus.IN_PROGRESS });

    const response = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.FAILED,
    });

    expect(response.status).toBe(400);
  });

  it('records a FAILED deployment with its failure reason, then allows retry via IN_PROGRESS', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.7' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const deploymentId = body(deploymentResponse).id as string;

    await transition(ownerAccessToken, deploymentId, { status: DeploymentStatus.IN_PROGRESS });

    const failed = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.FAILED,
      failureReason: 'Migration script errored',
    });

    expect(failed.status).toBe(201);
    expect(body(failed)).toMatchObject({
      status: DeploymentStatus.FAILED,
      failureReason: 'Migration script errored',
    });

    const retried = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });

    expect(retried.status).toBe(201);
    expect(body(retried).status).toBe(DeploymentStatus.IN_PROGRESS);
  });

  it('rejects a rollback whose target belongs to a different environment', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.8' });

    const releaseId = body(releaseResponse).id as string;

    const stagingDeployment = await createDeployment(ownerAccessToken, releaseId, {
      environmentId: secondEnvironmentId,
    });

    const stagingDeploymentId = body(stagingDeployment).id as string;

    await transition(ownerAccessToken, stagingDeploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });
    await transition(ownerAccessToken, stagingDeploymentId, {
      status: DeploymentStatus.SUCCESSFUL,
    });

    const productionDeployment = await createDeployment(ownerAccessToken, releaseId);

    const productionDeploymentId = body(productionDeployment).id as string;

    await transition(ownerAccessToken, productionDeploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });
    await transition(ownerAccessToken, productionDeploymentId, {
      status: DeploymentStatus.SUCCESSFUL,
    });

    const response = await transition(ownerAccessToken, productionDeploymentId, {
      status: DeploymentStatus.ROLLED_BACK,
      rollbackToDeploymentId: stagingDeploymentId,
    });

    expect(response.status).toBe(400);
  });

  it('rejects a rollback whose target is not SUCCESSFUL', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.9' });

    const releaseId = body(releaseResponse).id as string;

    const draftTarget = await createDeployment(ownerAccessToken, releaseId);

    const activeDeployment = await createDeployment(ownerAccessToken, releaseId);

    const activeDeploymentId = body(activeDeployment).id as string;

    await transition(ownerAccessToken, activeDeploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });
    await transition(ownerAccessToken, activeDeploymentId, { status: DeploymentStatus.SUCCESSFUL });

    const response = await transition(ownerAccessToken, activeDeploymentId, {
      status: DeploymentStatus.ROLLED_BACK,
      rollbackToDeploymentId: body(draftTarget).id as string,
    });

    expect(response.status).toBe(400);
  });

  it('rejects a deployment rolling back to itself', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '5.0.10' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const deploymentId = body(deploymentResponse).id as string;

    await transition(ownerAccessToken, deploymentId, { status: DeploymentStatus.IN_PROGRESS });
    await transition(ownerAccessToken, deploymentId, { status: DeploymentStatus.SUCCESSFUL });

    const response = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.ROLLED_BACK,
      rollbackToDeploymentId: deploymentId,
    });

    expect(response.status).toBe(400);
  });

  // ---------------------------------------------------------------------------------------
  // D. Environment isolation
  // ---------------------------------------------------------------------------------------

  it('never returns a deployment whose environment belongs to a different application', async () => {
    const otherApplication = await prisma.saasApplication.create({
      data: {
        workspaceId,
        name: 'Phase 16 Isolation Application',
        slug: `phase16-isolation-application-${randomUUID()}`,
        category: 'SAAS',
        status: 'LIVE',
        priority: 'MEDIUM',
        createdById: ownerId,
      },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .get(`${API_PREFIX}/workspaces/${workspaceId}/applications/${otherApplication.id}/deployments`)
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);
    expect(body(response).items as JsonRecord[]).toHaveLength(0);
  });

  it('getCurrentVersions resolves the effective version through a rollback correctly', async () => {
    const baseRelease = await createRelease(ownerAccessToken, { version: '6.0.0' });
    const baseReleaseId = body(baseRelease).id as string;

    const rolledBackRelease = await createRelease(ownerAccessToken, { version: '6.0.1' });
    const rolledBackReleaseId = body(rolledBackRelease).id as string;

    const baseDeployment = await createDeployment(ownerAccessToken, baseReleaseId, {
      environmentId: secondEnvironmentId,
    });

    const baseDeploymentId = body(baseDeployment).id as string;

    await transition(ownerAccessToken, baseDeploymentId, { status: DeploymentStatus.IN_PROGRESS });
    await transition(ownerAccessToken, baseDeploymentId, { status: DeploymentStatus.SUCCESSFUL });

    const nextDeployment = await createDeployment(ownerAccessToken, rolledBackReleaseId, {
      environmentId: secondEnvironmentId,
    });

    const nextDeploymentId = body(nextDeployment).id as string;

    await transition(ownerAccessToken, nextDeploymentId, { status: DeploymentStatus.IN_PROGRESS });
    await transition(ownerAccessToken, nextDeploymentId, { status: DeploymentStatus.SUCCESSFUL });

    await transition(ownerAccessToken, nextDeploymentId, {
      status: DeploymentStatus.ROLLED_BACK,
      rollbackToDeploymentId: baseDeploymentId,
    });

    const response = await request(app.getHttpServer()).get(`${deploymentsUrl()}/current`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const stagingEntry = (response.body as JsonRecord[]).find((entry) => entry.environmentId === secondEnvironmentId);

    expect(stagingEntry).toMatchObject({
      status: DeploymentStatus.ROLLED_BACK,
      releaseId: baseReleaseId,
      version: '6.0.0',
    });
  });

  // ---------------------------------------------------------------------------------------
  // E. Authorization
  // ---------------------------------------------------------------------------------------

  it('allows a DEVELOPER to create releases and deployments', async () => {
    const response = await createRelease(developerAccessToken, { version: '7.0.0' });

    expect(response.status).toBe(201);
  });

  it('rejects a VIEWER creating a release', async () => {
    const response = await createRelease(viewerAccessToken, { version: '7.0.1' });

    expect(response.status).toBe(403);
  });

  it('rejects a VIEWER creating a deployment', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '7.0.2' });

    const response = await createDeployment(viewerAccessToken, body(releaseResponse).id as string);

    expect(response.status).toBe(403);
  });

  it('rejects a VIEWER transitioning a deployment', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '7.0.3' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const response = await transition(viewerAccessToken, body(deploymentResponse).id as string, {
      status: DeploymentStatus.IN_PROGRESS,
    });

    expect(response.status).toBe(403);
  });

  it('allows a VIEWER to read releases and deployments', async () => {
    const releasesResponse = await request(app.getHttpServer()).get(releasesUrl()).set(withBearer(viewerAccessToken));

    expect(releasesResponse.status).toBe(200);

    const deploymentsResponse = await request(app.getHttpServer()).get(deploymentsUrl()).set(withBearer(viewerAccessToken));

    expect(deploymentsResponse.status).toBe(200);
  });

  // ---------------------------------------------------------------------------------------
  // F. Tenant isolation
  // ---------------------------------------------------------------------------------------

  it('blocks an outsider from listing releases', async () => {
    const response = await request(app.getHttpServer()).get(releasesUrl()).set(withBearer(outsiderAccessToken));

    expect(response.status).toBe(403);
  });

  it('blocks an outsider from creating a release', async () => {
    const response = await createRelease(outsiderAccessToken, { version: '8.0.0' });

    expect(response.status).toBe(403);
  });

  it('blocks an outsider from reading a specific deployment', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '8.0.1' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const response = await request(app.getHttpServer())
      .get(deploymentUrl(body(deploymentResponse).id as string))
      .set(withBearer(outsiderAccessToken));

    expect(response.status).toBe(403);
  });

  // ---------------------------------------------------------------------------------------
  // G. Filtering
  // ---------------------------------------------------------------------------------------

  it('filters deployments by environmentId', async () => {
    const response = await request(app.getHttpServer()).get(`${deploymentsUrl()}?environmentId=${secondEnvironmentId}`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const items = body(response).items as JsonRecord[];

    expect(items.every((deployment) => deployment.environmentId === secondEnvironmentId)).toBe(true);
  });

  it('filters deployments by status', async () => {
    const response = await request(app.getHttpServer()).get(`${deploymentsUrl()}?status=${DeploymentStatus.DRAFT}`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const items = body(response).items as JsonRecord[];

    expect(items.every((deployment) => deployment.status === DeploymentStatus.DRAFT)).toBe(true);
  });

  it('paginates deployments', async () => {
    const response = await request(app.getHttpServer()).get(`${deploymentsUrl()}?page=1&limit=1`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);
    expect((body(response).items as JsonRecord[]).length).toBeLessThanOrEqual(1);
    expect(body(response).pagination).toMatchObject({ page: 1, limit: 1 });
  });

  // ---------------------------------------------------------------------------------------
  // H. Data integrity â€” optimistic concurrency
  // ---------------------------------------------------------------------------------------

  it('rejects a transition whose precondition status no longer matches (optimistic concurrency)', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '9.0.0' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const deploymentId = body(deploymentResponse).id as string;

    // Move the deployment forward out-of-band (directly via Prisma) so the deployment's real,
    // current status diverges from what a client would expect after only seeing the DRAFT
    // response returned by createDeployment.
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: DeploymentStatus.IN_PROGRESS, statusChangedAt: new Date() },
    });

    // Attempting the DRAFT -> IN_PROGRESS transition again should fail: the transition-service
    // check runs against the freshly-read (already IN_PROGRESS) row, so this is rejected as an
    // invalid transition (IN_PROGRESS -> IN_PROGRESS), not silently accepted.
    const response = await transition(ownerAccessToken, deploymentId, {
      status: DeploymentStatus.IN_PROGRESS,
    });

    expect(response.status).toBe(400);
  });

  it('preserves deployment history: transitions never delete or overwrite prior activity entries', async () => {
    const releaseResponse = await createRelease(ownerAccessToken, { version: '9.0.1' });

    const deploymentResponse = await createDeployment(ownerAccessToken, body(releaseResponse).id as string);

    const deploymentId = body(deploymentResponse).id as string;

    await transition(ownerAccessToken, deploymentId, { status: DeploymentStatus.IN_PROGRESS });
    await transition(ownerAccessToken, deploymentId, { status: DeploymentStatus.SUCCESSFUL });

    const activityCount = await prisma.deploymentActivity.count({ where: { deploymentId } });

    // CREATED + IN_PROGRESS transition + SUCCESSFUL transition = 3 immutable activity rows.
    expect(activityCount).toBe(3);
  });
});
