# Guided Workspace Builder — Phases 6–10 Code Pack

## Scope

This code pack continues the Phase 1–5 implementation and covers:

- Phase 6: application and technology rules
- Phase 7: blueprint review, editing, validation, revision control, and responsive UI
- Phase 8: transactional workspace creation, locking, rollback, and idempotency
- Phase 9: optional GitHub repository mapping without storing tokens in onboarding JSON
- Phase 10: honest engineering-system defaults represented as proposed configuration

It assumes the Phase 1–5 contracts, session model, question flow, rule engine, generator token, API client, and Fastify test harness already exist and pass.

Repository-specific workspace/application/GitHub calls are isolated behind ports. The port implementations must use the exact services and fields recorded during Phase 1. This prevents guessed Prisma fields from corrupting the existing domain.

## File map

```text
packages/shared-types/src/workspace-onboarding/
  workspace-onboarding.types.ts                    # extend

packages/validation/src/workspace-onboarding/
  workspace-onboarding.schemas.ts                  # extend

apps/api/src/modules/workspace-onboarding/
  dto/
    update-workspace-blueprint.dto.ts
    confirm-workspace-blueprint.dto.ts
  generators/
    rule-based-workspace-blueprint.generator.ts    # extend
  ports/
    workspace-creation.port.ts
    repository-connection.port.ts
  rules/
    application-technology.rules.ts
    engineering-system.rules.ts
    technology-compatibility.service.ts
  workspace-blueprint.service.ts
  workspace-onboarding-creation.service.ts
  workspace-onboarding.controller.ts               # extend
  workspace-onboarding.module.ts                   # extend

apps/web/src/features/workspace-onboarding/
  api/workspace-onboarding-api.ts                  # extend
  components/
    blueprint-review.tsx
    blueprint-application-editor.tsx
    blueprint-validation-summary.tsx
    workspace-creation-progress.tsx

packages/test-code/api/unit/workspace-onboarding/
packages/test-code/api/e2e/workspace-onboarding-blueprint.e2e-spec.ts
packages/test-code/api/e2e/workspace-onboarding-confirm.e2e-spec.ts
packages/test-code/web/unit/features/workspace-onboarding/
packages/test-code/web/e2e/full-stack/fullstack-workspace-onboarding.spec.ts
```

---

# Phase 6 — Application and technology rules

## 6.1 Extend shared contracts

Add these types to `workspace-onboarding.types.ts`:

```ts
export type BlueprintValueSource = 'USER' | 'RULE';

export interface WorkspaceBlueprintRepository {
  applicationType: WorkspaceApplicationType;
  strategy: RepositoryStrategy;
  repositoryId?: string;
  placeholderName?: string;
}

export type EngineeringConfigurationState =
  | 'PROPOSED'
  | 'ACTIVE'
  | 'UNAVAILABLE';

export interface WorkspaceBlueprintEngineeringConfiguration {
  system: EngineeringSystem;
  state: EngineeringConfigurationState;
  enabledByDefault: boolean;
  explanation: string;
}

export interface WorkspaceBlueprintValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface WorkspaceBlueprintValidationResult {
  valid: boolean;
  revision: number;
  hash: string;
  issues: WorkspaceBlueprintValidationIssue[];
}

export interface UpdateWorkspaceBlueprintInput {
  expectedRevision: number;
  blueprint: WorkspaceBlueprint;
}

export interface ConfirmWorkspaceBlueprintInput {
  expectedRevision: number;
  blueprintHash: string;
  idempotencyKey: string;
}

export interface WorkspaceCreationResult {
  sessionId: string;
  workspaceId: string;
  status: 'COMPLETED';
  createdAt: string;
}
```

Extend `WorkspaceBlueprintApplication`:

```ts
export interface WorkspaceBlueprintApplication {
  type: WorkspaceApplicationType;
  name: string;
  platforms: WorkspacePlatform[];
  stack: WorkspaceTechnology[];
  source: BlueprintValueSource;
}
```

Extend `WorkspaceBlueprint`:

```ts
export interface WorkspaceBlueprint {
  // Existing Phase 2 fields remain unchanged.
  repositories: WorkspaceBlueprintRepository[];
  engineeringConfigurations: WorkspaceBlueprintEngineeringConfiguration[];
}
```

Extend `WorkspaceOnboardingSessionResponse`:

```ts
blueprintRevision: number;
blueprintHash: string | null;
```

## 6.2 Extend validation

Add to `workspace-onboarding.schemas.ts` and include both fields in `workspaceBlueprintSchema`:

```ts
const repositoryBlueprintSchema = z
  .object({
    applicationType: z.enum(workspaceApplicationTypes),
    strategy: z.enum(['NONE', 'CONNECT_LATER', 'CONNECT_NOW']),
    repositoryId: z.string().cuid().optional(),
    placeholderName: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((repository, context) => {
    if (repository.strategy === 'CONNECT_NOW' && !repository.repositoryId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repositoryId'],
        message: 'CONNECT_NOW requires a verified repository ID',
      });
    }

    if (
      repository.strategy === 'CONNECT_LATER' &&
      !repository.placeholderName
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['placeholderName'],
        message: 'CONNECT_LATER requires a placeholder name',
      });
    }
  });

const engineeringConfigurationSchema = z
  .object({
    system: z.enum(engineeringSystems),
    state: z.enum(['PROPOSED', 'ACTIVE', 'UNAVAILABLE']),
    enabledByDefault: z.boolean(),
    explanation: z.string().trim().min(1).max(500),
  })
  .strict()
  .superRefine((configuration, context) => {
    if (configuration.state !== 'ACTIVE' && configuration.enabledByDefault) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['enabledByDefault'],
        message: 'Only verified active configurations may be enabled',
      });
    }
  });

// Add inside workspaceBlueprintSchema:
repositories: uniqueArray(repositoryBlueprintSchema, 3),
engineeringConfigurations: uniqueArray(
  engineeringConfigurationSchema,
  engineeringSystems.length,
).refine(
  (items) => unique(items.map(({ system }) => system)),
  'Only one configuration per engineering system is allowed',
),
```

Also add `source: z.enum(['USER', 'RULE'])` inside the application schema.

## 6.3 Technology compatibility service

Create `technology-compatibility.service.ts`:

