import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { resetDatabase } from '../helpers/database';
import { readAccessToken } from '../helpers/response';
import { type INestApplication } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from 'src/app.module';
import { configureApplication } from 'src/bootstrap/configure-application';
import { PrismaService } from 'src/database/prisma.service';
import { WebhookAttemptOutcome, WebhookDeliveryStatus, WebhookEventType } from 'src/generated/prisma/client';
import { WebhookDeliveryWorkerService } from 'src/modules/webhooks/services/webhook-delivery-worker.service';
import { type WebhookHttpResult, WebhookOutboundClientService } from 'src/modules/webhooks/services/webhook-outbound-client.service';
import { WebhookSecretCryptoService } from 'src/modules/webhooks/services/webhook-secret-crypto.service';
import { WEBHOOK_RETRY_BASE_DELAY_MS, WEBHOOK_RETRY_MAX_DELAY_MS } from 'src/modules/webhooks/webhooks.constants';
import request from 'supertest';

/**
 * Webhook delivery worker E2E â€” retry/backoff/dead-letter logic.
 *
 * apps/api/src/modules/webhooks/services/webhook-delivery-worker.service.ts's @Interval(5_000)
 * tick() never fires deterministically under Jest (and CI runs with WEBHOOK_WORKER_ENABLED=false
 * anyway â€” see apps/api/.env.test), and existing phase18-webhook-integrations.e2e-spec.ts only
 * seeds already-DEAD_LETTERED rows as fixtures; it never exercises the worker's actual
 * claim -> deliver -> retry-decision code path. This suite closes that gap by resolving the real
 * WebhookDeliveryWorkerService from the Nest DI container and invoking its private
 * runWithLock(deliveryId) method directly (the exact method tick() calls per due delivery, minus
 * the WEBHOOK_WORKER_ENABLED gate and the batch-selection query) â€” not a reimplementation, the
 * same production code path.
 *
 * WebhookOutboundClientService performs real DNS-resolving, SSRF-guarded HTTP calls via undici;
 * there is no local/network endpoint available in this test environment to receive a real
 * delivery. Per the same pattern phase19-repository-integrations.e2e-spec.ts uses for
 * GithubAppService, WebhookOutboundClientService is overridden via
 * Test.createTestingModule(...).overrideProvider(...).useValue(...) with a jest.fn() stand-in â€”
 * a real DI override of the exact same injectable the worker calls, not a network intercept.
 *
 * Tenant scoping: WebhookDeliveryWorkerService.tick()'s batch query
 * (this.prisma.webhookDelivery.findMany) has no workspaceId filter â€” it is a single global
 * worker that claims due deliveries system-wide across all workspaces, scoped only by
 * status/nextAttemptAt/endpoint.enabled. There is no per-tenant processing mode to test, so no
 * "workspace B does not touch workspace A's delivery" test is included here (confirmed by direct
 * source read, not assumed).
 */

const API_PREFIX = '/api/v1';

interface OutboundMock {
  sendJson: jest.Mock<Promise<WebhookHttpResult>, [string, string, Record<string, string>, number]>;
}

function successResult(overrides: Partial<WebhookHttpResult> = {}): WebhookHttpResult {
  return {
    success: true,
    retriable: false,
    statusCode: 200,
    durationMs: 12,
    errorCode: null,
    errorMessage: null,
    ...overrides,
  };
}

function retriableFailureResult(overrides: Partial<WebhookHttpResult> = {}): WebhookHttpResult {
  return {
    success: false,
    retriable: true,
    statusCode: 503,
    durationMs: 8,
    errorCode: 'HTTP_STATUS',
    errorMessage: 'Webhook returned HTTP 503.',
    ...overrides,
  };
}

async function createWorkerTestApp(): Promise<{ app: INestApplication; outbound: OutboundMock }> {
  const outbound: OutboundMock = {
    sendJson: jest.fn(),
  };
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(WebhookOutboundClientService)
    .useValue(outbound)
    .compile();
  const app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

  configureApplication(app, {
    enableSwagger: false,
  });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return { app, outbound };
}

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

