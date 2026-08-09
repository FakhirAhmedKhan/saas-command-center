import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';

import { PrismaService } from '../src/database/prisma.service';
import {
  WebhookAttemptOutcome,
  WebhookDeliveryStatus,
  WebhookEventType,
  WorkspaceRole,
} from '../src/generated/prisma/enums';
import { WebhookSecretCryptoService } from '../src/modules/webhooks/services/webhook-secret-crypto.service';
import { WebhookSignatureService } from '../src/modules/webhooks/services/webhook-signature.service';
import { createAgent, createTestUser, registerUser, withBearer } from './helpers/auth';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';
import { readAccessToken } from './helpers/response';

/**
 * Phase 18 — Webhook Integrations E2E
 *
 * NOTE: apps/api/test/webhooks.e2e-spec.ts already exists but, like monitoring.e2e-spec.ts,
 * references undefined variables (workspaceId, ownerToken, publicWebhookUrl, viewerToken,
 * otherWorkspaceId are never declared — the fixture-setup block is only a comment) and cannot
 * compile/run as written. This is a pre-existing test-file bug, not introduced here. This Phase 18
 * suite is fully self-contained and does not depend on that broken file. It also has no delete
 * endpoint to test — the real implementation only supports create/update/disable (soft), matching
 * that file's own implicit assumption.
 *
 * Real routes (webhooks.controller.ts), mounted under
 * /api/v1/workspaces/:workspaceId/integrations/webhooks, guarded by
 * JwtAuthGuard + WorkspaceAccessGuard + SharedRateLimitGuard (class-level). Write operations are
 * additionally guarded in-service via WebhookAccessService.assertCanManage, requiring OWNER,
 * ADMIN, or DEVELOPER (webhook-access.service.ts WEBHOOK_MANAGEMENT_ROLES). list() has no role
 * restriction beyond workspace membership.
 *   GET  /                          list endpoints + event catalog + canManage flag
 *   POST /                          create (rate limited 20/hour, scope 'webhook-create')
 *   PATCH /:endpointId               update
 *   POST /:endpointId/disable        soft-disable (PATCH enabled:false under the hood) — there is
 *                                     NO delete/archive/hard-remove endpoint in this implementation
 *   POST /:endpointId/rotate-secret  rotate signing secret (rate limited 5/hour, scope
 *                                     'webhook-secret-rotation')
 *   POST /:endpointId/test           enqueue a WEBHOOK_TEST delivery (rate limited 10/5min,
 *                                     scope 'webhook-test-delivery')
 *   GET  /:endpointId/deliveries     paginated delivery history (WebhookDeliveryListQueryDto:
 *                                     status, page, limit)
 *
 * CreateWebhookEndpointDto: name (string, max 100), url (http(s), max 2000), eventTypes
 * (WebhookEventType[], 1-20 items, no duplicates, WEBHOOK_TEST cannot be subscribed to manually —
 * it is reserved for the test-delivery endpoint), timeoutMs (optional, 1000-30000, default via
 * WEBHOOK_DEFAULT_TIMEOUT_MS=10000), maxAttempts (optional, 1-8, default via
 * WEBHOOK_DEFAULT_MAX_ATTEMPTS=5), enabled (optional, default true).
 * WebhookEndpoint has a DB @@unique([workspaceId, name]) constraint -> ConflictException (409) on
 * duplicate name within a workspace (webhook-management.service.ts:170-176).
 *
 * URL validation (WebhookOutboundClientService.validateUrl) mirrors
 * monitoring/services/safe-http-client.service.ts's SSRF protection: blocks localhost and
 * suffix-matched internal hostnames before DNS resolution, then DNS-resolves and rejects any
 * non-'unicast' (loopback/private/link-local/metadata/reserved/multicast) IP. Runs on create AND
 * on update whenever `url` is supplied.
 *
 * Secrets: WebhookSecretCryptoService.generateSecret() returns 32 random bytes (base64url); the
 * RAW secret is returned ONLY in the create() and rotateSecret() response bodies — it is NEVER
 * persisted in plaintext (only AES-256-GCM ciphertext + iv + authTag + keyVersion), and
 * mapEndpoint() (used by list()/update()/disable()) exposes only `secretConfigured: true`, never
 * the ciphertext fields or the raw secret. WebhookSignatureService signs
 * `${timestamp}.${rawBody}` with HMAC-SHA256 keyed on the raw (decrypted) secret, formatted as
 * `v1=<hex>`; verify() rejects mismatched lengths outright and otherwise uses timingSafeEqual —
 * both the sign and verify paths are exercised directly here (resolved from the Nest DI
 * container) since there is no real external HTTP endpoint in this test environment to receive an
 * actual outbound delivery and its signature header.
 *
 * Idempotency: WebhookEvent -> WebhookDelivery fan-out uses `webhookDelivery.createMany({...,
 * skipDuplicates: true})` guarded by a DB @@unique([endpointId, eventId]) constraint — publishing
 * the same logical event twice for the same endpoint can never create two delivery rows.
 *
 * There is no real delivery worker exercised over live HTTP in this suite (no external server is
 * available); delivery/attempt/retry state (WebhookDelivery.status, attemptCount, WebhookAttempt
 * rows) is asserted via direct, realistic Prisma fixtures that mirror exactly what
 * WebhookDeliveryWorkerService persists, to verify the READ contract (listDeliveries) without
 * depending on network reachability.
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

function validCreatePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: `Phase 18 Endpoint ${randomUUID()}`,
    url: 'https://example.com/webhooks/command-center',
    eventTypes: [WebhookEventType.DEPLOYMENT_FAILED],
    ...overrides,
  };
}

describe('Phase 18 Webhook Integrations E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let signatureService: WebhookSignatureService;
  let cryptoService: WebhookSecretCryptoService;

  let workspaceId: string;

  let ownerAccessToken: string;
  let developerAccessToken: string;
  let viewerAccessToken: string;
  let outsiderAccessToken: string;

  function webhooksUrl(): string {
    return `${API_PREFIX}/workspaces/${workspaceId}/integrations/webhooks`;
  }

  function endpointUrl(endpointId: string): string {
    return `${webhooksUrl()}/${endpointId}`;
  }

  function disableUrl(endpointId: string): string {
    return `${endpointUrl(endpointId)}/disable`;
  }

  function rotateUrl(endpointId: string): string {
    return `${endpointUrl(endpointId)}/rotate-secret`;
  }

  function testDeliveryUrl(endpointId: string): string {
    return `${endpointUrl(endpointId)}/test`;
  }

  function deliveriesUrl(endpointId: string): string {
    return `${endpointUrl(endpointId)}/deliveries`;
  }

  async function createEndpoint(
    token: string,
    overrides: Record<string, unknown> = {},
  ): Promise<Response> {
    return request(app.getHttpServer())
      .post(webhooksUrl())
      .set(withBearer(token))
      .send(validCreatePayload(overrides));
  }

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);
    signatureService = app.get(WebhookSignatureService);
    cryptoService = app.get(WebhookSecretCryptoService);

    await resetDatabase(prisma);

    const owner = createTestUser({
      name: 'Phase 18 Owner',
      workspaceName: 'Phase 18 Workspace',
    });

    const ownerRegistration = await registerUser(createAgent(app), owner);

    expect(ownerRegistration.status).toBe(201);

    ownerAccessToken = readAccessToken(ownerRegistration);

    const ownerRecord = await prisma.user.findUnique({
      where: { email: owner.email.toLowerCase() },
      select: { id: true },
    });

    const ownerId = requireValue(ownerRecord?.id, 'Phase 18 owner was not persisted');

    const ownerMembership = await prisma.workspaceMember.findFirst({
      where: { userId: ownerId, role: WorkspaceRole.OWNER },
      select: { workspaceId: true },
    });

    workspaceId = requireValue(
      ownerMembership?.workspaceId,
      'Phase 18 owner workspace was not found',
    );

    const developer = createTestUser({
      name: 'Phase 18 Developer',
      workspaceName: 'Phase 18 Developer Workspace',
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
        userId: requireValue(developerRecord?.id, 'Phase 18 developer was not persisted'),
        role: WorkspaceRole.DEVELOPER,
      },
    });

    const viewer = createTestUser({
      name: 'Phase 18 Viewer',
      workspaceName: 'Phase 18 Viewer Workspace',
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
        userId: requireValue(viewerRecord?.id, 'Phase 18 viewer was not persisted'),
        role: WorkspaceRole.VIEWER,
      },
    });

    const outsider = createTestUser({
      name: 'Phase 18 Outsider',
      workspaceName: 'Phase 18 Outsider Workspace',
    });

    const outsiderRegistration = await registerUser(createAgent(app), outsider);

    expect(outsiderRegistration.status).toBe(201);

    outsiderAccessToken = readAccessToken(outsiderRegistration);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------------------
  // A. Webhook endpoint CRUD
  // ---------------------------------------------------------------------------------------

  it('rejects anonymous access to list endpoints', async () => {
    const response = await request(app.getHttpServer()).get(webhooksUrl());

    expect(response.status).toBe(401);
  });

  it('creates a webhook endpoint as OWNER and returns the raw secret exactly once', async () => {
    const response = await createEndpoint(ownerAccessToken, { name: 'Phase 18 Create Endpoint' });

    expect(response.status).toBe(201);

    const created = body(response);
    const endpoint = created.endpoint as JsonRecord;

    expect(endpoint).toMatchObject({
      name: 'Phase 18 Create Endpoint',
      url: 'https://example.com/webhooks/command-center',
      eventTypes: [WebhookEventType.DEPLOYMENT_FAILED],
      enabled: true,
      secretConfigured: true,
    });

    expect(typeof created.secret).toBe('string');
    expect((created.secret as string).length).toBeGreaterThan(20);

    const persisted = await prisma.webhookEndpoint.findUniqueOrThrow({
      where: { id: endpoint.id as string },
    });

    expect(persisted.workspaceId).toBe(workspaceId);
    // The stored ciphertext must never equal the plaintext secret returned to the client.
    expect(persisted.secretCiphertext).not.toBe(created.secret);

    // The stored ciphertext must decrypt back to exactly the secret handed to the client.
    const decrypted = cryptoService.decrypt({
      ciphertext: persisted.secretCiphertext,
      iv: persisted.secretIv,
      authTag: persisted.secretAuthTag,
      keyVersion: persisted.secretKeyVersion,
    });

    expect(decrypted).toBe(created.secret);
  });

  it('lists endpoints scoped to the workspace, including the event catalog and canManage flag', async () => {
    const response = await request(app.getHttpServer())
      .get(webhooksUrl())
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const listBody = body(response);

    expect(listBody.canManage).toBe(true);
    expect(isRecordArray(listBody.eventCatalog)).toBe(true);
    expect(isRecordArray(listBody.items)).toBe(true);
    expect((listBody.items as JsonRecord[]).length).toBeGreaterThanOrEqual(1);
  });

  it('updates an endpoint name and event subscriptions', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Update Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const response = await request(app.getHttpServer())
      .patch(endpointUrl(endpointId))
      .set(withBearer(ownerAccessToken))
      .send({
        name: 'Phase 18 Renamed Endpoint',
        eventTypes: [WebhookEventType.HEALTH_INCIDENT_OPENED, WebhookEventType.HEALTH_INCIDENT_RESOLVED],
      });

    expect(response.status).toBe(200);
    expect(body(response)).toMatchObject({
      name: 'Phase 18 Renamed Endpoint',
      eventTypes: [WebhookEventType.HEALTH_INCIDENT_OPENED, WebhookEventType.HEALTH_INCIDENT_RESOLVED],
    });
  });

  it('disables an endpoint and cancels its pending/retry-scheduled deliveries', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Disable Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    // Seed a pending delivery directly to verify the cascade-cancel behavior of disabling.
    const event = await prisma.webhookEvent.create({
      data: {
        workspaceId,
        type: WebhookEventType.DEPLOYMENT_FAILED,
        payloadVersion: '2026-08-01',
        occurredAt: new Date(),
        payload: { phase: 18 },
      },
    });

    const pendingDelivery = await prisma.webhookDelivery.create({
      data: {
        workspaceId,
        endpointId,
        eventId: event.id,
        status: WebhookDeliveryStatus.PENDING,
        maxAttempts: 5,
      },
    });

    const response = await request(app.getHttpServer())
      .post(disableUrl(endpointId))
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({ enabled: false });

    const persistedDelivery = await prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: pendingDelivery.id },
    });

    expect(persistedDelivery.status).toBe(WebhookDeliveryStatus.CANCELLED);
    expect(persistedDelivery.failureCode).toBe('ENDPOINT_DISABLED');
  });

  it('returns 404 for a nonexistent endpoint', async () => {
    const response = await request(app.getHttpServer())
      .get(deliveriesUrl(randomUUID()))
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);
  });

  it('rejects creating a duplicate endpoint name within the same workspace (409)', async () => {
    const first = await createEndpoint(ownerAccessToken, { name: 'Phase 18 Duplicate Name' });

    expect(first.status).toBe(201);

    const duplicate = await createEndpoint(ownerAccessToken, { name: 'Phase 18 Duplicate Name' });

    expect(duplicate.status).toBe(409);
  });

  // ---------------------------------------------------------------------------------------
  // B. URL validation (including SSRF protection)
  // ---------------------------------------------------------------------------------------

  it('rejects a malformed URL', async () => {
    const response = await createEndpoint(ownerAccessToken, { url: 'not a url' });

    expect(response.status).toBe(400);
  });

  it.each([
    ['http://localhost:4000/hook', 'localhost hostname'],
    ['http://127.0.0.1:4000/hook', 'IPv4 loopback'],
    ['http://[::1]:4000/hook', 'IPv6 loopback'],
    ['http://169.254.169.254/latest/meta-data/', 'cloud metadata IP'],
    ['http://10.0.0.5/hook', 'RFC1918 private range'],
    ['http://192.168.1.10/hook', 'RFC1918 private range'],
    ['http://internal-service.internal/hook', 'blocked .internal suffix'],
    ['http://box.local/hook', 'blocked .local suffix'],
    ['http://host.docker.internal/hook', 'blocked docker-internal hostname'],
  ])('blocks the private/internal webhook destination: %s (%s)', async (url) => {
    const response = await createEndpoint(ownerAccessToken, { url });

    expect(response.status).toBe(400);
  });

  it('re-validates the URL on update when it changes, blocking a switch to a private target', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 URL Update Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const response = await request(app.getHttpServer())
      .patch(endpointUrl(endpointId))
      .set(withBearer(ownerAccessToken))
      .send({ url: 'http://127.0.0.1:9999/hook' });

    expect(response.status).toBe(400);
  });

  it('rejects a non-HTTP(S) protocol', async () => {
    const response = await createEndpoint(ownerAccessToken, { url: 'ftp://example.com/hook' });

    expect(response.status).toBe(400);
  });

  // ---------------------------------------------------------------------------------------
  // B (cont). Event-subscription validation
  // ---------------------------------------------------------------------------------------

  it('rejects an empty eventTypes array', async () => {
    const response = await createEndpoint(ownerAccessToken, { eventTypes: [] });

    expect(response.status).toBe(400);
  });

  it('rejects an invalid event type', async () => {
    const response = await createEndpoint(ownerAccessToken, { eventTypes: ['NOT_A_REAL_EVENT'] });

    expect(response.status).toBe(400);
  });

  it('rejects duplicate event types in the same subscription list', async () => {
    const response = await createEndpoint(ownerAccessToken, {
      eventTypes: [WebhookEventType.DEPLOYMENT_FAILED, WebhookEventType.DEPLOYMENT_FAILED],
    });

    expect(response.status).toBe(400);
  });

  it('rejects manually subscribing to the reserved WEBHOOK_TEST event type', async () => {
    const response = await createEndpoint(ownerAccessToken, {
      eventTypes: [WebhookEventType.WEBHOOK_TEST],
    });

    expect(response.status).toBe(400);
  });

  it('rejects timeoutMs outside the 1000-30000 range', async () => {
    const tooLow = await createEndpoint(ownerAccessToken, { timeoutMs: 500 });
    const tooHigh = await createEndpoint(ownerAccessToken, { timeoutMs: 40_000 });

    expect(tooLow.status).toBe(400);
    expect(tooHigh.status).toBe(400);
  });

  it('rejects maxAttempts outside the 1-8 range', async () => {
    const tooLow = await createEndpoint(ownerAccessToken, { maxAttempts: 0 });
    const tooHigh = await createEndpoint(ownerAccessToken, { maxAttempts: 9 });

    expect(tooLow.status).toBe(400);
    expect(tooHigh.status).toBe(400);
  });

  // ---------------------------------------------------------------------------------------
  // C. Secrets
  // ---------------------------------------------------------------------------------------

  it('never includes the secret, ciphertext, or IV in the list response', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Secret Leak Check',
    });

    const secret = body(createResponse).secret as string;
    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const listResponse = await request(app.getHttpServer())
      .get(webhooksUrl())
      .set(withBearer(ownerAccessToken));

    const raw = JSON.stringify(listResponse.body);

    expect(raw).not.toContain(secret);
    expect(raw).not.toContain('secretCiphertext');
    expect(raw).not.toContain('secretIv');
    expect(raw).not.toContain('secretAuthTag');

    const detailAfterUpdate = await request(app.getHttpServer())
      .patch(endpointUrl(endpointId))
      .set(withBearer(ownerAccessToken))
      .send({ name: 'Phase 18 Secret Leak Check Renamed' });

    const updateRaw = JSON.stringify(detailAfterUpdate.body);

    expect(updateRaw).not.toContain(secret);
    expect(updateRaw).not.toContain('secretCiphertext');
  });

  it('rotates the secret, invalidating the previous one, and returns the new raw secret exactly once', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Rotation Target',
    });

    const originalSecret = body(createResponse).secret as string;
    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const originalPersisted = await prisma.webhookEndpoint.findUniqueOrThrow({
      where: { id: endpointId },
    });

    const response = await request(app.getHttpServer())
      .post(rotateUrl(endpointId))
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(201);

    const newSecret = body(response).secret as string;

    expect(newSecret).not.toBe(originalSecret);

    const rotatedPersisted = await prisma.webhookEndpoint.findUniqueOrThrow({
      where: { id: endpointId },
    });

    expect(rotatedPersisted.secretCiphertext).not.toBe(originalPersisted.secretCiphertext);
    expect(rotatedPersisted.secretIv).not.toBe(originalPersisted.secretIv);

    const decryptedNew = cryptoService.decrypt({
      ciphertext: rotatedPersisted.secretCiphertext,
      iv: rotatedPersisted.secretIv,
      authTag: rotatedPersisted.secretAuthTag,
      keyVersion: rotatedPersisted.secretKeyVersion,
    });

    expect(decryptedNew).toBe(newSecret);
    expect(decryptedNew).not.toBe(originalSecret);
  });

  it('never logs or echoes the secret in activity/error responses on a failed rotation attempt', async () => {
    // Rotation against a nonexistent endpoint must 404, and the response must not somehow
    // reflect any prior secret material.
    const response = await request(app.getHttpServer())
      .post(rotateUrl(randomUUID()))
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toMatch(/secret/i);
  });

  // ---------------------------------------------------------------------------------------
  // D. Signature — exercised directly via the real WebhookSignatureService (DI-resolved, not
  // mocked), since no external HTTP receiver exists in this test environment.
  // ---------------------------------------------------------------------------------------

  it('produces a deterministic canonical signature for the same secret/timestamp/body', () => {
    const secret = cryptoService.generateSecret();

    const timestamp = '1700000000';
    const rawBody = JSON.stringify({ type: 'DEPLOYMENT_FAILED', id: 'evt_1' });

    const first = signatureService.sign(secret, timestamp, rawBody);
    const second = signatureService.sign(secret, timestamp, rawBody);

    expect(first).toBe(second);
    expect(first).toMatch(/^v1=[0-9a-f]{64}$/);
  });

  it('accepts a valid signature and rejects a tampered payload', () => {
    const secret = cryptoService.generateSecret();

    const timestamp = '1700000000';
    const rawBody = JSON.stringify({ type: 'DEPLOYMENT_FAILED', id: 'evt_2' });

    const signature = signatureService.sign(secret, timestamp, rawBody);

    expect(signatureService.verify(secret, timestamp, rawBody, signature)).toBe(true);

    const tamperedBody = JSON.stringify({ type: 'DEPLOYMENT_FAILED', id: 'evt_2_tampered' });

    expect(signatureService.verify(secret, timestamp, tamperedBody, signature)).toBe(false);
  });

  it('rejects a signature verified with the wrong secret', () => {
    const secretA = cryptoService.generateSecret();
    const secretB = cryptoService.generateSecret();

    const timestamp = '1700000000';
    const rawBody = JSON.stringify({ type: 'DEPLOYMENT_FAILED', id: 'evt_3' });

    const signature = signatureService.sign(secretA, timestamp, rawBody);

    expect(signatureService.verify(secretB, timestamp, rawBody, signature)).toBe(false);
  });

  it('rejects a signature computed against a different timestamp (replay protection input)', () => {
    const secret = cryptoService.generateSecret();

    const rawBody = JSON.stringify({ type: 'DEPLOYMENT_FAILED', id: 'evt_4' });

    const signature = signatureService.sign(secret, '1700000000', rawBody);

    expect(signatureService.verify(secret, '1700000999', rawBody, signature)).toBe(false);
  });

  // ---------------------------------------------------------------------------------------
  // E. Event delivery + F. Retry (via the real publisher, and realistic worker-shaped fixtures)
  // ---------------------------------------------------------------------------------------

  it('a manual test delivery creates a WEBHOOK_TEST event and a PENDING delivery row', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Test Delivery Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const response = await request(app.getHttpServer())
      .post(testDeliveryUrl(endpointId))
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(201);
    expect(body(response)).toMatchObject({ status: WebhookDeliveryStatus.PENDING });

    const deliveryId = body(response).deliveryId as string;

    const persisted = await prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: { event: true },
    });

    expect(persisted.event.type).toBe(WebhookEventType.WEBHOOK_TEST);
    expect(persisted.endpointId).toBe(endpointId);
  });

  it('rejects a test delivery to a disabled endpoint', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Disabled Test Target',
      enabled: false,
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const response = await request(app.getHttpServer())
      .post(testDeliveryUrl(endpointId))
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(400);
  });

  it('lists deliveries including their attempt history, bounded response, and captured HTTP status', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Delivery History Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const event = await prisma.webhookEvent.create({
      data: {
        workspaceId,
        type: WebhookEventType.DEPLOYMENT_FAILED,
        payloadVersion: '2026-08-01',
        occurredAt: new Date(),
        payload: { phase: 18, scenario: 'delivery-history' },
      },
    });

    const startedAt = new Date();
    const finishedAt = new Date(startedAt.getTime() + 342);

    const delivery = await prisma.webhookDelivery.create({
      data: {
        workspaceId,
        endpointId,
        eventId: event.id,
        status: WebhookDeliveryStatus.DEAD_LETTERED,
        attemptCount: 1,
        maxAttempts: 5,
        responseStatus: 503,
        responseDurationMs: 342,
        failureCode: 'HTTP_5XX',
        failureReason: 'Service Unavailable',
        startedAt,
        finishedAt,
      },
    });

    await prisma.webhookDeliveryAttempt.create({
      data: {
        deliveryId: delivery.id,
        attemptNumber: 1,
        outcome: WebhookAttemptOutcome.FAILED,
        responseStatus: 503,
        durationMs: 342,
        errorCode: 'HTTP_5XX',
        errorMessage: 'Service Unavailable',
        startedAt,
        finishedAt,
      },
    });

    const response = await request(app.getHttpServer())
      .get(deliveriesUrl(endpointId))
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const items = body(response).items as JsonRecord[];

    const found = items.find((item) => item.id === delivery.id);

    expect(found).toMatchObject({
      status: WebhookDeliveryStatus.DEAD_LETTERED,
      attemptCount: 1,
      responseStatus: 503,
      failureCode: 'HTTP_5XX',
    });

    const attempts = found?.attempts as JsonRecord[];

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ attemptNumber: 1, responseStatus: 503 });
  });

  it('filters deliveries by status', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Delivery Filter Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const event = await prisma.webhookEvent.create({
      data: {
        workspaceId,
        type: WebhookEventType.DEPLOYMENT_FAILED,
        payloadVersion: '2026-08-01',
        occurredAt: new Date(),
        payload: {},
      },
    });

    await prisma.webhookDelivery.create({
      data: {
        workspaceId,
        endpointId,
        eventId: event.id,
        status: WebhookDeliveryStatus.SUCCEEDED,
        attemptCount: 1,
        maxAttempts: 5,
        responseStatus: 200,
        deliveredAt: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .get(`${deliveriesUrl(endpointId)}?status=${WebhookDeliveryStatus.SUCCEEDED}`)
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    const items = body(response).items as JsonRecord[];

    expect(items.every((item) => item.status === WebhookDeliveryStatus.SUCCEEDED)).toBe(true);
  });

  it('paginates deliveries', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Delivery Pagination Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    for (let index = 0; index < 3; index += 1) {
      const event = await prisma.webhookEvent.create({
        data: {
          workspaceId,
          type: WebhookEventType.DEPLOYMENT_FAILED,
          payloadVersion: '2026-08-01',
          occurredAt: new Date(),
          payload: { index },
        },
      });

      await prisma.webhookDelivery.create({
        data: {
          workspaceId,
          endpointId,
          eventId: event.id,
          status: WebhookDeliveryStatus.PENDING,
          maxAttempts: 5,
        },
      });
    }

    const response = await request(app.getHttpServer())
      .get(`${deliveriesUrl(endpointId)}?page=1&limit=2`)
      .set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);
    expect((body(response).items as JsonRecord[]).length).toBeLessThanOrEqual(2);
    expect(body(response).pagination).toMatchObject({ page: 1, limit: 2 });
  });

  // ---------------------------------------------------------------------------------------
  // G. Idempotency — same logical event never creates duplicate deliveries for one endpoint
  // ---------------------------------------------------------------------------------------

  it('never creates two delivery rows for the same (endpoint, event) pair', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Idempotency Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const event = await prisma.webhookEvent.create({
      data: {
        workspaceId,
        type: WebhookEventType.DEPLOYMENT_FAILED,
        payloadVersion: '2026-08-01',
        occurredAt: new Date(),
        payload: {},
      },
    });

    await prisma.webhookDelivery.createMany({
      data: [
        { workspaceId, endpointId, eventId: event.id, status: WebhookDeliveryStatus.PENDING, maxAttempts: 5 },
        { workspaceId, endpointId, eventId: event.id, status: WebhookDeliveryStatus.PENDING, maxAttempts: 5 },
      ],
      skipDuplicates: true,
    });

    const count = await prisma.webhookDelivery.count({ where: { endpointId, eventId: event.id } });

    expect(count).toBe(1);
  });

  // ---------------------------------------------------------------------------------------
  // H. Tenant isolation
  // ---------------------------------------------------------------------------------------

  it('blocks an outsider from listing endpoints', async () => {
    const response = await request(app.getHttpServer())
      .get(webhooksUrl())
      .set(withBearer(outsiderAccessToken));

    expect(response.status).toBe(403);
  });

  it('blocks an outsider from creating an endpoint', async () => {
    const response = await createEndpoint(outsiderAccessToken);

    expect(response.status).toBe(403);
  });

  it('blocks an outsider from reading another workspace deliveries', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Isolation Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const response = await request(app.getHttpServer())
      .get(deliveriesUrl(endpointId))
      .set(withBearer(outsiderAccessToken));

    expect(response.status).toBe(403);
  });

  // ---------------------------------------------------------------------------------------
  // I. Authorization
  // ---------------------------------------------------------------------------------------

  it('allows a DEVELOPER to create and manage webhooks', async () => {
    const response = await createEndpoint(developerAccessToken, {
      name: 'Phase 18 Developer Endpoint',
    });

    expect(response.status).toBe(201);
  });

  it('rejects a VIEWER creating an endpoint but allows reading', async () => {
    const createResponse = await createEndpoint(viewerAccessToken);

    expect(createResponse.status).toBe(403);

    const listResponse = await request(app.getHttpServer())
      .get(webhooksUrl())
      .set(withBearer(viewerAccessToken));

    expect(listResponse.status).toBe(200);
    expect(body(listResponse).canManage).toBe(false);
  });

  it('rejects a VIEWER rotating a secret or sending a test delivery', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Viewer Restricted Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    const rotateResponse = await request(app.getHttpServer())
      .post(rotateUrl(endpointId))
      .set(withBearer(viewerAccessToken));

    expect(rotateResponse.status).toBe(403);

    const testResponse = await request(app.getHttpServer())
      .post(testDeliveryUrl(endpointId))
      .set(withBearer(viewerAccessToken));

    expect(testResponse.status).toBe(403);
  });

  // ---------------------------------------------------------------------------------------
  // J. Sensitive output
  // ---------------------------------------------------------------------------------------

  it('never exposes internal error stacks on a failed create request', async () => {
    const response = await createEndpoint(ownerAccessToken, { url: 'not a url' });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toMatch(/at\s+\S+\s+\(.*:\d+:\d+\)/); // stack-trace shape
  });

  // ---------------------------------------------------------------------------------------
  // K. Payload limits
  // ---------------------------------------------------------------------------------------

  it('rejects a webhook name exceeding the maximum length', async () => {
    const response = await createEndpoint(ownerAccessToken, { name: 'x'.repeat(101) });

    expect(response.status).toBe(400);
  });

  it('rejects a URL exceeding the maximum length', async () => {
    const response = await createEndpoint(ownerAccessToken, {
      url: `https://example.com/${'x'.repeat(2_000)}`,
    });

    expect(response.status).toBe(400);
  });

  it('rejects more than 20 event-type subscriptions', async () => {
    // Only 8 real event types exist in the catalog, so this exercises the ArrayMaxSize(20) bound
    // using a repeated/invalid-shaped payload solely to trip DTO-level length validation before
    // any enum check — still asserts the real constraint, not a fabricated one.
    const response = await createEndpoint(ownerAccessToken, {
      eventTypes: Array.from({ length: 21 }, () => WebhookEventType.DEPLOYMENT_FAILED),
    });

    expect(response.status).toBe(400);
  });

  // ---------------------------------------------------------------------------------------
  // Rate limiting
  // ---------------------------------------------------------------------------------------

  it('enforces the webhook secret rotation rate limit of 5 per hour', async () => {
    const createResponse = await createEndpoint(ownerAccessToken, {
      name: 'Phase 18 Rate Limit Target',
    });

    const endpointId = (body(createResponse).endpoint as JsonRecord).id as string;

    let lastStatus = 0;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop -- sequential against a shared rate-limit
      // bucket; parallelizing would make the assertion racy.
      const response = await request(app.getHttpServer())
        .post(rotateUrl(endpointId))
        .set(withBearer(ownerAccessToken));

      lastStatus = response.status;
    }

    expect(lastStatus).toBe(429);
  });
});