```ts
import type {
  WorkspaceApplicationType,
  WorkspacePlatform,
  WorkspaceTechnology,
} from '@command-center/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';

const technologyPlatforms: Record<WorkspaceTechnology, WorkspacePlatform[]> = {
  NEXT_JS: ['WEB'],
  TYPESCRIPT: ['WEB', 'WINDOWS', 'MACOS', 'LINUX'],
  KOTLIN: ['ANDROID'],
  JETPACK_COMPOSE: ['ANDROID'],
  SWIFT: ['IOS'],
  SWIFTUI: ['IOS'],
  REACT_NATIVE: ['ANDROID', 'IOS'],
  FLUTTER: ['ANDROID', 'IOS'],
  TAURI: ['WINDOWS', 'MACOS', 'LINUX'],
  ELECTRON: ['WINDOWS', 'MACOS', 'LINUX'],
  NEST_JS: [],
  POSTGRESQL: [],
  REDIS: [],
};

const applicationPlatforms: Record<WorkspaceApplicationType, WorkspacePlatform[]> = {
  WEB: ['WEB'],
  MOBILE: ['ANDROID', 'IOS'],
  DESKTOP: ['WINDOWS', 'MACOS', 'LINUX'],
};

@Injectable()
export class TechnologyCompatibilityService {
  assertApplication(
    type: WorkspaceApplicationType,
    platforms: WorkspacePlatform[],
    stack: WorkspaceTechnology[],
  ): void {
    const allowedPlatforms = applicationPlatforms[type];

    for (const platform of platforms) {
      if (!allowedPlatforms.includes(platform)) {
        throw new BadRequestException(
          `${platform} is not compatible with ${type}`,
        );
      }
    }

    for (const technology of stack) {
      const supportedPlatforms = technologyPlatforms[technology];

      if (
        supportedPlatforms.length > 0 &&
        !platforms.some((platform) => supportedPlatforms.includes(platform))
      ) {
        throw new BadRequestException(
          `${technology} is not compatible with the selected platforms`,
        );
      }
    }

    this.assertRequiredPairs(stack);
  }

  private assertRequiredPairs(stack: WorkspaceTechnology[]): void {
    const requirements: Partial<Record<WorkspaceTechnology, WorkspaceTechnology>> = {
      JETPACK_COMPOSE: 'KOTLIN',
      SWIFTUI: 'SWIFT',
    };

    for (const technology of stack) {
      const required = requirements[technology];

      if (required && !stack.includes(required)) {
        throw new BadRequestException(`${technology} requires ${required}`);
      }
    }
  }
}
```

## 6.4 Application rules with explicit override support

Create `application-technology.rules.ts`:

```ts
import type {
  WorkspaceBlueprintApplication,
  WorkspacePlatform,
  WorkspaceTechnology,
} from '@command-center/shared-types';
import type { WorkspaceRule } from './rule-engine';

function preferred(
  values: WorkspaceTechnology[] | undefined,
  fallback: WorkspaceTechnology[],
) {
  return values?.length ? [...values] : fallback;
}

function upsert(
  applications: WorkspaceBlueprintApplication[],
  application: WorkspaceBlueprintApplication,
) {
  const index = applications.findIndex(({ type }) => type === application.type);

  if (index === -1) {
    applications.push(application);
  } else {
    applications[index] = application;
  }
}

export const applicationTechnologyRules: readonly WorkspaceRule[] = [
  {
    id: 'web-application-stack',
    version: '2.0.0',
    priority: 110,
    when: ({ answers }) => answers.applicationTypes?.includes('WEB') === true,
    apply: (draft, { answers }) => {
      const preference = answers.technologyPreference?.WEB;
      upsert(draft.applications, {
        type: 'WEB',
        name: `${draft.workspace.name} Web`,
        platforms: ['WEB'],
        stack: preferred(preference, ['NEXT_JS', 'TYPESCRIPT']),
        source: preference?.length ? 'USER' : 'RULE',
      });
    },
    explanation: 'Creates the supported web stack while preserving valid user preferences.',
  },
  {
    id: 'mobile-application-stack',
    version: '2.0.0',
    priority: 210,
    when: ({ answers }) => answers.applicationTypes?.includes('MOBILE') === true,
    apply: (draft, { answers }) => {
      const platforms: WorkspacePlatform[] = answers.mobilePlatforms?.length
        ? [...answers.mobilePlatforms]
        : ['ANDROID', 'IOS'];
      const preference = answers.technologyPreference?.MOBILE;
      const defaults: WorkspaceTechnology[] = [
        ...(platforms.includes('ANDROID')
          ? (['KOTLIN', 'JETPACK_COMPOSE'] as const)
          : []),
        ...(platforms.includes('IOS')
          ? (['SWIFT', 'SWIFTUI'] as const)
          : []),
      ];

      upsert(draft.applications, {
        type: 'MOBILE',
        name: `${draft.workspace.name} Mobile`,
        platforms: [...platforms],
        stack: preferred(preference, defaults),
        source: preference?.length ? 'USER' : 'RULE',
      });
    },
    explanation: 'Builds a native or explicitly selected mobile stack for the requested platforms.',
  },
  {
    id: 'desktop-application-stack',
    version: '2.0.0',
    priority: 310,
    when: ({ answers }) => answers.applicationTypes?.includes('DESKTOP') === true,
    apply: (draft, { answers }) => {
      const preference = answers.technologyPreference?.DESKTOP;
      upsert(draft.applications, {
        type: 'DESKTOP',
        name: `${draft.workspace.name} Desktop`,
        platforms: answers.desktopPlatforms?.length
          ? [...answers.desktopPlatforms]
          : ['WINDOWS'],
        stack: preferred(preference, ['TAURI', 'TYPESCRIPT']),
        source: preference?.length ? 'USER' : 'RULE',
      });
    },
    explanation: 'Creates a supported desktop stack while preserving valid user preferences.',
  },
];
```

In the generator, replace the original Phase 5 application rules with these rules, then validate every generated application through `TechnologyCompatibilityService` before parsing the final blueprint.

## 6.5 Phase 6 tests

```ts
describe('TechnologyCompatibilityService', () => {
  const service = new TechnologyCompatibilityService();

  it('accepts native Android technologies', () => {
    expect(() =>
      service.assertApplication(
        'MOBILE',
        ['ANDROID'],
        ['KOTLIN', 'JETPACK_COMPOSE'],
      ),
    ).not.toThrow();
  });

  it('rejects SwiftUI on Android', () => {
    expect(() =>
      service.assertApplication('MOBILE', ['ANDROID'], ['SWIFT', 'SWIFTUI']),
    ).toThrow('not compatible');
  });

  it('rejects Jetpack Compose without Kotlin', () => {
    expect(() =>
      service.assertApplication('MOBILE', ['ANDROID'], ['JETPACK_COMPOSE']),
    ).toThrow('requires KOTLIN');
  });
});

it('marks explicit technology preferences as USER values', async () => {
  const blueprint = await generator.generate({
    ...completeAnswers,
    applicationTypes: ['MOBILE'],
    mobilePlatforms: ['ANDROID', 'IOS'],
    technologyPreference: {
      MOBILE: ['REACT_NATIVE', 'TYPESCRIPT'],
    },
  });

  expect(blueprint.applications[0]).toMatchObject({
    type: 'MOBILE',
    source: 'USER',
    stack: ['REACT_NATIVE', 'TYPESCRIPT'],
  });
});
```