describe('Webhook Delivery Worker E2E', () => {
  let app: INestApplication;
  let outbound: OutboundMock;
  let prisma: PrismaService;
  let worker: WebhookDeliveryWorkerService;
  let cryptoService: WebhookSecretCryptoService;
  let workspaceId: string;
  let ownerId: string;

  beforeAll(async () => {
    const built = await createWorkerTestApp();

    app = built.app;
    outbound = built.outbound;

    prisma = app.get(PrismaService);
    worker = app.get(WebhookDeliveryWorkerService);
    cryptoService = app.get(WebhookSecretCryptoService);

    await resetDatabase(prisma);

    const owner = createTestUser({
      name: 'Webhook Worker Owner',
      workspaceName: 'Webhook Worker Workspace',
    });
    const registration = await registerUser(createAgent(app), owner);

    expect(registration.status).toBe(201);

    const accessToken = readAccessToken(registration);
    const workspaceResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces`).set(withBearer(accessToken)).send({
      name: owner.workspaceName,
    });

    expect(workspaceResponse.status).toBe(201);

    const ownerRecord = await prisma.user.findUnique({
      where: { email: owner.email.toLowerCase() },
      select: { id: true },
    });

    ownerId = requireValue(ownerRecord?.id, 'Webhook worker owner was not persisted');

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: ownerId },
      select: { workspaceId: true },
    });

    workspaceId = requireValue(membership?.workspaceId, 'Webhook worker owner workspace was not found');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    outbound.sendJson.mockReset();
  });

  async function createEndpointRecord(overrides: { maxAttempts?: number; enabled?: boolean; name?: string } = {}): Promise<string> {
    const secret = cryptoService.encrypt('worker-test-secret-value');
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        workspaceId,
        name: overrides.name ?? `Worker Test Endpoint ${randomUUID()}`,
        url: 'https://example.test/webhooks/command-center',
        eventTypes: [WebhookEventType.DEPLOYMENT_FAILED],
        secretCiphertext: secret.ciphertext,
        secretIv: secret.iv,
        secretAuthTag: secret.authTag,
        secretKeyVersion: secret.keyVersion,
        timeoutMs: 10_000,
        maxAttempts: overrides.maxAttempts ?? 5,
        enabled: overrides.enabled ?? true,
        createdById: ownerId,
        updatedById: ownerId,
      },
      select: { id: true },
    });

    return endpoint.id;
  }

  async function createDeliveryRecord(
    endpointId: string,
    options: {
      status?: WebhookDeliveryStatus;
      attemptCount?: number;
      maxAttempts?: number;
      nextAttemptAt?: Date;
    } = {},
  ): Promise<string> {
    const event = await prisma.webhookEvent.create({
      data: {
        workspaceId,
        type: WebhookEventType.DEPLOYMENT_FAILED,
        payloadVersion: '2026-08-01',
        occurredAt: new Date(),
        payload: { scenario: 'webhook-delivery-worker-e2e' },
      },
      select: { id: true },
    });
    const delivery = await prisma.webhookDelivery.create({
      data: {
        workspaceId,
        endpointId,
        eventId: event.id,
        status: options.status ?? WebhookDeliveryStatus.PENDING,
        attemptCount: options.attemptCount ?? 0,
        maxAttempts: options.maxAttempts ?? 5,
        nextAttemptAt: options.nextAttemptAt ?? new Date(Date.now() - 1_000),
      },
      select: { id: true },
    });

    return delivery.id;
  }

  async function runDeliveryDirectly(deliveryId: string): Promise<void> {
    // Calls the exact private method tick() invokes per due delivery (claim via advisory lock,
    // then process). Bypasses only the WEBHOOK_WORKER_ENABLED gate and the batch-selection query,
    // neither of which is part of the retry/backoff/dead-letter logic under test.
    await (worker as unknown as { runWithLock(id: string): Promise<void> }).runWithLock(deliveryId);
  }

  // ---------------------------------------------------------------------------------------
  // 1 & 2. First failed attempt -> retry-scheduled with correct exponential backoff
  // ---------------------------------------------------------------------------------------

  it('schedules a retry with attemptNumber incremented and nextAttemptAt in the future on a retriable failure', async () => {
    const endpointId = await createEndpointRecord();
    const deliveryId = await createDeliveryRecord(endpointId, { maxAttempts: 5 });

    outbound.sendJson.mockResolvedValueOnce(retriableFailureResult());

    const before = Date.now();

    await runDeliveryDirectly(deliveryId);

    const after = Date.now();
    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } });

    expect(delivery.status).toBe(WebhookDeliveryStatus.RETRY_SCHEDULED);
    expect(delivery.attemptCount).toBe(1);
    expect(delivery.nextAttemptAt.getTime()).toBeGreaterThan(after);

    // attemptNumber 1 -> base delay * 2^0 = base delay.
    const expectedDelay = WEBHOOK_RETRY_BASE_DELAY_MS;
    const actualDelayFromBefore = delivery.nextAttemptAt.getTime() - before;
    const actualDelayFromAfter = delivery.nextAttemptAt.getTime() - after;

    expect(actualDelayFromAfter).toBeLessThanOrEqual(expectedDelay);
    expect(actualDelayFromBefore).toBeGreaterThanOrEqual(expectedDelay - 500);
    expect(actualDelayFromBefore).toBeLessThanOrEqual(expectedDelay + 2_000);

    const attempts = await prisma.webhookDeliveryAttempt.findMany({ where: { deliveryId } });

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      attemptNumber: 1,
      outcome: WebhookAttemptOutcome.FAILED,
      responseStatus: 503,
    });
  });

  it('follows the exponential backoff formula (base * 2^(attemptNumber-1), capped at the max delay) for a later attempt', async () => {
    const endpointId = await createEndpointRecord();
    // attemptCount=3 persisted -> this attempt will be attemptNumber 4.
    const deliveryId = await createDeliveryRecord(endpointId, { maxAttempts: 8, attemptCount: 3 });

    outbound.sendJson.mockResolvedValueOnce(retriableFailureResult());

    const before = Date.now();

    await runDeliveryDirectly(deliveryId);

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } });

    expect(delivery.status).toBe(WebhookDeliveryStatus.RETRY_SCHEDULED);
    expect(delivery.attemptCount).toBe(4);

    const expectedDelay = Math.min(WEBHOOK_RETRY_BASE_DELAY_MS * 2 ** (4 - 1), WEBHOOK_RETRY_MAX_DELAY_MS);
    const actualDelay = delivery.nextAttemptAt.getTime() - before;

    expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 500);
    expect(actualDelay).toBeLessThanOrEqual(expectedDelay + 2_000);
  });

  it('caps the backoff delay at WEBHOOK_RETRY_MAX_DELAY_MS for a high attempt number', async () => {
    const endpointId = await createEndpointRecord();
    // attemptCount=6 -> attemptNumber 7; base*2^6 = 320,000ms which exceeds the 300,000ms cap.
    const deliveryId = await createDeliveryRecord(endpointId, { maxAttempts: 8, attemptCount: 6 });

    outbound.sendJson.mockResolvedValueOnce(retriableFailureResult());

    const before = Date.now();

    await runDeliveryDirectly(deliveryId);

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } });

    expect(delivery.status).toBe(WebhookDeliveryStatus.RETRY_SCHEDULED);

    const uncappedDelay = WEBHOOK_RETRY_BASE_DELAY_MS * 2 ** (7 - 1);
    expect(uncappedDelay).toBeGreaterThan(WEBHOOK_RETRY_MAX_DELAY_MS);

    const actualDelay = delivery.nextAttemptAt.getTime() - before;

    expect(actualDelay).toBeGreaterThanOrEqual(WEBHOOK_RETRY_MAX_DELAY_MS - 500);
    expect(actualDelay).toBeLessThanOrEqual(WEBHOOK_RETRY_MAX_DELAY_MS + 2_000);
  });

  // ---------------------------------------------------------------------------------------
  // 3. Succeeds on a later attempt
  // ---------------------------------------------------------------------------------------

  it('transitions to SUCCEEDED when a retry-scheduled delivery succeeds', async () => {
    const endpointId = await createEndpointRecord();
    const deliveryId = await createDeliveryRecord(endpointId, {
      status: WebhookDeliveryStatus.RETRY_SCHEDULED,
      attemptCount: 1,
      maxAttempts: 5,
    });

    outbound.sendJson.mockResolvedValueOnce(successResult());

    await runDeliveryDirectly(deliveryId);

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } });

    expect(delivery.status).toBe(WebhookDeliveryStatus.SUCCEEDED);
    expect(delivery.attemptCount).toBe(2);
    expect(delivery.deliveredAt).not.toBeNull();
    expect(delivery.failureCode).toBeNull();
    expect(delivery.failureReason).toBeNull();

    const attempts = await prisma.webhookDeliveryAttempt.findMany({ where: { deliveryId } });

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ attemptNumber: 2, outcome: WebhookAttemptOutcome.SUCCEEDED });

    const endpoint = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } });

    expect(endpoint.lastSuccessAt).not.toBeNull();
  });

  // ---------------------------------------------------------------------------------------
  // 4. Dead-lettered once maxAttempts is reached
  // ---------------------------------------------------------------------------------------

  it('dead-letters the delivery once attemptNumber reaches maxAttempts and the attempt still fails', async () => {
    const endpointId = await createEndpointRecord();
    // maxAttempts=3, attemptCount=2 persisted -> this attempt is attemptNumber 3 === maxAttempts.
    const deliveryId = await createDeliveryRecord(endpointId, {
      status: WebhookDeliveryStatus.RETRY_SCHEDULED,
      attemptCount: 2,
      maxAttempts: 3,
    });

    outbound.sendJson.mockResolvedValueOnce(retriableFailureResult({ statusCode: 500, errorMessage: 'Webhook returned HTTP 500.' }));

    await runDeliveryDirectly(deliveryId);

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } });

    expect(delivery.status).toBe(WebhookDeliveryStatus.DEAD_LETTERED);
    expect(delivery.attemptCount).toBe(3);
    expect(delivery.finishedAt).not.toBeNull();
    expect(delivery.failureCode).toBe('HTTP_STATUS');

    const attempts = await prisma.webhookDeliveryAttempt.findMany({ where: { deliveryId } });

    expect(attempts).toHaveLength(1);
    expect(attempts[0]!.outcome).toBe(WebhookAttemptOutcome.FAILED);
  });

  it('does not retry a non-retriable failure even with attempts remaining (dead-letters immediately)', async () => {
    const endpointId = await createEndpointRecord();
    const deliveryId = await createDeliveryRecord(endpointId, { maxAttempts: 5, attemptCount: 0 });

    outbound.sendJson.mockResolvedValueOnce({
      success: false,
      retriable: false,
      statusCode: 400,
      durationMs: 5,
      errorCode: 'UNSAFE_DESTINATION',
      errorMessage: 'Private and internal webhook destinations are blocked.',
    });

    await runDeliveryDirectly(deliveryId);

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } });

    expect(delivery.status).toBe(WebhookDeliveryStatus.DEAD_LETTERED);
    expect(delivery.attemptCount).toBe(1);
  });

  // ---------------------------------------------------------------------------------------
  // 5. Claim protection â€” no double processing on concurrent calls for the same delivery
  // ---------------------------------------------------------------------------------------

  it('does not double-process the same due delivery when invoked twice concurrently', async () => {
    const endpointId = await createEndpointRecord();
    const deliveryId = await createDeliveryRecord(endpointId, { maxAttempts: 5 });

    outbound.sendJson.mockImplementation(async () => {
      // Give the second concurrent caller a real window to attempt (and fail) to claim
      // the same delivery while the first is still "in flight".
      await new Promise((resolve) => setTimeout(resolve, 50));
      return successResult();
    });

    await Promise.all([runDeliveryDirectly(deliveryId), runDeliveryDirectly(deliveryId)]);

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } });

    expect(delivery.status).toBe(WebhookDeliveryStatus.SUCCEEDED);
    expect(delivery.attemptCount).toBe(1);
    expect(outbound.sendJson).toHaveBeenCalledTimes(1);

    const attempts = await prisma.webhookDeliveryAttempt.findMany({ where: { deliveryId } });

    expect(attempts).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------------------
  // Disabled-endpoint short-circuit (documented worker behavior alongside the retry logic)
  // ---------------------------------------------------------------------------------------

  it('cancels a delivery for a disabled endpoint instead of attempting delivery or retry', async () => {
    const endpointId = await createEndpointRecord({ enabled: false });
    const deliveryId = await createDeliveryRecord(endpointId, { maxAttempts: 5 });

    await runDeliveryDirectly(deliveryId);

    expect(outbound.sendJson).not.toHaveBeenCalled();

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } });

    expect(delivery.status).toBe(WebhookDeliveryStatus.CANCELLED);
    expect(delivery.failureCode).toBe('ENDPOINT_DISABLED');
  });
});
