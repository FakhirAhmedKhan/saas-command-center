# Guided Workspace Builder — Phases 11–14 Code Pack

## Scope and assumptions

This final code pack assumes Phases 1–10 are implemented and green. It adds production hardening, full frontend/full-stack coverage, controlled rollout, observability, and an optional real-AI provider behind the existing generator interface.

The implementation keeps these invariants:

- Authentication and session ownership are enforced server-side.
- Draft answers and blueprint JSON have strict byte and collection limits.
- Expired sessions are not usable and are removed by an idempotent cleanup job.
- Analytics never include answer text, blueprint contents, credentials, or secrets.
- The feature can be disabled without deleting drafts or reverting a deployment.
- Live AI is optional and never used by automated tests.
- AI output passes the same deterministic schema and compatibility validation as rule output.
- Provider failure falls back to deterministic rules when configured.
- No hidden model reasoning is stored or returned.

## File map

```text
apps/api/src/modules/workspace-onboarding/
  ai/
    ai-blueprint-provider.client.ts
    ai-workspace-blueprint.generator.ts
    generator-orchestrator.service.ts
    workspace-ai-circuit-breaker.service.ts
  guards/
    guided-workspace-builder-enabled.guard.ts
  observability/
    workspace-onboarding-observability.port.ts
    workspace-onboarding-telemetry.service.ts
  security/
    workspace-onboarding-payload.service.ts
  workspace-onboarding-cleanup.service.ts
  workspace-onboarding-feature.service.ts
  workspace-onboarding-public.controller.ts
  workspace-onboarding.controller.ts
  workspace-onboarding.module.ts

apps/web/src/features/workspace-onboarding/
  components/
    guided-builder-entry.tsx
    guided-builder-error.tsx
    resume-draft-banner.tsx
    generator-badge.tsx
  workspace-onboarding-errors.ts

packages/test-code/api/unit/workspace-onboarding/
packages/test-code/api/e2e/workspace-onboarding-security.e2e-spec.ts
packages/test-code/api/e2e/workspace-onboarding-rollout.e2e-spec.ts
packages/test-code/web/unit/features/workspace-onboarding/
packages/test-code/web/e2e/full-stack/fullstack-workspace-onboarding.spec.ts
```

---

# Phase 11 — Security, limits, and retention

## 11.1 Runtime configuration

Add these values to the existing typed runtime configuration and environment validation. Use the repository's existing parsing helpers rather than reading `process.env` throughout feature services.

```env
GUIDED_WORKSPACE_BUILDER_ENABLED=false
WORKSPACE_GENERATOR_PROVIDER=rules
WORKSPACE_GENERATOR_SCHEMA_VERSION=1
WORKSPACE_RULE_SET_VERSION=1.0.0
WORKSPACE_ONBOARDING_SESSION_TTL_HOURS=168
WORKSPACE_ONBOARDING_MAX_ANSWER_BYTES=32768
WORKSPACE_ONBOARDING_MAX_BLUEPRINT_BYTES=131072
WORKSPACE_ONBOARDING_RETENTION_DAYS=30
WORKSPACE_ONBOARDING_CLEANUP_BATCH_SIZE=250
WORKSPACE_ONBOARDING_AI_FALLBACK_ENABLED=true
WORKSPACE_AI_REQUEST_TIMEOUT_MS=15000
WORKSPACE_AI_MAX_RETRIES=1
WORKSPACE_AI_CIRCUIT_FAILURE_THRESHOLD=3
WORKSPACE_AI_CIRCUIT_RESET_MS=60000
```

Configuration contract:

```ts
export interface WorkspaceOnboardingRuntimeConfig {
  enabled: boolean;
  generatorProvider: 'rules' | 'ai';
  schemaVersion: 1;
  ruleSetVersion: string;
  sessionTtlHours: number;
  maxAnswerBytes: number;
  maxBlueprintBytes: number;
  retentionDays: number;
  cleanupBatchSize: number;
  aiFallbackEnabled: boolean;
  aiRequestTimeoutMs: number;
  aiMaxRetries: number;
  aiCircuitFailureThreshold: number;
  aiCircuitResetMs: number;
}
```

Validate numeric values with hard bounds:

```ts
const workspaceOnboardingConfig: WorkspaceOnboardingRuntimeConfig = {
  enabled: getBoolean(config, 'GUIDED_WORKSPACE_BUILDER_ENABLED', false),
  generatorProvider: getEnum(config, 'WORKSPACE_GENERATOR_PROVIDER', ['rules', 'ai'] as const, 'rules'),
  schemaVersion: 1,
  ruleSetVersion: getString(config, 'WORKSPACE_RULE_SET_VERSION', '1.0.0'),
  sessionTtlHours: getBoundedInteger(config, 'WORKSPACE_ONBOARDING_SESSION_TTL_HOURS', 1, 720, 168),
  maxAnswerBytes: getBoundedInteger(config, 'WORKSPACE_ONBOARDING_MAX_ANSWER_BYTES', 1024, 262144, 32768),
  maxBlueprintBytes: getBoundedInteger(config, 'WORKSPACE_ONBOARDING_MAX_BLUEPRINT_BYTES', 4096, 1048576, 131072),
  retentionDays: getBoundedInteger(config, 'WORKSPACE_ONBOARDING_RETENTION_DAYS', 1, 365, 30),
  cleanupBatchSize: getBoundedInteger(config, 'WORKSPACE_ONBOARDING_CLEANUP_BATCH_SIZE', 1, 1000, 250),
  aiFallbackEnabled: getBoolean(config, 'WORKSPACE_ONBOARDING_AI_FALLBACK_ENABLED', true),
  aiRequestTimeoutMs: getBoundedInteger(config, 'WORKSPACE_AI_REQUEST_TIMEOUT_MS', 1000, 60000, 15000),
  aiMaxRetries: getBoundedInteger(config, 'WORKSPACE_AI_MAX_RETRIES', 0, 2, 1),
  aiCircuitFailureThreshold: getBoundedInteger(config, 'WORKSPACE_AI_CIRCUIT_FAILURE_THRESHOLD', 1, 20, 3),
  aiCircuitResetMs: getBoundedInteger(config, 'WORKSPACE_AI_CIRCUIT_RESET_MS', 1000, 600000, 60000),
};
```

The helper names above must be replaced with the exact existing environment-validation helpers.

## 11.2 Payload-size and forbidden-key protection

Create `security/workspace-onboarding-payload.service.ts`:

```ts
import { PayloadTooLargeException, BadRequestException, Injectable } from '@nestjs/common';

const forbiddenKeyPattern = /^(?:access[_-]?token|refresh[_-]?token|client[_-]?secret|webhook[_-]?secret|private[_-]?key|password)$/i;

@Injectable()
export class WorkspaceOnboardingPayloadService {
  byteLength(value: unknown): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  }

  assertWithinLimit(value: unknown, maximumBytes: number, label: string): void {
    const bytes = this.byteLength(value);

    if (bytes > maximumBytes) {
      throw new PayloadTooLargeException(`${label} exceeds the ${maximumBytes}-byte limit`);
    }
  }

  assertNoForbiddenKeys(value: unknown): void {
    const stack: unknown[] = [value];

    while (stack.length > 0) {
      const current = stack.pop();

      if (!current || typeof current !== 'object') continue;

      if (Array.isArray(current)) {
        stack.push(...current);
        continue;
      }

      for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
        if (forbiddenKeyPattern.test(key)) {
          throw new BadRequestException(`Sensitive field "${key}" is not allowed in onboarding data`);
        }

        stack.push(child);
      }
    }
  }

  validateAnswers(value: unknown, maximumBytes: number): void {
    this.assertWithinLimit(value, maximumBytes, 'Answers');
    this.assertNoForbiddenKeys(value);
  }

  validateBlueprint(value: unknown, maximumBytes: number): void {
    this.assertWithinLimit(value, maximumBytes, 'Blueprint');
    this.assertNoForbiddenKeys(value);
  }
}
```

Call `validateAnswers()` before merging an answer patch and `validateBlueprint()` before storing generated or edited blueprints. Keep the global Fastify body limit as a separate outer defense.

## 11.3 Endpoint-specific rate limits

Reuse the existing shared Redis rate-limit decorator/guard and give every route a stable route-specific key. Map the option names to the existing decorator signature:

```ts
@Post()
@SharedRateLimit({ key: 'guided-session-create', limit: 10, windowMs: 60_000 })
create(...) {}

@Patch(':id/answers')
@SharedRateLimit({ key: 'guided-answer-update', limit: 120, windowMs: 60_000 })
updateAnswers(...) {}

@Post(':id/blueprint')
@SharedRateLimit({ key: 'guided-blueprint-generate', limit: 10, windowMs: 60_000 })
generateBlueprint(...) {}

@Post(':id/confirm')
@SharedRateLimit({ key: 'guided-workspace-confirm', limit: 5, windowMs: 60_000 })
confirm(...) {}
```

Rate-limit identity must use authenticated user ID first and normalized client IP only as a fallback. Do not use session IDs as the only rate-limit identity because users could create multiple sessions.

## 11.4 Retention cleanup

Create `workspace-onboarding-cleanup.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PostgresAdvisoryLockService } from '../../infrastructure/database/postgres-advisory-lock.service';

const CLEANUP_LOCK_KEY = 'workspace-onboarding-retention-cleanup';

@Injectable()
export class WorkspaceOnboardingCleanupService {
  private readonly logger = new Logger(WorkspaceOnboardingCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locks: PostgresAdvisoryLockService,
    private readonly runtimeConfig: TypedConfigService,
  ) {}

  async run(): Promise<{ expired: number; deleted: number; skipped: boolean }> {
    const lock = await this.locks.tryWithLock(CLEANUP_LOCK_KEY, async () => {
      const config = this.runtimeConfig.workspaceOnboarding;
      const now = new Date();
      const retentionCutoff = new Date(now.getTime() - config.retentionDays * 24 * 60 * 60 * 1000);

      const expired = await this.prisma.workspaceOnboardingSession.updateMany({
        where: {
          status: { in: ['IN_PROGRESS', 'BLUEPRINT_READY', 'FAILED'] },
          expiresAt: { lte: now },
        },
        data: { status: 'EXPIRED' },
      });

      const candidates = await this.prisma.workspaceOnboardingSession.findMany({
        where: {
          status: 'EXPIRED',
          updatedAt: { lte: retentionCutoff },
        },
        orderBy: { updatedAt: 'asc' },
        select: { id: true },
        take: config.cleanupBatchSize,
      });

      const removed = candidates.length
        ? await this.prisma.workspaceOnboardingSession.deleteMany({
            where: { id: { in: candidates.map(({ id }) => id) } },
          })
        : { count: 0 };

      return {
        expired: expired.count,
        deleted: removed.count,
        skipped: false,
      };
    });

    if (!lock.acquired) {
      this.logger.debug('Workspace onboarding cleanup skipped; lock not acquired');
      return { expired: 0, deleted: 0, skipped: true };
    }

    return lock.value ?? { expired: 0, deleted: 0, skipped: false };
  }
}
```

If the advisory lock service uses a different method signature, adapt only the lock wrapper. Invoke `run()` from the repository's existing background-job scheduler. Do not add a second scheduler framework.

## 11.5 Safe audit events

Define an observability port now and implement it in Phase 13:

```ts
export type WorkspaceOnboardingAuditEvent = 'SESSION_CREATED' | 'SESSION_ACCESS_DENIED' | 'BLUEPRINT_VALIDATION_FAILED' | 'CONFIRMATION_STARTED' | 'CONFIRMATION_SUCCEEDED' | 'CONFIRMATION_FAILED';

export interface WorkspaceOnboardingAuditPort {
  record(input: { event: WorkspaceOnboardingAuditEvent; sessionId?: string; userId?: string; requestId?: string; reasonCode?: string }): Promise<void>;
}
```

Never pass answers, product descriptions, blueprints, repository names, tokens, or exception bodies into this port.

## 11.6 Frontend error normalization

Create `workspace-onboarding-errors.ts`:

```ts
export type GuidedBuilderErrorKind = 'EXPIRED' | 'RATE_LIMITED' | 'FORBIDDEN' | 'STALE' | 'VALIDATION' | 'UNAVAILABLE' | 'UNKNOWN';

export interface GuidedBuilderError {
  kind: GuidedBuilderErrorKind;
  message: string;
  retryable: boolean;
}

export function normalizeGuidedBuilderError(error: unknown): GuidedBuilderError {
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: unknown }).status) : 0;

  if (status === 410) {
    return { kind: 'EXPIRED', message: 'This guided session expired.', retryable: false };
  }
  if (status === 429) {
    return { kind: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.', retryable: true };
  }
  if (status === 401 || status === 403 || status === 404) {
    return { kind: 'FORBIDDEN', message: 'This guided session is unavailable.', retryable: false };
  }
  if (status === 409) {
    return { kind: 'STALE', message: 'The blueprint changed. Reload before continuing.', retryable: true };
  }
  if (status === 422 || status === 400) {
    return { kind: 'VALIDATION', message: 'Some guided configuration is invalid.', retryable: false };
  }
  if (status >= 500) {
    return { kind: 'UNAVAILABLE', message: 'The guided builder is temporarily unavailable.', retryable: true };
  }

  return { kind: 'UNKNOWN', message: 'Something went wrong.', retryable: true };
}
```