---

# Phase 7 — Blueprint review and editing

## 7.1 Persistence revision fields

Add to `WorkspaceOnboardingSession` and generate a migration:

```prisma
blueprintRevision Int     @default(0)
blueprintHash     String?
```

## 7.2 Hash utility

Create `workspace-blueprint-hash.ts`:

```ts
import type { WorkspaceBlueprint } from '@command-center/shared-types';
import { createHash } from 'node:crypto';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]),
    );
  }

  return value;
}

export function hashWorkspaceBlueprint(blueprint: WorkspaceBlueprint): string {
  return createHash('sha256')
    .update(JSON.stringify(stable(blueprint)))
    .digest('hex');
}
```

## 7.3 Update DTO

Create `update-workspace-blueprint.dto.ts`:

```ts
import type { UpdateWorkspaceBlueprintInput } from '@command-center/shared-types';
import { workspaceBlueprintSchema } from '@command-center/validation';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const schema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  blueprint: workspaceBlueprintSchema,
}).strict();

export class UpdateWorkspaceBlueprintDto {
  static parse(value: unknown): UpdateWorkspaceBlueprintInput {
    const result = schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid blueprint update',
        errors: result.error.flatten(),
      });
    }

    return result.data;
  }
}
```

## 7.4 Blueprint service

Create `workspace-blueprint.service.ts`:

```ts
import type {
  UpdateWorkspaceBlueprintInput,
  WorkspaceBlueprint,
  WorkspaceBlueprintValidationIssue,
  WorkspaceBlueprintValidationResult,
} from '@command-center/shared-types';
import { workspaceBlueprintSchema } from '@command-center/validation';
import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TechnologyCompatibilityService } from './rules/technology-compatibility.service';
import { hashWorkspaceBlueprint } from './workspace-blueprint-hash';
import { WorkspaceOnboardingRepository } from './workspace-onboarding.repository';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

@Injectable()
export class WorkspaceBlueprintService {
  constructor(
    private readonly sessions: WorkspaceOnboardingService,
    private readonly repository: WorkspaceOnboardingRepository,
    private readonly compatibility: TechnologyCompatibilityService,
  ) {}

  validateBlueprint(
    blueprint: unknown,
    revision: number,
  ): WorkspaceBlueprintValidationResult {
    const parsed = workspaceBlueprintSchema.safeParse(blueprint);
    const issues: WorkspaceBlueprintValidationIssue[] = [];

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        });
      }

      return { valid: false, revision, hash: '', issues };
    }

    for (const application of parsed.data.applications) {
      try {
        this.compatibility.assertApplication(
          application.type,
          application.platforms,
          application.stack,
        );
      } catch (error) {
        issues.push({
          path: `applications.${application.type}`,
          code: 'INCOMPATIBLE_STACK',
          message: error instanceof Error ? error.message : 'Invalid stack',
        });
      }
    }

    return {
      valid: issues.length === 0,
      revision,
      hash: issues.length === 0 ? hashWorkspaceBlueprint(parsed.data) : '',
      issues,
    };
  }

  async validateOwned(id: string, userId: string) {
    const session = await this.sessions.getOwned(id, userId);
    return this.validateBlueprint(session.blueprint, session.blueprintRevision);
  }

  async updateOwned(
    id: string,
    userId: string,
    input: UpdateWorkspaceBlueprintInput,
  ) {
    const session = await this.sessions.getOwned(id, userId);

    if (session.status !== 'BLUEPRINT_READY') {
      throw new ConflictException('Blueprint is not editable in this state');
    }

    if (session.blueprintRevision !== input.expectedRevision) {
      throw new ConflictException('Blueprint revision is stale');
    }

    const validation = this.validateBlueprint(
      input.blueprint,
      session.blueprintRevision + 1,
    );

    if (!validation.valid) {
      throw new UnprocessableEntityException({
        message: 'Blueprint validation failed',
        issues: validation.issues,
      });
    }

    return this.repository.updateBlueprintRevision({
      id,
      expectedRevision: input.expectedRevision,
      blueprint: workspaceBlueprintSchema.parse(input.blueprint),
      blueprintHash: validation.hash,
    });
  }
}
```

Add this atomic repository method:

```ts
async updateBlueprintRevision(input: {
  id: string;
  expectedRevision: number;
  blueprint: Prisma.InputJsonValue;
  blueprintHash: string;
}) {
  const result = await this.prisma.workspaceOnboardingSession.updateMany({
    where: {
      id: input.id,
      blueprintRevision: input.expectedRevision,
      status: 'BLUEPRINT_READY',
    },
    data: {
      blueprint: input.blueprint,
      blueprintHash: input.blueprintHash,
      blueprintRevision: { increment: 1 },
    },
  });

  if (result.count !== 1) {
    throw new ConflictException('Blueprint changed during update');
  }

  return this.prisma.workspaceOnboardingSession.findUniqueOrThrow({
    where: { id: input.id },
  });
}
```

When generating a new blueprint, calculate its hash, increment the revision, and persist both atomically.

## 7.5 Controller endpoints

```ts
@Patch(':id/blueprint')
updateBlueprint(
  @Param('id') id: string,
  @Body() body: unknown,
  @Req() request: AuthenticatedRequest,
) {
  return this.blueprints.updateOwned(
    id,
    request.user.id,
    UpdateWorkspaceBlueprintDto.parse(body),
  );
}

@Post(':id/validate')
validateBlueprint(
  @Param('id') id: string,
  @Req() request: AuthenticatedRequest,
) {
  return this.blueprints.validateOwned(id, request.user.id);
}
```

## 7.6 Frontend API additions

```ts
updateBlueprint: (
  id: string,
  input: UpdateWorkspaceBlueprintInput,
) => request<WorkspaceOnboardingSessionResponse>(
  `/workspace-onboarding/sessions/${id}/blueprint`,
  { method: 'PATCH', body: JSON.stringify(input) },
),

validateBlueprint: (id: string) =>
  request<WorkspaceBlueprintValidationResult>(
    `/workspace-onboarding/sessions/${id}/validate`,
    { method: 'POST' },
  ),
```

