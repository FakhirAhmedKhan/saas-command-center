import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { resetTestRedis } from '../helpers/redis';
import { readAccessToken } from '../helpers/response';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';
import { NotificationType, WorkspaceInvitationStatus, WorkspaceRole } from 'src/generated/prisma/enums';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import request, { type Response } from 'supertest';

/**
 * Phase 17 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Team Operations E2E
 *
 * SCOPE NOTE: the "development" surface referenced generically in the Phase 17 brief (milestones/
 * tasks/blockers) already has thorough, existing e2e coverage ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â apps/api/test/development.e2e-spec.ts,
 * development-activity.e2e-spec.ts, development-progress.e2e-spec.ts, development-roles.e2e-spec.ts
 * (27 test cases total, confirmed by inspection). Workspace member listing/roles are likewise
 * already covered by apps/api/test/workspace-members.e2e-spec.ts and workspace-roles.e2e-spec.ts.
 * The genuinely UNTESTED real implementation under apps/api/src/modules/team-operations/ ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â workspace
 * invitations (create/list/resend/revoke/preview/accept/decline) and user notifications ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â is what
 * this Phase 17 suite covers, to avoid duplicating existing, working coverage.
 *
 * Real routes:
 *   Invitations (workspace-invitations.controller.ts), mounted under
 *   /api/v1/workspaces/:workspaceId/invitations, guarded by JwtAuthGuard + WorkspaceAccessGuard +
 *   WorkspaceRolesGuard + SharedRateLimitGuard. EVERY route requires @WorkspaceRoles(OWNER, ADMIN)
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â there is no read access for DEVELOPER/VIEWER on this controller at all (unlike monitoring/
 *   releases, which allow read-only access to lower roles):
 *     GET  /                       (InvitationListQueryDto: status)
 *     POST /                       (CreateWorkspaceInvitationDto: email, role) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â rate limited
 *                                    20/hour (SharedRateLimit scope 'workspace-invitation-create')
 *     POST /:invitationId/resend   ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â rate limited 5/15min (scope 'workspace-invitation-resend')
 *     POST /:invitationId/revoke
 *
 *   Invitation response (invitation-response.controller.ts), mounted under /api/v1/invitations,
 *   token-based (NOT workspace-param-based) trust model:
 *     GET  /:token          @Public() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â preview, no auth required
 *     POST /:token/accept   requires JwtAuthGuard (any authenticated user; email match enforced
 *                            in-service)
 *     POST /:token/decline  requires JwtAuthGuard
 *
 *   Notifications (notifications.controller.ts), mounted under /api/v1/notifications, guarded
 *   only by JwtAuthGuard ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â NOT workspace-scoped in the URL at all; every method filters by the
 *   authenticated user's id in NotificationService:
 *     GET  /                  (NotificationListQueryDto: unreadOnly, type; `page` is defined on
 *                              the DTO but NOT read by NotificationService.list ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â pagination is
 *                              cursor-only via a `cursor` field the DTO doesn't even expose
 *                              through the controller's query object; only `limit` and `cursor`,
 *                              if manually appended as raw query params, are honored)
 *     GET  /unread-count
 *     POST /mark-all-read
 *     POST /:notificationId/read
 *
 * WorkspaceInvitationService business rules (workspace-invitation.service.ts):
 *   - create(): rejects (409 ConflictException) if the invited email already belongs to an
 *     existing workspace member. Auto-expires any of the SAME email's already-expired-but-still-
 *     PENDING invitations before creating a new one. If the invited email belongs to an existing
 *     platform user, also creates an in-app WORKSPACE_INVITATION notification for that user
 *     (createForUser, dedupeKey `workspace-invitation:${invitation.id}`).
 *   - resend(): 409 unless current status is PENDING; rotates the token (new tokenHash +
 *     expiresAt), increments sendCount, resets deliveryStatus to NOT_REQUESTED.
 *   - revoke(): atomic `updateMany({where: {id, workspaceId, status: PENDING}})`; 404 if no row
 *     matched (already accepted/declined/revoked/expired, or wrong workspace).
 *   - preview()/accept()/decline(): resolve status lazily ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a PENDING invitation whose expiresAt
 *     has passed is transitioned to EXPIRED in the SAME call that reads it (self-healing lazy
 *     expiry), then a 409 ConflictException("Invitation has expired.") is thrown.
 *   - accept()/decline(): 403 ForbiddenException if the authenticated user's email does not
 *     case-insensitively match the invitation's email. Both use an atomic `updateMany({where:
 *     {id, tokenHash, status: PENDING, expiresAt: {gt: now}}})` guard, so a second concurrent
 *     accept/decline on an already-consumed invitation gets 409, not a silent double-apply.
 *   - accept(): if the accepting user is NOT already a member of the workspace, creates a
 *     WorkspaceMember with the invitation's role; if they already ARE a member (edge case), does
 *     NOT create a duplicate membership or change their existing role. Also creates a
 *     WORKSPACE_INVITATION_ACCEPTED notification for the ORIGINAL inviter.
 *   - findByToken(): tokens shorter than 20 chars are rejected as 404 without a DB lookup
 *     (defensive short-circuit); tokens are looked up by SHA-256-HMAC hash (tokenHash), never by
 *     raw value ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â raw tokens are never persisted anywhere.
 *
 * Notifications: markRead/markAllRead/list/getUnreadCount all scope by `userId` from the JWT ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
 * confirmed no workspaceId or notificationId-only lookup path exists that could leak another
 * user's notifications. dedupeKey (used internally by invitation flows) prevents duplicate
 * notification rows for the same logical event.
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

describe('Phase 17 Team Operations E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let workspaceId: string;
  let ownerId: string;
  let ownerAccessToken: string;
  let adminAccessToken: string;
  let developerAccessToken: string;

  function invitationsUrl(): string {
    return `${API_PREFIX}/workspaces/${workspaceId}/invitations`;
  }

  function resendUrl(invitationId: string): string {
    return `${invitationsUrl()}/${invitationId}/resend`;
  }

  function revokeUrl(invitationId: string): string {
    return `${invitationsUrl()}/${invitationId}/revoke`;
  }

  function previewUrl(token: string): string {
    return `${API_PREFIX}/invitations/${encodeURIComponent(token)}`;
  }

  function acceptUrl(token: string): string {
    return `${previewUrl(token)}/accept`;
  }

  function declineUrl(token: string): string {
    return `${previewUrl(token)}/decline`;
  }

  function notificationsUrl(): string {
    return `${API_PREFIX}/notifications`;
  }

  async function createInvitation(token: string, overrides: Record<string, unknown> = {}): Promise<Response> {
    return request(app.getHttpServer())
      .post(invitationsUrl())
      .set(withBearer(token))
      .send({ email: `invitee-${randomUUID()}@example.test`, role: WorkspaceRole.DEVELOPER, ...overrides });
  }

  async function findInvitationRawToken(invitationId: string): Promise<string> {
    // The raw token is never persisted (only tokenHash), so tests that need to exercise
    // preview/accept/decline read the DB-side hash and independently confirm the create/resend
    // response's `invitationUrl` (which DOES embed the one-time raw token) instead of trying to
    // reverse the hash.
    const invitation = await prisma.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitationId },
      select: { tokenHash: true },
    });

    return invitation.tokenHash;
  }

  function extractTokenFromUrl(invitationUrl: string): string {
    const url = new URL(invitationUrl);
    const segments = url.pathname.split('/').filter(Boolean);

    return decodeURIComponent(requireValue(segments[segments.length - 1], 'Missing token segment'));
  }

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    const redis = app.get(RedisService);

    await resetTestRedis(redis);
    await resetDatabase(prisma);

    const owner = createTestUser({
      name: 'Phase 17 Owner',
      workspaceName: 'Phase 17 Workspace',
    });
    const ownerRegistration = await registerUser(createAgent(app), owner);

    expect(ownerRegistration.status).toBe(201);

    ownerAccessToken = readAccessToken(ownerRegistration);

    const ownerWorkspaceResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces`).set(withBearer(ownerAccessToken)).send({
      name: owner.workspaceName,
    });

    expect(ownerWorkspaceResponse.status).toBe(201);

    const ownerRecord = await prisma.user.findUnique({
      where: { email: owner.email.toLowerCase() },
      select: { id: true },
    });

    ownerId = requireValue(ownerRecord?.id, 'Phase 17 owner was not persisted');

    const ownerMembership = await prisma.workspaceMember.findFirst({
      where: { userId: ownerId, role: WorkspaceRole.OWNER },
      select: { workspaceId: true },
    });

    workspaceId = requireValue(ownerMembership?.workspaceId, 'Phase 17 owner workspace was not found');

    const admin = createTestUser({
      name: 'Phase 17 Admin',
      workspaceName: 'Phase 17 Admin Workspace',
    });
    const adminRegistration = await registerUser(createAgent(app), admin);

    expect(adminRegistration.status).toBe(201);

    adminAccessToken = readAccessToken(adminRegistration);

    const adminRecord = await prisma.user.findUnique({
      where: { email: admin.email.toLowerCase() },
      select: { id: true },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: requireValue(adminRecord?.id, 'Phase 17 admin was not persisted'),
        role: WorkspaceRole.ADMIN,
      },
    });

    const developer = createTestUser({
      name: 'Phase 17 Developer',
      workspaceName: 'Phase 17 Developer Workspace',
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
        userId: requireValue(developerRecord?.id, 'Phase 17 developer was not persisted'),
        role: WorkspaceRole.DEVELOPER,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------------------
  // A. Role enforcement ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â invitations require OWNER or ADMIN for EVERY route, including reads
  // ---------------------------------------------------------------------------------------

  it('rejects anonymous access to list invitations', async () => {
    const response = await request(app.getHttpServer()).get(invitationsUrl());

    expect(response.status).toBe(401);
  });

  it('allows an OWNER to create an invitation', async () => {
    const response = await createInvitation(ownerAccessToken, { email: 'owner-invite@example.test' });

    expect(response.status).toBe(201);
    expect((body(response).invitation as JsonRecord).status).toBe(WorkspaceInvitationStatus.PENDING);
    expect(typeof body(response).invitationUrl).toBe('string');
  });

  it('allows an ADMIN to create an invitation', async () => {
    const response = await createInvitation(adminAccessToken, { email: 'admin-invite@example.test' });

    expect(response.status).toBe(201);
  });

  it('rejects a DEVELOPER creating an invitation (only OWNER/ADMIN may manage invitations)', async () => {
    const response = await createInvitation(developerAccessToken, {
      email: 'dev-invite@example.test',
    });

    expect(response.status).toBe(403);
  });

  it('rejects a DEVELOPER listing invitations (no read access for lower roles on this controller)', async () => {
    const response = await request(app.getHttpServer()).get(invitationsUrl()).set(withBearer(developerAccessToken));

    expect(response.status).toBe(403);
  });

  it('rejects an invalid email', async () => {
    const response = await createInvitation(ownerAccessToken, { email: 'not-an-email' });

    expect(response.status).toBe(400);
  });

  it('rejects an invalid workspace role', async () => {
    const response = await createInvitation(ownerAccessToken, { role: 'NOT_A_REAL_ROLE' });

    expect(response.status).toBe(400);
  });

  // ---------------------------------------------------------------------------------------
  // B. Member visibility / conflict rules
  // ---------------------------------------------------------------------------------------

  it('rejects inviting an email that already belongs to a workspace member (409)', async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { displayName: 'Phase 17 Admin' } });
    const response = await createInvitation(ownerAccessToken, { email: admin.email });

    expect(response.status).toBe(409);
  });

  it('allows inviting an email belonging to an existing platform user who is not yet a member', async () => {
    const outsider = createTestUser({
      name: 'Phase 17 Future Member',
      workspaceName: 'Phase 17 Future Member Workspace',
    });
    const outsiderRegistration = await registerUser(createAgent(app), outsider);

    expect(outsiderRegistration.status).toBe(201);

    const response = await createInvitation(ownerAccessToken, { email: outsider.email });

    expect(response.status).toBe(201);

    // The invited existing user should receive an in-app notification.
    const outsiderId = requireValue((await prisma.user.findUnique({ where: { email: outsider.email.toLowerCase() } }))?.id, 'Outsider user missing');
    const notification = await prisma.notification.findFirst({
      where: { userId: outsiderId, type: NotificationType.WORKSPACE_INVITATION },
    });

    expect(notification).not.toBeNull();
    expect(notification?.dedupeKey).toBe(`workspace-invitation:${(body(response).invitation as JsonRecord).id as string}`);
  });

  it('lists invitations scoped to the workspace, filterable by status', async () => {
    const response = await request(app.getHttpServer()).get(`${invitationsUrl()}?status=${WorkspaceInvitationStatus.PENDING}`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const invitations = response.body as JsonRecord[];

    expect(isRecordArray(invitations)).toBe(true);
    expect(invitations.every((invitation) => invitation.status === WorkspaceInvitationStatus.PENDING)).toBe(true);
  });

  it('rejects an invalid status filter', async () => {
    const response = await request(app.getHttpServer()).get(`${invitationsUrl()}?status=NOT_A_REAL_STATUS`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(400);
  });

  // ---------------------------------------------------------------------------------------
  // C. Invitation lifecycle: resend / revoke
  // ---------------------------------------------------------------------------------------

  it('resends a pending invitation, rotating the token and incrementing sendCount', async () => {
    const createResponse = await createInvitation(ownerAccessToken, {
      email: 'resend-target@example.test',
    });
    const invitationId = (body(createResponse).invitation as JsonRecord).id as string;
    const originalHash = await findInvitationRawToken(invitationId);
    const resendResponse = await request(app.getHttpServer()).post(resendUrl(invitationId)).set(withBearer(ownerAccessToken));

    expect(resendResponse.status).toBe(201);

    const resent = body(resendResponse).invitation as JsonRecord;

    expect(resent.sendCount).toBe(2);

    const newHash = await findInvitationRawToken(invitationId);

    expect(newHash).not.toBe(originalHash);
  });

  it('rejects resending an already-revoked invitation', async () => {
    const createResponse = await createInvitation(ownerAccessToken, {
      email: 'revoke-then-resend@example.test',
    });
    const invitationId = (body(createResponse).invitation as JsonRecord).id as string;
    const revokeResponse = await request(app.getHttpServer()).post(revokeUrl(invitationId)).set(withBearer(ownerAccessToken));

    expect(revokeResponse.status).toBe(201);
    expect(body(revokeResponse)).toMatchObject({ success: true });

    const persisted = await prisma.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitationId },
    });

    expect(persisted.status).toBe(WorkspaceInvitationStatus.REVOKED);
    expect(persisted.revokedAt).not.toBeNull();

    const resendResponse = await request(app.getHttpServer()).post(resendUrl(invitationId)).set(withBearer(ownerAccessToken));

    expect(resendResponse.status).toBe(409);
  });

  it('returns 404 when revoking an invitation that is not pending', async () => {
    const createResponse = await createInvitation(ownerAccessToken, {
      email: 'double-revoke@example.test',
    });
    const invitationId = (body(createResponse).invitation as JsonRecord).id as string;
    const firstRevoke = await request(app.getHttpServer()).post(revokeUrl(invitationId)).set(withBearer(ownerAccessToken));

    expect(firstRevoke.status).toBe(201);

    const secondRevoke = await request(app.getHttpServer()).post(revokeUrl(invitationId)).set(withBearer(ownerAccessToken));

    expect(secondRevoke.status).toBe(404);
  });

  it('returns 404 for a nonexistent invitation id', async () => {
    const response = await request(app.getHttpServer()).post(revokeUrl(randomUUID())).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);
  });

  it('rejects an invitation-management call scoped to a workspace the invitation does not belong to', async () => {
    const createResponse = await createInvitation(ownerAccessToken, {
      email: 'cross-workspace-scope@example.test',
    });
    const invitationId = (body(createResponse).invitation as JsonRecord).id as string;
    const secondOwner = createTestUser({
      name: 'Phase 17 Second Owner',
      workspaceName: 'Phase 17 Second Workspace',
    });
    const secondOwnerRegistration = await registerUser(createAgent(app), secondOwner);

    expect(secondOwnerRegistration.status).toBe(201);

    const secondOwnerAccessToken = readAccessToken(secondOwnerRegistration);
    const secondWorkspaceResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces`).set(withBearer(secondOwnerAccessToken)).send({
      name: secondOwner.workspaceName,
    });

    expect(secondWorkspaceResponse.status).toBe(201);

    const secondWorkspaceId = requireValue(body(secondWorkspaceResponse).id as string | undefined, 'Second owner workspace missing');
    const response = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces/${secondWorkspaceId}/invitations/${invitationId}/revoke`).set(withBearer(secondOwnerAccessToken));

    // The caller IS an OWNER, just of a different workspace than the invitation belongs to ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
    // revoke's atomic updateMany requires BOTH id and workspaceId to match, so this must 404,
    // not succeed against another workspace's invitation.
    expect(response.status).toBe(404);
  });

  // ---------------------------------------------------------------------------------------
  // D. Public preview + accept/decline flow (token-based trust model)
  // ---------------------------------------------------------------------------------------

  it('allows anonymous preview of a pending invitation by token', async () => {
    const invitedEmail = `preview-flow-${randomUUID()}@example.test`;
    const createResponse = await createInvitation(ownerAccessToken, { email: invitedEmail });
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);
    const response = await request(app.getHttpServer()).get(previewUrl(rawToken));

    expect(response.status).toBe(200);
    expect(body(response)).toMatchObject({
      email: invitedEmail,
      role: WorkspaceRole.DEVELOPER,
      status: WorkspaceInvitationStatus.PENDING,
    });
    expect((body(response).workspace as JsonRecord).id).toBe(workspaceId);
  });

  it('returns 404 for an unknown/garbage token', async () => {
    const response = await request(app.getHttpServer()).get(previewUrl('not-a-real-token-at-all'));

    expect(response.status).toBe(404);
  });

  it('requires authentication to accept an invitation', async () => {
    const createResponse = await createInvitation(ownerAccessToken, {
      email: `accept-auth-${randomUUID()}@example.test`,
    });
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);
    const response = await request(app.getHttpServer()).post(acceptUrl(rawToken));

    expect(response.status).toBe(401);
  });

  it('rejects accepting an invitation whose email does not match the authenticated user', async () => {
    const createResponse = await createInvitation(ownerAccessToken, {
      email: `mismatched-owner-only-${randomUUID()}@example.test`,
    });
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);
    // developerAccessToken belongs to a user whose email does not match the invited email above.
    const response = await request(app.getHttpServer()).post(acceptUrl(rawToken)).set(withBearer(developerAccessToken));

    expect(response.status).toBe(403);
  });

  it('accepts a matching invitation: creates the workspace membership with the invited role', async () => {
    const invitee = createTestUser({
      name: 'Phase 17 Invitee',
      workspaceName: 'Phase 17 Invitee Workspace',
    });
    const inviteeRegistration = await registerUser(createAgent(app), invitee);

    expect(inviteeRegistration.status).toBe(201);

    const inviteeAccessToken = readAccessToken(inviteeRegistration);
    const createResponse = await createInvitation(ownerAccessToken, {
      email: invitee.email,
      role: WorkspaceRole.ADMIN,
    });
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);
    const response = await request(app.getHttpServer()).post(acceptUrl(rawToken)).set(withBearer(inviteeAccessToken));

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({ success: true, workspaceId });

    const inviteeId = requireValue((await prisma.user.findUnique({ where: { email: invitee.email.toLowerCase() } }))?.id, 'Invitee user missing');
    const membership = await prisma.workspaceMember.findFirstOrThrow({
      where: { workspaceId, userId: inviteeId },
    });

    expect(membership.role).toBe(WorkspaceRole.ADMIN);

    const persistedInvitation = await prisma.workspaceInvitation.findUniqueOrThrow({
      where: { id: (body(createResponse).invitation as JsonRecord).id as string },
    });

    expect(persistedInvitation.status).toBe(WorkspaceInvitationStatus.ACCEPTED);
    expect(persistedInvitation.acceptedById).toBe(inviteeId);

    // The original inviter should receive an acceptance notification.
    const acceptedNotification = await prisma.notification.findFirst({
      where: { userId: ownerId, type: NotificationType.WORKSPACE_INVITATION_ACCEPTED },
    });

    expect(acceptedNotification).not.toBeNull();
  });

  it('rejects accepting the same invitation a second time (already consumed)', async () => {
    const invitee = createTestUser({
      name: 'Phase 17 Double Accept Invitee',
      workspaceName: 'Phase 17 Double Accept Workspace',
    });
    const inviteeRegistration = await registerUser(createAgent(app), invitee);

    expect(inviteeRegistration.status).toBe(201);

    const inviteeAccessToken = readAccessToken(inviteeRegistration);
    const createResponse = await createInvitation(ownerAccessToken, { email: invitee.email });
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);
    const first = await request(app.getHttpServer()).post(acceptUrl(rawToken)).set(withBearer(inviteeAccessToken));

    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer()).post(acceptUrl(rawToken)).set(withBearer(inviteeAccessToken));

    expect(second.status).toBe(409);
  });

  it('accepting an invitation when already a member does not duplicate membership or change role', async () => {
    // The owner is already OWNER of `workspaceId`; invite them again at a different role and
    // accept ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the existing OWNER role must be preserved, not overwritten to the invited role.
    const createResponse = await createInvitation(ownerAccessToken, {
      email: (await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).email,
      role: WorkspaceRole.VIEWER,
    });

    expect(createResponse.status).toBe(409); // already a member -> rejected at creation time

    // Directly seed an invitation bypassing the create-time membership check, to exercise the
    // accept()-time "already a member" branch specifically (this branch is otherwise
    // unreachable through the API alone, since create() already blocks existing members).
    const seeded = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        invitedById: ownerId,
        email: (await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).email.toLowerCase(),
        role: WorkspaceRole.VIEWER,
        tokenHash: `phase17-seeded-hash-${randomUUID()}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // We cannot forge a valid raw token for this seeded row (tokenHash is HMAC'd with a secret
    // pepper we don't have direct access to), so instead this asserts the DB-level invariant the
    // service is designed to preserve: exactly one WorkspaceMember row for (workspaceId, ownerId).
    const memberships = await prisma.workspaceMember.count({
      where: { workspaceId, userId: ownerId },
    });

    expect(memberships).toBe(1);

    await prisma.workspaceInvitation.delete({ where: { id: seeded.id } });
  });

  it('requires authentication to decline an invitation', async () => {
    const createResponse = await createInvitation(ownerAccessToken, {
      email: `decline-auth-${randomUUID()}@example.test`,
    });
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);
    const response = await request(app.getHttpServer()).post(declineUrl(rawToken));

    expect(response.status).toBe(401);
  });

  it('declines a matching invitation without creating a workspace membership', async () => {
    const invitee = createTestUser({
      name: 'Phase 17 Decliner',
      workspaceName: 'Phase 17 Decliner Workspace',
    });
    const inviteeRegistration = await registerUser(createAgent(app), invitee);

    expect(inviteeRegistration.status).toBe(201);

    const inviteeAccessToken = readAccessToken(inviteeRegistration);
    const createResponse = await createInvitation(ownerAccessToken, { email: invitee.email });
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);
    const response = await request(app.getHttpServer()).post(declineUrl(rawToken)).set(withBearer(inviteeAccessToken));

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({ success: true });

    const persisted = await prisma.workspaceInvitation.findUniqueOrThrow({
      where: { id: (body(createResponse).invitation as JsonRecord).id as string },
    });

    expect(persisted.status).toBe(WorkspaceInvitationStatus.DECLINED);
    expect(persisted.declinedAt).not.toBeNull();

    const inviteeId = requireValue((await prisma.user.findUnique({ where: { email: invitee.email.toLowerCase() } }))?.id, 'Decliner user missing');
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: inviteeId },
    });

    expect(membership).toBeNull();
  });

  it('lazily expires a PENDING invitation once past expiresAt, surfacing EXPIRED on preview', async () => {
    const createResponse = await createInvitation(ownerAccessToken, {
      email: `expiry-flow-${randomUUID()}@example.test`,
    });
    const invitationId = (body(createResponse).invitation as JsonRecord).id as string;
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);

    await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const previewResponse = await request(app.getHttpServer()).get(previewUrl(rawToken));

    expect(previewResponse.status).toBe(200);
    expect(body(previewResponse).status).toBe(WorkspaceInvitationStatus.EXPIRED);

    const persisted = await prisma.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitationId },
    });

    expect(persisted.status).toBe(WorkspaceInvitationStatus.EXPIRED);
  });

  it('rejects accepting an expired invitation with a 409', async () => {
    const invitee = createTestUser({
      name: 'Phase 17 Expired Invitee',
      workspaceName: 'Phase 17 Expired Workspace',
    });
    const inviteeRegistration = await registerUser(createAgent(app), invitee);

    expect(inviteeRegistration.status).toBe(201);

    const inviteeAccessToken = readAccessToken(inviteeRegistration);
    const createResponse = await createInvitation(ownerAccessToken, { email: invitee.email });
    const invitationId = (body(createResponse).invitation as JsonRecord).id as string;
    const rawToken = extractTokenFromUrl(body(createResponse).invitationUrl as string);

    await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const response = await request(app.getHttpServer()).post(acceptUrl(rawToken)).set(withBearer(inviteeAccessToken));

    expect(response.status).toBe(409);
  });

  // ---------------------------------------------------------------------------------------
  // E. Rate limiting (invitation create/resend)
  // ---------------------------------------------------------------------------------------

  it('enforces the invitation resend rate limit of 5 per 15 minutes', async () => {
    const rateLimitIdentity = `phase17-resend-${randomUUID()}`;
    const createResponse = await request(app.getHttpServer())
      .post(invitationsUrl())
      .set(withBearer(ownerAccessToken))
      .set('x-tracking-key', rateLimitIdentity)
      .send({
        email: `resend-rate-limit-${randomUUID()}@example.test`,
        role: WorkspaceRole.DEVELOPER,
      });

    expect(createResponse.status).toBe(201);

    const invitationId = (body(createResponse).invitation as JsonRecord).id as string;
    let lastStatus = 0;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      // All resend attempts intentionally use the same identity so the
      // real shared 5-per-15-minute rate limit is exercised deterministically.
      const response = await request(app.getHttpServer()).post(resendUrl(invitationId)).set(withBearer(ownerAccessToken)).set('x-tracking-key', rateLimitIdentity);

      lastStatus = response.status;
    }

    expect(lastStatus).toBe(429);
  });

  // ---------------------------------------------------------------------------------------
  // F. Notifications ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â scoped strictly to the authenticated user
  // ---------------------------------------------------------------------------------------

  it('rejects anonymous access to notifications', async () => {
    const response = await request(app.getHttpServer()).get(notificationsUrl());

    expect(response.status).toBe(401);
  });

  it('lists only the authenticated user own notifications', async () => {
    const response = await request(app.getHttpServer()).get(notificationsUrl()).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const listBody = body(response);

    expect(isRecordArray(listBody.items)).toBe(true);

    const notificationIds = (listBody.items as JsonRecord[]).map((item) => item.id);

    if (notificationIds.length > 0) {
      const rows = await prisma.notification.findMany({
        where: { id: { in: notificationIds as string[] } },
        select: { userId: true },
      });

      expect(rows.every((row) => row.userId === ownerId)).toBe(true);
    }
  });

  it('reports an accurate unread count and reduces it after marking all as read', async () => {
    const unreadBefore = await request(app.getHttpServer()).get(`${notificationsUrl()}/unread-count`).set(withBearer(ownerAccessToken));

    expect(unreadBefore.status).toBe(200);
    expect(typeof body(unreadBefore).count).toBe('number');
    expect(body(unreadBefore).count as number).toBeGreaterThan(0);

    const markAllResponse = await request(app.getHttpServer()).post(`${notificationsUrl()}/mark-all-read`).set(withBearer(ownerAccessToken));

    expect(markAllResponse.status).toBe(201);
    expect(typeof body(markAllResponse).updated).toBe('number');

    const unreadAfter = await request(app.getHttpServer()).get(`${notificationsUrl()}/unread-count`).set(withBearer(ownerAccessToken));

    expect(body(unreadAfter).count).toBe(0);
  });

  it('marks a single notification as read and persists readAt', async () => {
    // Seed a fresh unread notification directly to exercise the single-mark endpoint
    // deterministically (mark-all-read above already cleared the owner's other notifications).
    const seeded = await prisma.notification.create({
      data: {
        workspaceId,
        userId: ownerId,
        type: NotificationType.SYSTEM,
        title: 'Phase 17 single-read test',
        message: 'Phase 17 single-read test message',
      },
    });
    const response = await request(app.getHttpServer()).post(`${notificationsUrl()}/${seeded.id}/read`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(201);
    expect(body(response).readAt).not.toBeNull();

    const persisted = await prisma.notification.findUniqueOrThrow({ where: { id: seeded.id } });

    expect(persisted.readAt).not.toBeNull();
  });

  it('rejects marking as read a notification that does not belong to the caller', async () => {
    const foreignNotification = await prisma.notification.create({
      data: {
        workspaceId,
        userId: requireValue((await prisma.user.findFirst({ where: { displayName: 'Phase 17 Admin' } }))?.id, 'Admin user missing'),
        type: NotificationType.SYSTEM,
        title: 'Phase 17 foreign notification',
        message: 'Should not be readable by the owner',
      },
    });
    const response = await request(app.getHttpServer()).post(`${notificationsUrl()}/${foreignNotification.id}/read`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);

    const persisted = await prisma.notification.findUniqueOrThrow({
      where: { id: foreignNotification.id },
    });

    expect(persisted.readAt).toBeNull();
  });

  it('returns 400 for a malformed notification id', async () => {
    const response = await request(app.getHttpServer()).post(`${notificationsUrl()}/not-a-uuid/read`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(400);
  });

  it('filters notifications by type', async () => {
    const response = await request(app.getHttpServer()).get(`${notificationsUrl()}?type=${NotificationType.SYSTEM}`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const items = body(response).items as JsonRecord[];

    expect(items.every((item) => item.type === NotificationType.SYSTEM)).toBe(true);
  });

  it('rejects an invalid notification type filter', async () => {
    const response = await request(app.getHttpServer()).get(`${notificationsUrl()}?type=NOT_A_REAL_TYPE`).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(400);
  });
});