Create `guided-builder-error.tsx`:

```tsx
import type { GuidedBuilderError } from '../workspace-onboarding-errors';

export function GuidedBuilderErrorState({ error, onRetry }: { error: GuidedBuilderError; onRetry?: () => void }) {
  return (
    <section className='rounded-2xl border border-red-200 bg-red-50 p-5' role='alert'>
      <h2 className='font-semibold text-red-950'>Unable to continue</h2>
      <p className='mt-2 text-sm text-red-800'>{error.message}</p>
      {error.retryable && onRetry && (
        <button className='mt-4 rounded-lg bg-red-950 px-4 py-2 text-white' onClick={onRetry} type='button'>
          Try again
        </button>
      )}
    </section>
  );
}
```

## 11.7 Phase 11 tests

```ts
describe('WorkspaceOnboardingPayloadService', () => {
  const service = new WorkspaceOnboardingPayloadService();

  it('rejects oversized UTF-8 payloads by byte length', () => {
    expect(() => service.validateAnswers({ productIdea: '🚀'.repeat(100) }, 100)).toThrow('exceeds');
  });

  it.each(['accessToken', 'refresh_token', 'client-secret', 'privateKey'])('rejects forbidden key %s at any nesting level', (key) => {
    expect(() => service.validateBlueprint({ nested: { [key]: 'secret' } }, 10_000)).toThrow('Sensitive field');
  });
});

it('expires and later deletes eligible drafts without deleting completed sessions', async () => {
  await seedExpiredDrafts();
  const result = await cleanup.run();

  expect(result.expired).toBeGreaterThan(0);
  expect(
    await prisma.workspaceOnboardingSession.count({
      where: { status: 'COMPLETED' },
    }),
  ).toBe(1);
});

it('rate limits repeated blueprint generation', async () => {
  const responses = [];
  for (let index = 0; index < 11; index += 1) {
    responses.push(await generateBlueprint(sessionId, ownerToken));
  }
  expect(responses.at(-1)?.statusCode).toBe(429);
});

it('renders custom text as text, not executable markup', async () => {
  await saveAnswer({ productIdea: '<img src=x onerror=window.__xss=1>' });
  await page.goto(reviewUrl);
  await expect(page.getByText('<img src=x onerror=window.__xss=1>')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
});
```

---

# Phase 12 — Complete frontend and full-stack coverage

## 12.1 Workspace creation method entry

Create `guided-builder-entry.tsx` and include it alongside the existing manual and GitHub cards:

```tsx
import Link from 'next/link';

export function GuidedBuilderEntry({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <article className='flex h-full flex-col rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6'>
      <span className='w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800'>Guided recommendations</span>
      <h2 className='mt-4 text-xl font-semibold'>Build from your product idea</h2>
      <p className='mt-2 flex-1 text-sm text-slate-600'>Answer focused questions, review a deterministic blueprint, and create web, mobile, and desktop applications together.</p>
      <Link className='mt-6 rounded-xl bg-slate-950 px-4 py-3 text-center font-medium text-white' href='/workspaces/new/guided'>
        Start guided builder
      </Link>
    </article>
  );
}
```

## 12.2 Start route

The route creates a session only after an explicit button click, then replaces the URL with the session route. This avoids duplicate sessions during React rendering or refresh.

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { workspaceOnboardingApi } from '@/features/workspace-onboarding/api/workspace-onboarding-api';