## 7.7 Blueprint application editor

Create `blueprint-application-editor.tsx`:

```tsx
'use client';

import type {
  WorkspaceBlueprintApplication,
  WorkspaceTechnology,
} from '@command-center/shared-types';

const choices: Record<WorkspaceBlueprintApplication['type'], WorkspaceTechnology[]> = {
  WEB: ['NEXT_JS', 'TYPESCRIPT'],
  MOBILE: [
    'KOTLIN',
    'JETPACK_COMPOSE',
    'SWIFT',
    'SWIFTUI',
    'REACT_NATIVE',
    'FLUTTER',
    'TYPESCRIPT',
  ],
  DESKTOP: ['TAURI', 'ELECTRON', 'TYPESCRIPT'],
};

export function BlueprintApplicationEditor({
  application,
  disabled,
  onChange,
}: {
  application: WorkspaceBlueprintApplication;
  disabled: boolean;
  onChange(application: WorkspaceBlueprintApplication): void;
}) {
  const toggle = (technology: WorkspaceTechnology) => {
    const stack = application.stack.includes(technology)
      ? application.stack.filter((value) => value !== technology)
      : [...application.stack, technology];

    onChange({ ...application, stack, source: 'USER' });
  };

  return (
    <fieldset className="rounded-2xl border border-slate-200 p-5" disabled={disabled}>
      <legend className="px-2 text-base font-semibold">{application.name}</legend>
      <p className="text-sm text-slate-600">
        Platforms: {application.platforms.join(', ')}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {choices[application.type].map((technology) => (
          <button
            aria-pressed={application.stack.includes(technology)}
            className="rounded-full border px-3 py-2 text-sm aria-pressed:bg-slate-950 aria-pressed:text-white"
            key={technology}
            onClick={() => toggle(technology)}
            type="button"
          >
            {technology.replaceAll('_', ' ')}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
```

Create `blueprint-validation-summary.tsx`:

```tsx
import type { WorkspaceBlueprintValidationIssue } from '@command-center/shared-types';

export function BlueprintValidationSummary({
  issues,
}: {
  issues: WorkspaceBlueprintValidationIssue[];
}) {
  if (issues.length === 0) return null;

  return (
    <section aria-labelledby="validation-title" className="rounded-xl bg-red-50 p-4">
      <h2 id="validation-title" className="font-semibold text-red-900">
        Resolve these blueprint issues
      </h2>
      <ul className="mt-2 list-disc pl-5 text-sm text-red-800">
        {issues.map((issue) => (
          <li key={`${issue.path}:${issue.code}`}>
            {issue.path}: {issue.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Create `blueprint-review.tsx`:

```tsx
'use client';

import type {
  WorkspaceBlueprint,
  WorkspaceBlueprintValidationIssue,
  WorkspaceOnboardingSessionResponse,
} from '@command-center/shared-types';
import { useState } from 'react';
import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import { BlueprintApplicationEditor } from './blueprint-application-editor';
import { BlueprintValidationSummary } from './blueprint-validation-summary';

export function BlueprintReview({
  initialSession,
  onReady,
}: {
  initialSession: WorkspaceOnboardingSessionResponse;
  onReady(session: WorkspaceOnboardingSessionResponse): void;
}) {
  const [blueprint, setBlueprint] = useState<WorkspaceBlueprint>(
    initialSession.blueprint!,
  );
  const [issues, setIssues] = useState<WorkspaceBlueprintValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);

    try {
      const session = await workspaceOnboardingApi.updateBlueprint(
        initialSession.id,
        {
          expectedRevision: initialSession.blueprintRevision,
          blueprint,
        },
      );
      const validation = await workspaceOnboardingApi.validateBlueprint(
        initialSession.id,
      );
      setIssues(validation.issues);

      if (validation.valid) onReady(session);
    } catch (error) {
      setIssues([
        {
          path: 'blueprint',
          code: 'SAVE_FAILED',
          message: error instanceof Error ? error.message : 'Save failed',
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-4 lg:grid-cols-[1fr_18rem] lg:p-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Review guided recommendations</h1>
        <BlueprintValidationSummary issues={issues} />
        {blueprint.applications.map((application, index) => (
          <BlueprintApplicationEditor
            application={application}
            disabled={saving}
            key={application.type}
            onChange={(next) => {
              const applications = [...blueprint.applications];
              applications[index] = next;
              setBlueprint({ ...blueprint, applications });
            }}
          />
        ))}
      </section>

      <aside className="h-fit rounded-2xl border p-5 lg:sticky lg:top-6">
        <p className="text-sm text-slate-600">Revision {initialSession.blueprintRevision}</p>
        <button
          className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-white disabled:opacity-50"
          disabled={saving}
          onClick={save}
          type="button"
        >
          {saving ? 'Validating…' : 'Save and continue'}
        </button>
      </aside>
    </main>
  );
}
```

## 7.8 Phase 7 tests

Required API cases:

```ts
it('rejects stale blueprint revisions', async () => {
  const first = await updateBlueprint(session.id, ownerToken, {
    expectedRevision: 1,
    blueprint,
  });
  expect(first.statusCode).toBe(200);

  const stale = await updateBlueprint(session.id, ownerToken, {
    expectedRevision: 1,
    blueprint,
  });
  expect(stale.statusCode).toBe(409);
});

it('returns field-level compatibility errors', async () => {
  const invalid = structuredClone(blueprint);
  invalid.applications[0].platforms = ['ANDROID'];

  const response = await updateBlueprint(session.id, ownerToken, {
    expectedRevision: 1,
    blueprint: invalid,
  });

  expect(response.statusCode).toBe(422);
  expect(response.json().issues[0].path).toContain('applications');
});
```

Required component cases:

```tsx
it('marks edited stack values as user selections', async () => {
  const onChange = vi.fn();
  render(
    <BlueprintApplicationEditor
      application={{
        type: 'DESKTOP',
        name: 'TodoFlow Desktop',
        platforms: ['WINDOWS'],
        stack: ['TAURI', 'TYPESCRIPT'],
        source: 'RULE',
      }}
      disabled={false}
      onChange={onChange}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'ELECTRON' }));
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ source: 'USER' }),
  );
});
```

---

# Phase 8 — Transactional workspace creation

## 8.1 Domain creation port

Create `workspace-creation.port.ts`. The interface is stable; only its adapter depends on Phase 1 mappings.

```ts
import type { WorkspaceBlueprint } from '@command-center/shared-types';
import type { Prisma } from '@prisma/client';

export const WORKSPACE_CREATION_PORT = Symbol('WORKSPACE_CREATION_PORT');

export interface WorkspaceCreationPort {
  createFromBlueprint(input: {
    transaction: Prisma.TransactionClient;
    ownerUserId: string;
    blueprint: WorkspaceBlueprint;
  }): Promise<{ workspaceId: string }>;
}
```

The production adapter must perform, using existing Phase 1 services or delegates:

1. Workspace create with server-generated ownership.
2. Owner membership create unless the workspace service already does it.
3. One web/mobile/desktop record per blueprint application.
4. Technology mappings using existing catalog IDs—not new free-text technologies.
5. Environment and feature records supported by the current schema.
6. No repository API calls inside the transaction.

Never create duplicate membership records and never accept owner IDs from the client.

## 8.2 Confirm DTO

Create `confirm-workspace-blueprint.dto.ts`:

```ts
import type { ConfirmWorkspaceBlueprintInput } from '@command-center/shared-types';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const schema = z.object({
  expectedRevision: z.number().int().positive(),
  blueprintHash: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().uuid(),
}).strict();

export class ConfirmWorkspaceBlueprintDto {
  static parse(value: unknown): ConfirmWorkspaceBlueprintInput {
    const result = schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid confirmation request',
        errors: result.error.flatten(),
      });
    }

    return result.data;
  }
}
```

## 8.3 Creation service

Create `workspace-onboarding-creation.service.ts`:

```ts
import type {
  ConfirmWorkspaceBlueprintInput,
  WorkspaceCreationResult,
} from '@command-center/shared-types';
import { workspaceBlueprintSchema } from '@command-center/validation';
import { Prisma } from '@prisma/client';
import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  WORKSPACE_CREATION_PORT,
  type WorkspaceCreationPort,
} from './ports/workspace-creation.port';
import { WorkspaceBlueprintService } from './workspace-blueprint.service';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

@Injectable()
export class WorkspaceOnboardingCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: WorkspaceOnboardingService,
    private readonly blueprints: WorkspaceBlueprintService,
    @Inject(WORKSPACE_CREATION_PORT)
    private readonly creationPort: WorkspaceCreationPort,
  ) {}

  async confirm(
    sessionId: string,
    userId: string,
    input: ConfirmWorkspaceBlueprintInput,
  ): Promise<WorkspaceCreationResult> {
    const owned = await this.sessions.getOwned(sessionId, userId);

    if (
      owned.status === 'COMPLETED' &&
      owned.idempotencyKey === input.idempotencyKey &&
      owned.workspaceId
    ) {
      return {
        sessionId,
        workspaceId: owned.workspaceId,
        status: 'COMPLETED',
        createdAt: (owned.completedAt ?? owned.updatedAt).toISOString(),
      };
    }

    if (owned.status !== 'BLUEPRINT_READY') {
      throw new ConflictException('Session is not ready for confirmation');
    }

    if (
      owned.blueprintRevision !== input.expectedRevision ||
      owned.blueprintHash !== input.blueprintHash
    ) {
      throw new ConflictException('Blueprint changed before confirmation');
    }

    const validation = this.blueprints.validateBlueprint(
      owned.blueprint,
      owned.blueprintRevision,
    );

    if (!validation.valid || validation.hash !== input.blueprintHash) {
      throw new UnprocessableEntityException({
        message: 'Blueprint is invalid',
        issues: validation.issues,
      });
    }

    const blueprint = workspaceBlueprintSchema.parse(owned.blueprint);

    return this.prisma.$transaction(
      async (transaction) => {
        const locked = await transaction.$queryRaw<Array<{
          id: string;
          status: string;
          workspace_id: string | null;
          idempotency_key: string | null;
        }>>(Prisma.sql`
          SELECT id, status, workspace_id, idempotency_key
          FROM workspace_onboarding_sessions
          WHERE id = ${sessionId} AND user_id = ${userId}
          FOR UPDATE
        `);

        const session = locked[0];

        if (!session) {
          throw new ConflictException('Session is unavailable');
        }

        if (
          session.status === 'COMPLETED' &&
          session.idempotency_key === input.idempotencyKey &&
          session.workspace_id
        ) {
          return {
            sessionId,
            workspaceId: session.workspace_id,
            status: 'COMPLETED' as const,
            createdAt: new Date().toISOString(),
          };
        }

        if (session.status !== 'BLUEPRINT_READY') {
          throw new ConflictException('Confirmation is already in progress');
        }

        await transaction.workspaceOnboardingSession.update({
          where: { id: sessionId },
          data: {
            status: 'CREATING',
            idempotencyKey: input.idempotencyKey,
          },
        });

        const created = await this.creationPort.createFromBlueprint({
          transaction,
          ownerUserId: userId,
          blueprint,
        });
        const completedAt = new Date();

        await transaction.workspaceOnboardingSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            workspaceId: created.workspaceId,
            completedAt,
          },
        });

        return {
          sessionId,
          workspaceId: created.workspaceId,
          status: 'COMPLETED' as const,
          createdAt: completedAt.toISOString(),
        };
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
  }
}
```

Important mapping: the raw SQL column names must match the generated migration. If Prisma uses quoted camelCase columns rather than mapped snake_case columns, update this single lock query from the actual migration.

## 8.4 Confirmation endpoint

```ts
@Post(':id/confirm')
confirm(
  @Param('id') id: string,
  @Body() body: unknown,
  @Req() request: AuthenticatedRequest,
) {
  return this.creation.confirm(
    id,
    request.user.id,
    ConfirmWorkspaceBlueprintDto.parse(body),
  );
}
```

## 8.5 Frontend confirmation

API addition:

```ts
confirm: (id: string, input: ConfirmWorkspaceBlueprintInput) =>
  request<WorkspaceCreationResult>(
    `/workspace-onboarding/sessions/${id}/confirm`,
    { method: 'POST', body: JSON.stringify(input) },
  ),
```

Create `workspace-creation-progress.tsx`:

```tsx
'use client';