export default function StartGuidedWorkspacePage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className='mx-auto max-w-2xl p-4 sm:p-8'>
      <h1 className='text-3xl font-bold'>Guided workspace builder</h1>
      <p className='mt-3 text-slate-600'>Your answers stay as a draft until you review and confirm the blueprint.</p>
      {error && (
        <p className='mt-4 text-red-700' role='alert'>
          {error}
        </p>
      )}
      <button
        className='mt-6 rounded-xl bg-slate-950 px-5 py-3 text-white disabled:opacity-50'
        disabled={starting}
        onClick={async () => {
          setStarting(true);
          setError(null);
          try {
            const session = await workspaceOnboardingApi.create();
            router.replace(`/workspaces/new/guided/${session.id}`);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to start');
            setStarting(false);
          }
        }}
        type='button'
      >
        {starting ? 'Starting…' : 'Start questions'}
      </button>
    </main>
  );
}
```

## 12.3 Latest resumable session endpoint

Repository:

```ts
findLatestResumable(userId: string) {
  return this.prisma.workspaceOnboardingSession.findFirst({
    where: {
      userId,
      status: { in: ['IN_PROGRESS', 'BLUEPRINT_READY', 'FAILED'] },
      expiresAt: { gt: new Date() },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
```

Controller:

```ts
@Get('latest')
async latest(@Req() request: AuthenticatedRequest) {
  const session = await this.service.latest(request.user.id);
  return session ? this.service.toResponse(session) : null;
}
```

Place the static `latest` route before the dynamic `:id` route.

Frontend banner:

```tsx
import Link from 'next/link';
import type { WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';

export function ResumeDraftBanner({ session }: { session: WorkspaceOnboardingSessionResponse | null }) {
  if (!session) return null;

  const destination = session.status === 'BLUEPRINT_READY' ? `/workspaces/new/guided/${session.id}/review` : `/workspaces/new/guided/${session.id}`;

  return (
    <aside className='rounded-2xl border border-blue-200 bg-blue-50 p-4'>
      <p className='font-medium text-blue-950'>Continue your guided workspace</p>
      <p className='mt-1 text-sm text-blue-800'>Last updated {new Date(session.updatedAt).toLocaleString()}.</p>
      <Link className='mt-3 inline-flex rounded-lg bg-blue-950 px-4 py-2 text-sm font-medium text-white' href={destination}>
        Resume draft
      </Link>
    </aside>
  );
}
```

## 12.4 Route-state behavior

Use these server-enforced redirects after loading a session:

| Session status    | Route behavior                      |
| ----------------- | ----------------------------------- |
| `IN_PROGRESS`     | Question route                      |
| `BLUEPRINT_READY` | Review route                        |
| `CREATING`        | Creating/status route               |
| `COMPLETED`       | Redirect to workspace               |
| `FAILED`          | Review route with recoverable error |
| `EXPIRED`         | Expired state with start-new action |

Do not rely only on client state for these transitions.

## 12.5 Accessibility requirements implemented in components

```tsx
// Announce save and generation state without moving focus unexpectedly.
<p aria-live="polite" className="sr-only">
  {saving ? 'Saving answer' : saved ? 'Answer saved' : ''}
</p>

// Focus the next question heading after a successful transition.
const headingRef = useRef<HTMLHeadingElement>(null);
useEffect(() => {
  headingRef.current?.focus();
}, [flow.currentQuestion?.key]);

<h2 ref={headingRef} tabIndex={-1}>...</h2>

// Associate field errors.
<textarea aria-describedby={error ? `${question.key}-error` : undefined} />
{error && <p id={`${question.key}-error`} role="alert">{error}</p>}
```

Every option must be reachable by keyboard, visible focus must remain enabled, modal confirmation must trap focus using the repository's existing dialog component, and errors must not be communicated by color alone.

## 12.6 Required component-test matrix

```ts
describe.each([
  ['TEXT', textQuestion],
  ['SINGLE_SELECT', singleChoiceQuestion],
  ['MULTI_SELECT', multiChoiceQuestion],
  ['BOOLEAN', booleanQuestion],
])('%s answer control', (_type, question) => {
  it('has an accessible name and submits a valid value', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OnboardingQuestionCard question={question} onSubmit={onSubmit} />);
    await answerRenderedQuestion(question);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

it('disables duplicate submission while saving', async () => {
  const pending = new Promise<void>(() => undefined);
  render(<OnboardingQuestionCard question={textQuestion} onSubmit={() => pending} />);
  await submitRenderedQuestion();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

it('renders loading, expired, forbidden, retryable and validation states', () => {
  for (const kind of ['EXPIRED', 'FORBIDDEN', 'RATE_LIMITED', 'VALIDATION', 'UNAVAILABLE'] as const) {
    const { unmount } = render(
      <GuidedBuilderErrorState
        error={{ kind, message: kind, retryable: kind === 'RATE_LIMITED' || kind === 'UNAVAILABLE' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(kind);
    unmount();
  }
});
```

## 12.7 Complete Playwright scenario list

Create a reusable flow driver in `e2e/full-stack/helpers/guided-workspace-builder.ts` and connect `loginAsOwner`, database inspection, and deterministic API failure controls to the repository's existing full-stack fixtures:

```ts
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface GuidedFlowOptions {
  name: string;
  applications: Array<'Web' | 'Mobile' | 'Desktop'>;
  mobilePlatforms?: Array<'Android' | 'iOS'>;
  desktopPlatforms?: Array<'Windows' | 'macOS' | 'Linux'>;
  repositories?: 'No repositories' | 'Connect later' | 'Connect now';
}

async function choose(page: Page, prompt: string, labels: string[]) {
  await expect(page.getByRole('heading', { name: prompt })).toBeVisible();
  for (const label of labels) {
    await page.getByRole('button', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

export async function text(page: Page, prompt: string, value: string) {
  await page.getByRole('textbox', { name: prompt }).fill(value);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

export async function answerGuidedFlow(page: Page, options: GuidedFlowOptions) {
  await text(page, 'What are you building?', `${options.name} product`);
  await text(page, 'What should the workspace be called?', options.name);
  await choose(page, 'What type of product is it?', ['Productivity SaaS']);
  await choose(page, 'Who will use the product?', ['Consumers']);
  await choose(page, 'Which applications do you need?', options.applications);

  if (options.applications.includes('Mobile')) {
    await choose(page, 'Which mobile platforms do you need?', options.mobilePlatforms ?? ['Android']);
  }

  if (options.applications.includes('Desktop')) {
    await choose(page, 'Which desktop platforms do you need?', options.desktopPlatforms ?? ['Windows']);
  }

  await choose(page, 'Which core features are required?', ['Dashboard']);
  await choose(page, 'Does the product require user accounts?', ['Yes']);
  await choose(page, 'Do repositories already exist?', [options.repositories ?? 'Connect later']);
  await choose(page, 'Which environments are required?', ['Development', 'Production']);
  await choose(page, 'Which engineering systems are required?', ['CI/CD', 'Monitoring', 'Security']);
}

export async function generateAndConfirm(page: Page) {
  await page
    .getByRole('button', {
      name: 'Generate guided recommendations',
    })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Review guided recommendations',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Confirm and create' }).click();
  await expect(page).toHaveURL(/\/workspaces\/[a-z0-9-]+$/);
}
```

Create independent tests in `fullstack-workspace-onboarding.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { answerGuidedFlow, generateAndConfirm, text } from './helpers/guided-workspace-builder';
import { apiControl, createOwnerSession, database, loginAsOwner, loginAsUser } from './fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await loginAsOwner(page);
  await page.goto('/workspaces/new/guided');
  await page.getByRole('button', { name: 'Start questions' }).click();
});

test('creates a web-only workspace', async ({ page }) => {
  await answerGuidedFlow(page, { name: 'WebFlow', applications: ['Web'] });
  await generateAndConfirm(page);
  await expect(page.getByText('WebFlow')).toBeVisible();
  expect(await database.applicationTypes('WebFlow')).toEqual(['WEB']);
});

test('creates Android and iOS applications', async ({ page }) => {
  await answerGuidedFlow(page, {
    name: 'MobileFlow',
    applications: ['Mobile'],
    mobilePlatforms: ['Android', 'iOS'],
  });
  await generateAndConfirm(page);
  expect(await database.mobilePlatforms('MobileFlow')).toEqual(['ANDROID', 'IOS']);
});

test('creates Windows and macOS desktop targets', async ({ page }) => {
  await answerGuidedFlow(page, {
    name: 'DesktopFlow',
    applications: ['Desktop'],
    desktopPlatforms: ['Windows', 'macOS'],
  });
  await generateAndConfirm(page);
  expect(await database.desktopPlatforms('DesktopFlow')).toEqual(['WINDOWS', 'MACOS']);
});

test('creates web, mobile and desktop together', async ({ page }) => {
  await answerGuidedFlow(page, {
    name: 'EverywhereFlow',
    applications: ['Web', 'Mobile', 'Desktop'],
  });
  await generateAndConfirm(page);
  expect(await database.applicationTypes('EverywhereFlow')).toEqual(['WEB', 'MOBILE', 'DESKTOP']);
});

test('persists an edited generated stack', async ({ page }) => {
  await answerGuidedFlow(page, {
    name: 'EditedFlow',
    applications: ['Desktop'],
  });
  await page.getByRole('button', { name: 'Generate guided recommendations' }).click();
  await page.getByRole('group', { name: 'EditedFlow Desktop' }).getByRole('button', { name: 'ELECTRON' }).click();
  await page.getByRole('group', { name: 'EditedFlow Desktop' }).getByRole('button', { name: 'TAURI' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Confirm and create' }).click();
  expect(await database.desktopStack('EditedFlow')).toContain('ELECTRON');
});

test('resumes an interrupted session after refresh', async ({ page }) => {
  await text(page, 'What are you building?', 'Resume product');
  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: 'What should the workspace be called?',
    }),
  ).toBeVisible();
});

test('removes dependent answers after an earlier change', async ({ page }) => {
  const session = await createOwnerSession({
    applicationTypes: ['MOBILE'],
    mobilePlatforms: ['ANDROID'],
  });
  await page.goto(`/workspaces/new/guided/${session.id}`);
  await apiControl.updateAnswers(session.id, { applicationTypes: ['WEB'] });
  await page.reload();
  expect(await apiControl.session(session.id)).not.toHaveProperty('answers.mobilePlatforms');
});

test('creates with a verified GitHub repository', async ({ page }) => {
  await apiControl.enableGitHubFake();
  await answerGuidedFlow(page, {
    name: 'ConnectedFlow',
    applications: ['Web'],
    repositories: 'Connect now',
  });
  await page.getByRole('button', { name: 'Generate guided recommendations' }).click();
  await page.getByRole('combobox', { name: 'WEB' }).selectOption({ label: 'owner/web-repo' });
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Confirm and create' }).click();
  expect(await database.repositoryStatus('ConnectedFlow')).toBe('CONNECTED');
});

test('creates with repository placeholders', async ({ page }) => {
  await answerGuidedFlow(page, {
    name: 'PlaceholderFlow',
    applications: ['Web'],
    repositories: 'Connect later',
  });
  await generateAndConfirm(page);
  expect(await database.repositoryStatus('PlaceholderFlow')).toBe('PENDING');
});

test('recovers from a transient confirmation failure', async ({ page }) => {
  await answerGuidedFlow(page, { name: 'RetryFlow', applications: ['Web'] });
  await page.getByRole('button', { name: 'Generate guided recommendations' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await apiControl.failNextConfirmation();
  await page.getByRole('button', { name: 'Confirm and create' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm and create' }).click();
  expect(await database.workspaceCount('RetryFlow')).toBe(1);
});

test('prevents duplicate creation after repeated submission', async ({ page }) => {
  await answerGuidedFlow(page, { name: 'OneFlow', applications: ['Web'] });
  await page.getByRole('button', { name: 'Generate guided recommendations' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Confirm and create' }).dblclick();
  await expect(page).toHaveURL(/\/workspaces\/[a-z0-9-]+$/);
  expect(await database.workspaceCount('OneFlow')).toBe(1);
});

test('rejects cross-user session access', async ({ page }) => {
  const session = await createOwnerSession({ workspaceName: 'PrivateFlow' });
  await loginAsUser(page, 'outsider');
  await page.goto(`/workspaces/new/guided/${session.id}`);
  await expect(page.getByText('This guided session is unavailable.')).toBeVisible();
});

test('renders deterministic API error and empty states', async ({ page }) => {
  await page.route('**/workspace-onboarding/sessions/*/questions', (route) => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.reload();
  await expect(page.getByText('temporarily unavailable')).toBeVisible();
});

test('completes the flow at 390x844 without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await answerGuidedFlow(page, { name: 'PocketFlow', applications: ['Web'] });
  await generateAndConfirm(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('keeps manual and GitHub creation operational', async ({ page }) => {
  await apiControl.createManualWorkspace(page, 'ManualRegression');
  await expect(page.getByText('ManualRegression')).toBeVisible();
  await apiControl.importGitHubWorkspace(page, 'GitHubRegression');
  await expect(page.getByText('GitHubRegression')).toBeVisible();
});
```

`database` and `apiControl` are test-only adapters over existing seed/cleanup helpers. They must never be compiled into the production web application. Independent tests make failures diagnosable and allow Playwright retries without duplicating a previously created workspace.

## 12.8 Responsive assertion

```ts
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(guidedUrl);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

expect(overflow).toBe(false);
await expect(page.getByRole('main')).toBeVisible();
await expect(page.getByRole('button', { name: /continue|generate|confirm/i })).toBeVisible();
```

---

# Phase 13 — Observability and controlled rollout

## 13.1 Feature service and guard

Create `workspace-onboarding-feature.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceOnboardingFeatureService {
  constructor(private readonly config: TypedConfigService) {}

  isEnabled(): boolean {
    return this.config.workspaceOnboarding.enabled;
  }

  publicState() {
    return {
      guidedWorkspaceBuilderEnabled: this.isEnabled(),
    };
  }
}
```

Create `guards/guided-workspace-builder-enabled.guard.ts`:

```ts
import type { CanActivate } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceOnboardingFeatureService } from '../workspace-onboarding-feature.service';

@Injectable()
export class GuidedWorkspaceBuilderEnabledGuard implements CanActivate {
  constructor(private readonly feature: WorkspaceOnboardingFeatureService) {}

  canActivate(): true {
    if (!this.feature.isEnabled()) {
      throw new NotFoundException('Resource not found');
    }
    return true;
  }
}
```

Apply the guard at controller level. Return 404 rather than advertising a disabled internal feature.

## 13.2 Public feature-state endpoint

Create `workspace-onboarding-public.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WorkspaceOnboardingFeatureService } from './workspace-onboarding-feature.service';

@Controller('features')
export class WorkspaceOnboardingPublicController {
  constructor(private readonly feature: WorkspaceOnboardingFeatureService) {}

  @Public()
  @Get('guided-workspace-builder')
  state() {
    return this.feature.publicState();
  }
}
```

The endpoint exposes only a boolean—never provider, model, endpoint, API key status, rollout cohort, or internal failure state.

## 13.3 Observability port

Create `observability/workspace-onboarding-observability.port.ts`:

```ts
export const WORKSPACE_ONBOARDING_OBSERVABILITY = Symbol('WORKSPACE_ONBOARDING_OBSERVABILITY');

export type GuidedBuilderEvent =
  | 'guided_builder_started'
  | 'guided_builder_question_answered'
  | 'guided_builder_step_back'
  | 'guided_builder_abandoned'
  | 'guided_builder_resumed'
  | 'guided_builder_blueprint_generated'
  | 'guided_builder_blueprint_edited'
  | 'guided_builder_validation_failed'
  | 'guided_builder_creation_started'
  | 'guided_builder_creation_succeeded'
  | 'guided_builder_creation_failed';

export interface GuidedBuilderEventMetadata {
  sessionId: string;
  userId?: string;
  requestId?: string;
  ruleSetVersion?: string;
  generatorProvider?: 'rules' | 'ai';
  applicationTypeCount?: number;
  validationIssueCode?: string;
  durationMs?: number;
  idempotentRetry?: boolean;
}

export interface WorkspaceOnboardingObservabilityPort {
  event(name: GuidedBuilderEvent, metadata: GuidedBuilderEventMetadata): Promise<void>;
  increment(metric: string, labels?: Record<string, string>): void;
  observe(metric: string, value: number, labels?: Record<string, string>): void;
}
```

## 13.4 Safe telemetry service

Create `workspace-onboarding-telemetry.service.ts`:

```ts
import type { GuidedBuilderEvent, GuidedBuilderEventMetadata, WorkspaceOnboardingObservabilityPort } from './workspace-onboarding-observability.port';
import { Inject, Injectable } from '@nestjs/common';
import { WORKSPACE_ONBOARDING_OBSERVABILITY } from './workspace-onboarding-observability.port';

const allowedMetadataKeys = new Set<keyof GuidedBuilderEventMetadata>([
  'sessionId',
  'userId',
  'requestId',
  'ruleSetVersion',
  'generatorProvider',
  'applicationTypeCount',
  'validationIssueCode',
  'durationMs',
  'idempotentRetry',
]);

@Injectable()
export class WorkspaceOnboardingTelemetryService {
  constructor(
    @Inject(WORKSPACE_ONBOARDING_OBSERVABILITY)
    private readonly observability: WorkspaceOnboardingObservabilityPort,
  ) {}

  async event(name: GuidedBuilderEvent, metadata: GuidedBuilderEventMetadata) {
    const sanitized = Object.fromEntries(Object.entries(metadata).filter(([key]) => allowedMetadataKeys.has(key as keyof GuidedBuilderEventMetadata))) as unknown as GuidedBuilderEventMetadata;

    await this.observability.event(name, sanitized);
  }

  generation(durationMs: number, provider: 'rules' | 'ai', succeeded: boolean) {
    const labels = { provider, result: succeeded ? 'success' : 'failure' };
    this.observability.observe('guided_builder_generation_duration_ms', durationMs, labels);
    this.observability.increment('guided_builder_generation_total', labels);
  }
}
```

The production port adapter should reuse the platform's existing analytics/metrics infrastructure. The adapter must reject unknown metadata keys again at its boundary.

## 13.5 Frontend feature gating

Fetch public feature state on the workspace creation server page and render the guided card only when enabled:

```tsx
const feature = await api.features.guidedWorkspaceBuilder();

return (
  <div className='grid gap-4 md:grid-cols-3'>
    <ManualWorkspaceEntry />
    <GitHubWorkspaceEntry />
    <GuidedBuilderEntry enabled={feature.guidedWorkspaceBuilderEnabled} />
  </div>
);
```

The backend guard remains mandatory because hiding a card is not authorization.

## 13.6 Phase 13 tests

```ts
it('hides the entry and returns 404 when disabled', async () => {
  runtimeConfig.workspaceOnboarding.enabled = false;

  const feature = await requestPublicFeatureState();
  expect(feature.json()).toEqual({ guidedWorkspaceBuilderEnabled: false });

  const response = await createOnboardingSession(ownerToken);
  expect(response.statusCode).toBe(404);
});

it('emits only non-sensitive metadata', async () => {
  await telemetry.event('guided_builder_blueprint_generated', {
    sessionId: 'session-1',
    userId: 'user-1',
    generatorProvider: 'rules',
    ruleSetVersion: '1.0.0',
  });

  expect(observability.event).toHaveBeenCalledWith(
    'guided_builder_blueprint_generated',
    expect.not.objectContaining({
      answers: expect.anything(),
      blueprint: expect.anything(),
      productIdea: expect.anything(),
      token: expect.anything(),
    }),
  );
});

it('does not expose provider configuration through public feature state', async () => {
  const response = await requestPublicFeatureState();
  expect(JSON.stringify(response.json())).not.toMatch(/provider|model|endpoint|key/i);
});
```

---

# Phase 14 — Optional real-AI provider

## 14.1 AI-specific configuration

These variables are required only when `WORKSPACE_GENERATOR_PROVIDER=ai`:

```env
WORKSPACE_AI_BASE_URL=https://approved-provider.example/v1
WORKSPACE_AI_MODEL=approved-structured-model
WORKSPACE_AI_API_KEY=
WORKSPACE_AI_ALLOWED_HOSTS=approved-provider.example
```

Startup validation must fail when AI is selected but the endpoint, model, key, or allowlist is missing. Never log the API key or URL query parameters.

```ts
export interface WorkspaceAiRuntimeConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  allowedHosts: string[];
}

export function validateWorkspaceAiConfig(value: WorkspaceAiRuntimeConfig): void {
  const url = new URL(value.baseUrl);

  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error('Workspace AI endpoint must use HTTPS');
  }

  if (!value.allowedHosts.includes(url.hostname)) {
    throw new Error('Workspace AI endpoint host is not allowlisted');
  }

  if (!value.model.trim() || !value.apiKey.trim()) {
    throw new Error('Workspace AI model and API key are required');
  }
}
```

## 14.2 Circuit breaker

Create `workspace-ai-circuit-breaker.service.ts`:

```ts
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class WorkspaceAiCircuitBreakerService {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(private readonly config: TypedConfigService) {}

  assertAvailable(now = Date.now()): void {
    if (this.openedAt === null) return;

    if (now - this.openedAt >= this.config.workspaceOnboarding.aiCircuitResetMs) {
      this.failures = 0;
      this.openedAt = null;
      return;
    }

    throw new ServiceUnavailableException('Workspace AI provider circuit is open');
  }

  success(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  failure(now = Date.now()): void {
    this.failures += 1;

    if (this.failures >= this.config.workspaceOnboarding.aiCircuitFailureThreshold) {
      this.openedAt = now;
    }
  }
}
```

In multi-instance production, replace in-memory breaker state with the existing Redis service. Keep this implementation for local development and deterministic unit tests.

## 14.3 Provider client

Create `ai-blueprint-provider.client.ts` using standard `fetch` so no unstable provider SDK is required:

```ts
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { WorkspaceAiCircuitBreakerService } from './workspace-ai-circuit-breaker.service';

interface ProviderResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class AiBlueprintProviderClient {
  constructor(
    private readonly config: TypedConfigService,
    private readonly circuit: WorkspaceAiCircuitBreakerService,
  ) {}

  async generate(messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<unknown> {
    this.circuit.assertAvailable();
    const ai = this.config.workspaceAi;
    const attempts = this.config.workspaceOnboarding.aiMaxRetries + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.workspaceOnboarding.aiRequestTimeoutMs);

      try {
        const response = await fetch(`${ai.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${ai.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: ai.model,
            temperature: 0,
            response_format: { type: 'json_object' },
            messages,
          }),
        });

        if (!response.ok) {
          throw new Error(`Provider returned ${response.status}`);
        }

        const payload = (await response.json()) as ProviderResponse;
        const content = payload.choices?.[0]?.message?.content;

        if (!content) throw new Error('Provider returned no structured content');

        const parsed = JSON.parse(content) as unknown;
        this.circuit.success();
        return parsed;
      } catch (error) {
        lastError = error;
        this.circuit.failure();

        if (attempt + 1 < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ServiceUnavailableException(lastError instanceof Error ? lastError.message : 'AI provider failed');
  }
}
```

Do not include full provider response bodies in thrown errors or logs because they can contain user content.

## 14.4 AI generator

Create `ai-workspace-blueprint.generator.ts`:

```ts
import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema } from '@command-center/validation';
import { Injectable } from '@nestjs/common';
import type { WorkspaceBlueprintGenerator } from '../generators/workspace-blueprint-generator.interface';
import { TechnologyCompatibilityService } from '../rules/technology-compatibility.service';
import { AiBlueprintProviderClient } from './ai-blueprint-provider.client';

const systemInstruction = `
You generate a SaaS Command Center workspace blueprint.
Return one JSON object only. Do not include markdown or commentary.
Use only enum values present in the supplied catalog.
Never include credentials, tokens, secrets, executable commands, HTML, or hidden reasoning.
Every recommendation must contain a short explanation and a stable ruleId beginning with ai-.
The output must use schemaVersion 1 and generator.provider "ai".
`;

@Injectable()
export class AiWorkspaceBlueprintGenerator implements WorkspaceBlueprintGenerator {
  constructor(
    private readonly client: AiBlueprintProviderClient,
    private readonly compatibility: TechnologyCompatibilityService,
    private readonly config: TypedConfigService,
  ) {}

  async generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint> {
    const answers = completeWorkspaceOnboardingAnswersSchema.parse(input);
    const raw = await this.client.generate([
      { role: 'system', content: systemInstruction },
      {
        role: 'user',
        content: JSON.stringify({
          answers,
          supported: {
            applicationTypes: ['WEB', 'MOBILE', 'DESKTOP'],
            platforms: ['WEB', 'ANDROID', 'IOS', 'WINDOWS', 'MACOS', 'LINUX'],
            technologies: ['NEXT_JS', 'TYPESCRIPT', 'KOTLIN', 'JETPACK_COMPOSE', 'SWIFT', 'SWIFTUI', 'REACT_NATIVE', 'FLUTTER', 'TAURI', 'ELECTRON', 'NEST_JS', 'POSTGRESQL', 'REDIS'],
          },
        }),
      },
    ]);

    const candidate = workspaceBlueprintSchema.parse({
      ...(raw as Record<string, unknown>),
      schemaVersion: 1,
      generator: {
        provider: 'ai',
        version: this.config.workspaceAi.model,
      },
    });

    for (const application of candidate.applications) {
      this.compatibility.assertApplication(application.type, application.platforms, application.stack);
    }

    return candidate;
  }
}
```

Update the shared provider type and Zod schema from literal `rules` to:

```ts
export type WorkspaceGeneratorProvider = 'rules' | 'ai';

provider: z.enum(['rules', 'ai']),
```

Provider/model metadata is allowed. Hidden reasoning, chain-of-thought, raw prompt logs, and raw response logs are not.

## 14.5 Generator orchestrator with fallback

Create `generator-orchestrator.service.ts`:

```ts
import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { Injectable, Logger } from '@nestjs/common';
import type { WorkspaceBlueprintGenerator } from '../generators/workspace-blueprint-generator.interface';
import { RuleBasedWorkspaceBlueprintGenerator } from '../generators/rule-based-workspace-blueprint.generator';
import { WorkspaceOnboardingTelemetryService } from '../observability/workspace-onboarding-telemetry.service';
import { AiWorkspaceBlueprintGenerator } from './ai-workspace-blueprint.generator';

@Injectable()
export class GeneratorOrchestratorService implements WorkspaceBlueprintGenerator {
  private readonly logger = new Logger(GeneratorOrchestratorService.name);

  constructor(
    private readonly config: TypedConfigService,
    private readonly rules: RuleBasedWorkspaceBlueprintGenerator,
    private readonly ai: AiWorkspaceBlueprintGenerator,
    private readonly telemetry: WorkspaceOnboardingTelemetryService,
  ) {}

  async generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint> {
    const provider = this.config.workspaceOnboarding.generatorProvider;
    const startedAt = performance.now();

    if (provider === 'rules') {
      const result = await this.rules.generate(input);
      this.telemetry.generation(performance.now() - startedAt, 'rules', true);
      return result;
    }

    try {
      const result = await this.ai.generate(input);
      this.telemetry.generation(performance.now() - startedAt, 'ai', true);
      return result;
    } catch (error) {
      this.telemetry.generation(performance.now() - startedAt, 'ai', false);

      if (!this.config.workspaceOnboarding.aiFallbackEnabled) throw error;

      this.logger.warn('Workspace AI generation failed; using deterministic fallback');
      return this.rules.generate(input);
    }
  }
}
```

Bind `WORKSPACE_BLUEPRINT_GENERATOR` to `GeneratorOrchestratorService` instead of directly to the rule generator.

## 14.6 Frontend generator badge

Create `generator-badge.tsx`:

```tsx
import type { WorkspaceGeneratorProvider } from '@command-center/shared-types';

export function GeneratorBadge({ provider }: { provider: WorkspaceGeneratorProvider }) {
  const ai = provider === 'ai';

  return <span className='inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800'>{ai ? 'AI-assisted recommendations' : 'Guided recommendations'}</span>;
}
```

The review and confirmation requirements remain identical for both providers.

## 14.7 Deterministic fake provider for tests

```ts
export class FakeAiBlueprintProviderClient {
  response: unknown = validAiBlueprintFixture();
  error: Error | null = null;
  delayMs = 0;
  calls: unknown[] = [];

  async generate(messages: unknown[]): Promise<unknown> {
    this.calls.push(messages);
    if (this.delayMs) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (this.error) throw this.error;
    return structuredClone(this.response);
  }
}
```

Override the provider client in unit/E2E test modules. Never use a real network endpoint in CI.

## 14.8 AI tests

```ts
describe('AiWorkspaceBlueprintGenerator', () => {
  it('accepts schema-valid compatible output', async () => {
    fake.response = validAiBlueprintFixture();
    const blueprint = await generator.generate(completeAnswers);
    expect(blueprint.generator.provider).toBe('ai');
  });

  it('rejects malformed provider output', async () => {
    fake.response = { applications: 'not-an-array' };
    await expect(generator.generate(completeAnswers)).rejects.toThrow();
  });

  it('rejects incompatible technology output', async () => {
    fake.response = validAiBlueprintFixture({
      applications: [
        {
          type: 'MOBILE',
          name: 'Bad Mobile',
          platforms: ['ANDROID'],
          stack: ['SWIFT', 'SWIFTUI'],
          source: 'RULE',
        },
      ],
    });
    await expect(generator.generate(completeAnswers)).rejects.toThrow('not compatible');
  });
});

describe('GeneratorOrchestratorService', () => {
  it('falls back to rules after provider failure', async () => {
    ai.generate.mockRejectedValue(new Error('provider unavailable'));
    const result = await orchestrator.generate(completeAnswers);
    expect(result.generator.provider).toBe('rules');
  });

  it('does not fall back when fallback is disabled', async () => {
    runtimeConfig.workspaceOnboarding.aiFallbackEnabled = false;
    ai.generate.mockRejectedValue(new Error('provider unavailable'));
    await expect(orchestrator.generate(completeAnswers)).rejects.toThrow();
  });
});

describe('WorkspaceAiCircuitBreakerService', () => {
  it('opens after the configured failure threshold and resets later', () => {
    circuit.failure(1_000);
    circuit.failure(1_001);
    circuit.failure(1_002);
    expect(() => circuit.assertAvailable(1_003)).toThrow('circuit is open');
    expect(() => circuit.assertAvailable(61_003)).not.toThrow();
  });
});

it('never sends a paid-provider request from the E2E suite', async () => {
  await completeAiAssistedFlow();
  expect(fakeAiProvider.calls).toHaveLength(1);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
```

---

# Module wiring

The final module contains the established Phase 1–10 providers plus:

```ts
@Module({
  controllers: [WorkspaceOnboardingController, WorkspaceOnboardingPublicController],
  providers: [
    WorkspaceOnboardingFeatureService,
    GuidedWorkspaceBuilderEnabledGuard,
    WorkspaceOnboardingPayloadService,
    WorkspaceOnboardingCleanupService,
    WorkspaceOnboardingTelemetryService,
    WorkspaceAiCircuitBreakerService,
    AiBlueprintProviderClient,
    AiWorkspaceBlueprintGenerator,
    GeneratorOrchestratorService,
    {
      provide: WORKSPACE_BLUEPRINT_GENERATOR,
      useExisting: GeneratorOrchestratorService,
    },
    {
      provide: WORKSPACE_ONBOARDING_OBSERVABILITY,
      useExisting: ExistingObservabilityAdapter,
    },
    // Existing Phase 6–10 port adapters remain here.
  ],
})
export class WorkspaceOnboardingModule {}
```

`ExistingObservabilityAdapter`, typed config imports, rate-limit decorator arguments, advisory-lock wrapper, and background scheduler entry must be mapped to existing repository symbols. Do not install duplicate infrastructure packages.

# Final verification sequence

```powershell
$ErrorActionPreference = 'Stop'

pnpm build:packages

pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate

pnpm --filter @command-center/api typecheck
pnpm --filter @command-center/api-tests typecheck
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web-tests typecheck

pnpm --filter @command-center/api-tests test:unit -- `
  workspace-onboarding `
  workspace-ai `
  guided-workspace

$env:E2E_WORKERS = '3'
pnpm --filter @command-center/api-tests test:e2e -- `
  workspace-onboarding `
  workspace `
  github-workspace-import
Remove-Item Env:E2E_WORKERS -ErrorAction SilentlyContinue

pnpm --filter @command-center/web-tests test:unit -- `
  unit/features/workspace-onboarding

pnpm --filter @command-center/web-tests test:fullstack -- `
  e2e/full-stack/fullstack-workspace-onboarding.spec.ts

pnpm lint
pnpm typecheck
pnpm build
pnpm test
git diff --check
```

Do not use `exit $LASTEXITCODE` in the VS Code terminal because it closes the terminal. Inspect and fix the first failing gate before continuing.

# Production-readiness gate

The Guided Workspace Builder is production-ready only when all of these are proven:

- Manual and GitHub workspace creation remain unchanged and green.
- Feature-disabled API routes return 404 and the frontend entry is absent.
- Every onboarding operation enforces authenticated ownership.
- Oversized, malformed, duplicate, incompatible, and sensitive-key payloads are rejected.
- Creation, generation, and answer endpoints enforce independent Redis-backed limits.
- Expiration and retention cleanup are idempotent and distributed-lock protected.
- Audit/analytics payloads exclude answer text, blueprint content, repository names, and secrets.
- Keyboard navigation, labels, focus transitions, error announcements, and mobile layout pass.
- All 15 Phase 12 full-stack scenarios pass independently.
- Blueprint revision/hash checks, transaction rollback, concurrency, and idempotency remain green.
- GitHub connection failure never creates a false active state.
- Engineering systems remain proposed until verified.
- AI configuration fails closed when incomplete or not allowlisted.
- AI output is schema-validated and compatibility-validated.
- AI timeout, malformed output, provider failure, circuit breaker, and rule fallback tests pass.
- CI uses a deterministic fake and makes no live AI request.
- Prisma clean replay, lint, typecheck, production build, unit, API E2E, web unit, tracker, and Playwright full-stack tests all pass.

# Completion boundary

These phases provide the complete implementation design and code for the Guided Workspace Builder. Repository-specific infrastructure adapters must still use the exact symbols established during Phase 1. No document alone can guarantee compilation against unseen application services; the final proof is the verification sequence above running against the actual monorepo.