import type { WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';

export function WorkspaceCreationProgress({
  session,
}: {
  session: WorkspaceOnboardingSessionResponse;
}) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const confirm = async () => {
    if (!session.blueprintHash) {
      setError('Blueprint must be validated before confirmation');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await workspaceOnboardingApi.confirm(session.id, {
        expectedRevision: session.blueprintRevision,
        blueprintHash: session.blueprintHash,
        idempotencyKey: idempotencyKey.current,
      });
      router.replace(`/workspaces/${result.workspaceId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl p-6 text-center">
      <h1 className="text-2xl font-bold">Create this workspace?</h1>
      <p className="mt-2 text-slate-600">
        Creation is transactional. A failed database operation will not leave a partial workspace.
      </p>
      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      <button
        className="mt-6 rounded-xl bg-slate-950 px-6 py-3 text-white disabled:opacity-50"
        disabled={creating}
        onClick={confirm}
        type="button"
      >
        {creating ? 'Creating workspace…' : 'Confirm and create'}
      </button>
    </section>
  );
}
```

## 8.6 Transaction and idempotency tests

Use a test port injected through the token so failures can be placed at deterministic steps.

```ts
it('rolls back every write when application creation fails', async () => {
  failingCreationPort.failAt = 'MOBILE_APPLICATION';

  const response = await confirmReadySession();
  expect(response.statusCode).toBe(500);

  expect(await prisma.workspace.count()).toBe(0);
  expect(await prisma.workspaceMember.count()).toBe(0);
  expect(await prisma.mobileApplication.count()).toBe(0);

  const session = await prisma.workspaceOnboardingSession.findUniqueOrThrow({
    where: { id: readySessionId },
  });
  expect(session.status).toBe('BLUEPRINT_READY');
});

it('returns the same workspace for an idempotent retry', async () => {
  const key = crypto.randomUUID();
  const first = await confirmReadySession(key);
  const second = await confirmReadySession(key);

  expect(first.statusCode).toBe(201);
  expect(second.statusCode).toBe(201);
  expect(second.json().workspaceId).toBe(first.json().workspaceId);
  expect(await prisma.workspace.count()).toBe(1);
});

it('allows only one of two concurrent confirmation requests to create', async () => {
  const key = crypto.randomUUID();
  const responses = await Promise.all([
    confirmReadySession(key),
    confirmReadySession(key),
  ]);

  expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([201, 201]);
  expect(new Set(responses.map((response) => response.json().workspaceId)).size).toBe(1);
});
```

The first rollback assertions must use the repository's actual membership and application delegate names.

---

# Phase 9 — GitHub repository integration

## 9.1 Repository connection port

Create `repository-connection.port.ts`:

```ts
import type {
  WorkspaceApplicationType,
  WorkspaceBlueprintRepository,
} from '@command-center/shared-types';

export const REPOSITORY_CONNECTION_PORT = Symbol('REPOSITORY_CONNECTION_PORT');

export interface VerifiedRepositorySelection {
  repositoryId: string;
  applicationType: WorkspaceApplicationType;
  fullName: string;
}

export interface RepositoryConnectionPort {
  listAvailable(userId: string): Promise<VerifiedRepositorySelection[]>;
  verifySelection(
    userId: string,
    repositories: WorkspaceBlueprintRepository[],
  ): Promise<VerifiedRepositorySelection[]>;
  enqueueLinks(input: {
    userId: string;
    workspaceId: string;
    repositories: VerifiedRepositorySelection[];
  }): Promise<void>;
}
```

The production adapter must call the existing GitHub installation/repository service found in Phase 1. It must return database repository IDs, never installation tokens, access tokens, or webhook secrets.

## 9.2 Repository selection service

```ts
import type { WorkspaceBlueprintRepository } from '@command-center/shared-types';
import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  REPOSITORY_CONNECTION_PORT,
  type RepositoryConnectionPort,
} from './ports/repository-connection.port';

@Injectable()
export class WorkspaceOnboardingRepositorySelectionService {
  constructor(
    @Inject(REPOSITORY_CONNECTION_PORT)
    private readonly repositories: RepositoryConnectionPort,
  ) {}

  available(userId: string) {
    return this.repositories.listAvailable(userId);
  }

  async verify(
    userId: string,
    selections: WorkspaceBlueprintRepository[],
  ) {
    const connected = selections.filter(
      ({ strategy }) => strategy === 'CONNECT_NOW',
    );

    if (connected.some(({ repositoryId }) => !repositoryId)) {
      throw new BadRequestException('Connected repositories require repository IDs');
    }

    return this.repositories.verifySelection(userId, connected);
  }
}
```

## 9.3 Keep GitHub outside the core transaction

Before the Phase 8 transaction, call `verify()` to confirm current access. The transaction creates local pending-link records or stores the verified repository IDs through the creation port. After the transaction commits, call `enqueueLinks()`.

```ts
const verifiedRepositories = await this.repositorySelections.verify(
  userId,
  blueprint.repositories,
);

const result = await this.createTransactionally(...);

try {
  await this.repositoryConnections.enqueueLinks({
    userId,
    workspaceId: result.workspaceId,
    repositories: verifiedRepositories,
  });
} catch (error) {
  this.logger.error(
    `Repository linking queued for retry: session=${sessionId}`,
    error instanceof Error ? error.stack : undefined,
  );
}

return result;
```

A GitHub outage must not roll back a successfully created workspace. The persisted link status must remain `PENDING` or `FAILED`, never falsely `CONNECTED`.

## 9.4 Endpoints

```ts
@Get(':id/repositories/available')
async availableRepositories(
  @Param('id') id: string,
  @Req() request: AuthenticatedRequest,
) {
  await this.sessions.getOwned(id, request.user.id);
  return this.repositorySelections.available(request.user.id);
}
```

Repository selection itself is saved through the existing blueprint update endpoint so revision and hash validation remain consistent.

## 9.5 Frontend repository editor

```tsx
'use client';

import type {
  WorkspaceApplicationType,
  WorkspaceBlueprintRepository,
} from '@command-center/shared-types';

export function BlueprintRepositoryEditor({
  applicationTypes,
  repositories,
  available,
  onChange,
}: {
  applicationTypes: WorkspaceApplicationType[];
  repositories: WorkspaceBlueprintRepository[];
  available: Array<{ repositoryId: string; fullName: string }>;
  onChange(value: WorkspaceBlueprintRepository[]): void;
}) {
  const update = (
    type: WorkspaceApplicationType,
    patch: Partial<WorkspaceBlueprintRepository>,
  ) => {
    const current = repositories.find(
      ({ applicationType }) => applicationType === type,
    ) ?? {
      applicationType: type,
      strategy: 'CONNECT_LATER' as const,
      placeholderName: `${type.toLowerCase()}-application`,
    };
    const next = repositories.filter(
      ({ applicationType }) => applicationType !== type,
    );
    onChange([...next, { ...current, ...patch }]);
  };

  return (
    <section className="space-y-4" aria-labelledby="repository-heading">
      <h2 id="repository-heading" className="text-lg font-semibold">Repositories</h2>
      {applicationTypes.map((type) => {
        const value = repositories.find(
          ({ applicationType }) => applicationType === type,
        );

        return (
          <div className="rounded-xl border p-4" key={type}>
            <label className="font-medium" htmlFor={`repository-${type}`}>{type}</label>
            <select
              className="mt-2 w-full rounded-lg border p-2"
              id={`repository-${type}`}
              onChange={(event) =>
                update(type, {
                  strategy: event.target.value ? 'CONNECT_NOW' : 'CONNECT_LATER',
                  repositoryId: event.target.value || undefined,
                  placeholderName: event.target.value
                    ? undefined
                    : `${type.toLowerCase()}-application`,
                })
              }
              value={value?.repositoryId ?? ''}
            >
              <option value="">Connect later</option>
              {available.map((repository) => (
                <option key={repository.repositoryId} value={repository.repositoryId}>
                  {repository.fullName}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </section>
  );
}
```

## 9.6 Phase 9 tests

```ts
it('rejects a repository the user cannot access', async () => {
  repositoryPort.verifySelection.mockRejectedValue(
    new ForbiddenException('Repository access denied'),
  );

  const response = await confirmSessionWithRepository('foreign-repository-id');
  expect(response.statusCode).toBe(403);
  expect(await prisma.workspace.count()).toBe(0);
});

it('creates the workspace when GitHub linking later fails', async () => {
  repositoryPort.enqueueLinks.mockRejectedValue(new Error('GitHub unavailable'));

  const response = await confirmSessionWithRepository(ownedRepositoryId);
  expect(response.statusCode).toBe(201);
  expect(await prisma.workspace.count()).toBe(1);
  expect(await pendingRepositoryLink()).toMatchObject({ status: 'PENDING' });
});

it('never exposes GitHub secrets in onboarding responses', async () => {
  const response = await getOnboardingSession();
  const serialized = JSON.stringify(response.json());

  expect(serialized).not.toContain('accessToken');
  expect(serialized).not.toContain('installationToken');
  expect(serialized).not.toContain('webhookSecret');
});
```

---

# Phase 10 — Engineering-system defaults

## 10.1 Rules

Create `engineering-system.rules.ts`:

```ts
import type {
  EngineeringSystem,
  WorkspaceBlueprintEngineeringConfiguration,
} from '@command-center/shared-types';
import type { WorkspaceRule } from './rule-engine';

const explanations: Record<EngineeringSystem, string> = {
  CI_CD: 'Proposes build and deployment automation for selected environments.',
  MONITORING: 'Proposes runtime health monitoring without activating an external provider.',
  ANALYTICS: 'Proposes product analytics without inventing a tracking credential.',
  PERFORMANCE: 'Proposes performance collection for selected application types.',
  ALERTS: 'Proposes alert rules that remain inactive until delivery channels are configured.',
  SECURITY: 'Proposes dependency, signing, and configuration security checks.',
  BACKUPS: 'Proposes database backup policy for production environments.',
};

function proposed(system: EngineeringSystem): WorkspaceBlueprintEngineeringConfiguration {
  return {
    system,
    state: 'PROPOSED',
    enabledByDefault: false,
    explanation: explanations[system],
  };
}

export const engineeringSystemRules: readonly WorkspaceRule[] = [
  {
    id: 'requested-engineering-systems',
    version: '1.0.0',
    priority: 700,
    when: ({ answers }) => (answers.qualityRequirements?.length ?? 0) > 0,
    apply: (draft, { answers }) => {
      draft.engineeringConfigurations =
        answers.qualityRequirements!.map(proposed);
    },
    explanation: 'Requested engineering systems are stored as proposals until configured and verified.',
  },
  {
    id: 'production-security-baseline',
    version: '1.0.0',
    priority: 710,
    when: ({ answers }) => answers.environments?.includes('PRODUCTION') === true,
    apply: (draft) => {
      for (const system of ['CI_CD', 'MONITORING', 'SECURITY', 'BACKUPS'] as const) {
        if (!draft.engineeringConfigurations.some((item) => item.system === system)) {
          draft.engineeringConfigurations.push(proposed(system));
        }
      }
    },
    explanation: 'Production environments require CI/CD, monitoring, security, and backup proposals.',
  },
];
```

Run these rules after application/service rules. Initialize `repositories` and `engineeringConfigurations` as empty arrays in the generator.

## 10.2 Honest persistence policy

The Phase 8 creation port may create local configuration rows only when the existing model supports a truthful proposed or disabled state. Apply these rules:

| Blueprint state | Database behavior |
| --- | --- |
| `PROPOSED` | Create disabled proposal or keep in final blueprint snapshot |
| `ACTIVE` | Allowed only after credentials and provider verification |
| `UNAVAILABLE` | Store explanation only; create no active integration |

Never generate Sentry DSNs, analytics keys, signing certificates, webhook secrets, store credentials, or deployment tokens.

## 10.3 Frontend engineering review

```tsx
import type { WorkspaceBlueprintEngineeringConfiguration } from '@command-center/shared-types';

export function EngineeringSystemsReview({
  configurations,
}: {
  configurations: WorkspaceBlueprintEngineeringConfiguration[];
}) {
  return (
    <section aria-labelledby="engineering-heading">
      <h2 id="engineering-heading" className="text-lg font-semibold">
        Engineering systems
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {configurations.map((configuration) => (
          <article className="rounded-xl border p-4" key={configuration.system}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">
                {configuration.system.replaceAll('_', ' ')}
              </h3>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                {configuration.state}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {configuration.explanation}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

## 10.4 Phase 10 tests

```ts
it('adds production engineering proposals without activating providers', async () => {
  const blueprint = await generator.generate({
    ...completeAnswers,
    environments: ['DEVELOPMENT', 'PRODUCTION'],
    qualityRequirements: ['PERFORMANCE'],
  });

  expect(blueprint.engineeringConfigurations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ system: 'PERFORMANCE', state: 'PROPOSED' }),
      expect.objectContaining({ system: 'CI_CD', state: 'PROPOSED' }),
      expect.objectContaining({ system: 'MONITORING', state: 'PROPOSED' }),
      expect.objectContaining({ system: 'SECURITY', state: 'PROPOSED' }),
      expect.objectContaining({ system: 'BACKUPS', state: 'PROPOSED' }),
    ]),
  );

  expect(
    blueprint.engineeringConfigurations.every(
      ({ enabledByDefault }) => enabledByDefault === false,
    ),
  ).toBe(true);
});

it('does not persist fictional active integrations', async () => {
  const result = await completeGuidedWorkspace();
  const integrations = await prisma.integration.findMany({
    where: { workspaceId: result.workspaceId },
  });

  expect(integrations.every(({ status }) => status !== 'ACTIVE')).toBe(true);
});
```

Replace the last delegate and status field with the actual integration model recorded in Phase 1. If no proposal-capable model exists, assert that no integration row is created and verify the proposal remains in the final blueprint snapshot.

---

# Full-stack Phase 6–10 scenario

Create `fullstack-workspace-onboarding.spec.ts` using the established Playwright full-stack fixtures:

```ts
import { expect, test } from '@playwright/test';

test('reviews, edits and transactionally creates a multi-application workspace', async ({
  page,
}) => {
  await loginAsOwner(page);
  await page.goto('/workspaces/new/guided');

  await answerText(page, 'What are you building?', 'Cross-platform task management');
  await answerText(page, 'What should the workspace be called?', 'TodoFlow');
  await choose(page, 'What type of product is it?', 'Productivity SaaS');
  await chooseMany(page, 'Who will use the product?', ['Consumers']);
  await chooseMany(page, 'Which applications do you need?', [
    'Web',
    'Mobile',
    'Desktop',
  ]);
  await chooseMany(page, 'Which mobile platforms do you need?', ['Android', 'iOS']);
  await chooseMany(page, 'Which desktop platforms do you need?', ['Windows']);
  await chooseMany(page, 'Which core features are required?', ['Dashboard']);
  await chooseBoolean(page, 'Does the product require user accounts?', true);
  await choose(page, 'Do repositories already exist?', 'Connect later');
  await chooseMany(page, 'Which environments are required?', [
    'Development',
    'Production',
  ]);
  await chooseMany(page, 'Which engineering systems are required?', [
    'CI/CD',
    'Monitoring',
    'Security',
  ]);

  await page.getByRole('button', {
    name: 'Generate guided recommendations',
  }).click();

  await expect(page.getByRole('heading', {
    name: 'Review guided recommendations',
  })).toBeVisible();
  await expect(page.getByText('TodoFlow Web')).toBeVisible();
  await expect(page.getByText('TodoFlow Mobile')).toBeVisible();
  await expect(page.getByText('TodoFlow Desktop')).toBeVisible();

  await page.getByRole('group', { name: 'TodoFlow Desktop' })
    .getByRole('button', { name: 'ELECTRON' })
    .click();

  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByText('Resolve these blueprint issues')).not.toBeVisible();

  await page.getByRole('button', { name: 'Confirm and create' }).click();
  await expect(page).toHaveURL(/\/workspaces\/[a-z0-9-]+$/);

  await expect(page.getByText('TodoFlow')).toBeVisible();
  await expect(page.getByText('Web')).toBeVisible();
  await expect(page.getByText('Mobile')).toBeVisible();
  await expect(page.getByText('Desktop')).toBeVisible();
});

test('remains usable on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsOwner(page);
  await page.goto('/workspaces/new/guided');

  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});
```

The helper implementations must reuse the existing full-stack login/seed API, not duplicate authentication setup.

# Security tests required before completion

```ts
it.each([
  ['outsider cannot read blueprint', outsiderToken, 404],
  ['outsider cannot edit blueprint', outsiderToken, 404],
  ['outsider cannot validate blueprint', outsiderToken, 404],
  ['outsider cannot confirm blueprint', outsiderToken, 404],
])('%s', async (_name, token, status) => {
  expect(await callProtectedBlueprintRoute(token)).toHaveProperty(
    'statusCode',
    status,
  );
});

it('rejects client-provided ownership fields', async () => {
  const response = await updateBlueprintRaw({
    ...validUpdate,
    ownerUserId: outsiderUserId,
    workspaceRole: 'OWNER',
  });

  expect(response.statusCode).toBe(400);
});

it('does not store credentials in the final blueprint snapshot', async () => {
  const snapshot = await loadFinalBlueprint();
  const serialized = JSON.stringify(snapshot);

  expect(serialized).not.toMatch(
    /access[_-]?token|refresh[_-]?token|client[_-]?secret|webhook[_-]?secret|private[_-]?key/i,
  );
});
```

# Integration sequence

1. Extend shared contracts and Zod schemas.
2. Add Phase 6 compatibility validation and rules.
3. Run shared build, unit tests, and deterministic generator snapshots.
4. Add blueprint revision and hash columns; generate and replay the migration on the disposable database.
5. Add blueprint update/validate service and endpoints.
6. Add review components and component tests.
7. Implement `WorkspaceCreationPort` using the exact Phase 1 domain mapping.
8. Add locking, idempotency, confirmation, and rollback tests.
9. Implement `RepositoryConnectionPort` with the existing GitHub integration service.
10. Add repository review and external retry behavior.
11. Add engineering-system proposal rules and honest persistence behavior.
12. Run full API, web, tracker, and full-stack regression gates.

# Verification commands

```powershell
pnpm build:packages

pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate

pnpm --filter @command-center/api typecheck
pnpm --filter @command-center/api-tests typecheck
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web-tests typecheck

pnpm --filter @command-center/api-tests test:unit -- `
  workspace-onboarding `
  technology-compatibility `
  rule-based-generator

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
git diff --check
```

# Phase 6–10 completion gate

Phases 6–10 are complete only when:

- Every supported application/platform combination has a compatibility test.
- Explicit valid technology preferences override defaults and are marked `USER`.
- Invalid preferences are rejected instead of silently changed.
- Blueprint update uses an atomic revision check.
- Blueprint confirmation requires both revision and SHA-256 hash.
- Failed transactional creation leaves no partial workspace, membership, or application.
- Repeating the same idempotency key returns the same workspace.
- Concurrent confirmation cannot create duplicates.
- Repository access is revalidated before creation.
- GitHub failure after commit leaves a retryable local state and does not falsify connection status.
- Onboarding JSON never contains GitHub tokens or secrets.
- Engineering systems remain `PROPOSED` unless credentials and provider verification exist.
- Web, mobile, and desktop guided flows pass on desktop and mobile viewports.
- Existing manual and GitHub creation flows remain green.
- Lint, typecheck, production build, unit, E2E, full-stack, and migration replay pass.

# Work intentionally deferred

Phases 11–14 still own endpoint rate limits, payload limits, retention cleanup, complete security hardening, broader full-stack coverage, observability, feature flags, controlled rollout, and future AI-provider adapters. Do not mark the full Guided Workspace Builder production-ready after Phase 10 alone.
