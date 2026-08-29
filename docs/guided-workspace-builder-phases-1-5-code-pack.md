# Guided Workspace Builder — Phases 1–5 Code Pack

## Purpose and integration boundary

This file converts Phases 1–5 of the Guided Workspace Builder plan into an implementation-ready code pack for the SaaS Command Center monorepo.

It intentionally does not claim that repository-specific imports, Prisma relation names, authentication decorators, or API helper names are already correct. Phase 1 exists to resolve those exact mappings. Apply the Phase 1 audit first, then replace the clearly marked integration names before copying the Phase 2–5 files.

The implementation uses:

- NestJS with Fastify
- Prisma and PostgreSQL
- Shared TypeScript contracts
- Zod validation
- Next.js App Router
- React client components
- Jest API tests
- Vitest and Testing Library frontend tests
- Rule-based deterministic blueprint generation

## Delivery map

| Phase | Deliverable                                                                   |
| ----- | ----------------------------------------------------------------------------- |
| 1     | Existing-domain audit, compatibility map, regression baseline                 |
| 2     | Shared answers, questions, session, and blueprint contracts plus validation   |
| 3     | Prisma session persistence and authenticated lifecycle API                    |
| 4     | Versioned question catalog, conditional flow, API client, and guided UI       |
| 5     | Generator interface, deterministic rule engine, blueprint endpoint, and tests |

---

# Phase 1 — Existing-domain audit

Phase 1 changes no production behavior. Run this command from the project root and keep the generated report with the implementation work.

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $out = '.\guided-builder-phase-1-audit.txt'
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $result = [System.Collections.Generic.List[string]]::new()

  $result.Add('GUIDED WORKSPACE BUILDER — PHASE 1 AUDIT')
  $result.Add("DATE: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")

  $paths = @(
    'apps/api/prisma/schema.prisma',
    'apps/api/src/app.module.ts',
    'apps/api/src/modules/workspace',
    'apps/api/src/modules/applications',
    'apps/api/src/modules/mobile-apps',
    'apps/api/src/modules/desktop-apps',
    'apps/web/src/app/(dashboard)/workspaces/new',
    'apps/web/src/features',
    'packages/shared-types/src',
    'packages/validation/src',
    'packages/test-code/api/helpers/create-test-app.ts',
    'packages/test-code/web/package.json'
  )

  foreach ($path in $paths) {
    $result.Add('')
    $result.Add(('=' * 100))
    $result.Add("TARGET: $path")
    $result.Add(('=' * 100))

    if (-not (Test-Path -LiteralPath $path)) {
      $result.Add('NOT FOUND')
      continue
    }

    $item = Get-Item -LiteralPath $path

    if ($item.PSIsContainer) {
      Get-ChildItem -LiteralPath $path -Recurse -File |
        Where-Object {
          $_.Extension -in @('.ts', '.tsx', '.prisma', '.json')
        } |
        ForEach-Object {
          $result.Add($_.FullName)
        }
    }
    else {
      $result.Add(
        [System.IO.File]::ReadAllText($item.FullName)
      )
    }
  }

  $result.Add('')
  $result.Add(('=' * 100))
  $result.Add('CREATION AND AUTH REFERENCES')
  $result.Add(('=' * 100))

  $matches = git grep -n -I -E `
    'createWorkspace|workspace\.create|CurrentUser|RequestWithUser|WorkspaceRole|create.*Application|apiFetch|fetchApi' `
    -- `
    apps/api/src `
    apps/web/src `
    packages/shared-types/src `
    packages/validation/src 2>&1

  foreach ($match in $matches) {
    $result.Add($match)
  }

  [System.IO.File]::WriteAllLines(
    (Join-Path (Get-Location) $out),
    $result,
    $utf8
  )

  pnpm --filter @command-center/api-tests test:e2e:fast -- `
    workspace `
    github-workspace-import

  if ($LASTEXITCODE -ne 0) {
    throw 'Existing workspace regression baseline failed.'
  }

  Write-Host "Saved: $out" -ForegroundColor Green
}
```

Complete this mapping before integration:

| Required concept      | Resolve from repository                            |
| --------------------- | -------------------------------------------------- |
| Authenticated user ID | Existing Fastify request-user type or decorator    |
| Workspace creation    | Existing workspace service method and required DTO |
| Owner membership      | Whether workspace service creates it automatically |
| Web application       | Existing application model and creation service    |
| Mobile application    | Existing mobile model and creation service         |
| Desktop application   | Existing desktop model and creation service        |
| API client            | Existing authenticated web fetch wrapper           |
| Shared exports        | Existing package barrel-file conventions           |
| Validation library    | Confirm Zod is already installed and exported      |

Phase 1 exits only when the regression tests pass and every row above has an exact source file and symbol.

---

# Phase 2 — Shared contracts and validation

## 2.1 Shared contracts

Create `packages/shared-types/src/workspace-onboarding/workspace-onboarding.types.ts`:

```ts
export const workspaceApplicationTypes = ['WEB', 'MOBILE', 'DESKTOP'] as const;
export type WorkspaceApplicationType = (typeof workspaceApplicationTypes)[number];

export const workspaceProductTypes = ['PRODUCTIVITY_SAAS', 'ECOMMERCE', 'MARKETPLACE', 'SOCIAL', 'INTERNAL_TOOL', 'OTHER'] as const;
export type WorkspaceProductType = (typeof workspaceProductTypes)[number];

export const workspacePlatforms = ['WEB', 'ANDROID', 'IOS', 'WINDOWS', 'MACOS', 'LINUX'] as const;
export type WorkspacePlatform = (typeof workspacePlatforms)[number];

export const workspaceTechnologies = ['NEXT_JS', 'TYPESCRIPT', 'KOTLIN', 'JETPACK_COMPOSE', 'SWIFT', 'SWIFTUI', 'REACT_NATIVE', 'FLUTTER', 'TAURI', 'ELECTRON', 'NEST_JS', 'POSTGRESQL', 'REDIS'] as const;
export type WorkspaceTechnology = (typeof workspaceTechnologies)[number];

export const workspaceEnvironments = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
export type WorkspaceEnvironment = (typeof workspaceEnvironments)[number];

export const engineeringSystems = ['CI_CD', 'MONITORING', 'ANALYTICS', 'PERFORMANCE', 'ALERTS', 'SECURITY', 'BACKUPS'] as const;
export type EngineeringSystem = (typeof engineeringSystems)[number];

export type WorkspaceQuestionType = 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'TECHNOLOGY';

export type WorkspaceGeneratorProvider = 'rules';
export type RepositoryStrategy = 'NONE' | 'CONNECT_LATER' | 'CONNECT_NOW';

export interface WorkspaceOnboardingAnswers {
  productIdea?: string;
  workspaceName?: string;
  productType?: WorkspaceProductType;
  targetUsers?: string[];
  applicationTypes?: WorkspaceApplicationType[];
  coreFeatures?: string[];
  authentication?: boolean;
  collaboration?: boolean;
  notifications?: string[];
  technologyPreference?: Partial<Record<WorkspaceApplicationType, WorkspaceTechnology[]>>;
  mobilePlatforms?: Extract<WorkspacePlatform, 'ANDROID' | 'IOS'>[];
  desktopPlatforms?: Extract<WorkspacePlatform, 'WINDOWS' | 'MACOS' | 'LINUX'>[];
  repositories?: RepositoryStrategy;
  environments?: WorkspaceEnvironment[];
  qualityRequirements?: EngineeringSystem[];
}

export interface WorkspaceQuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface WorkspaceQuestionDefinition {
  key: keyof WorkspaceOnboardingAnswers;
  prompt: string;
  type: WorkspaceQuestionType;
  required: boolean;
  options?: WorkspaceQuestionOption[];
}

export interface WorkspaceQuestionFlowResponse {
  questions: WorkspaceQuestionDefinition[];
  currentQuestion: WorkspaceQuestionDefinition | null;
  completed: number;
  total: number;
  percent: number;
}

export interface WorkspaceBlueprintRecommendation {
  id: string;
  ruleId: string;
  title: string;
  explanation: string;
}

export interface WorkspaceBlueprintApplication {
  type: WorkspaceApplicationType;
  name: string;
  platforms: WorkspacePlatform[];
  stack: WorkspaceTechnology[];
}

export interface WorkspaceBlueprint {
  schemaVersion: 1;
  generator: {
    provider: WorkspaceGeneratorProvider;
    version: string;
  };
  workspace: {
    name: string;
    slug: string;
    description: string;
    productType: WorkspaceProductType;
  };
  applications: WorkspaceBlueprintApplication[];
  services: {
    backend: WorkspaceTechnology[];
    database: WorkspaceTechnology[];
    cache: WorkspaceTechnology[];
    authentication: string[];
  };
  features: string[];
  environments: WorkspaceEnvironment[];
  engineeringSystems: EngineeringSystem[];
  recommendations: WorkspaceBlueprintRecommendation[];
}

export interface WorkspaceOnboardingSessionResponse {
  id: string;
  status: 'IN_PROGRESS' | 'BLUEPRINT_READY' | 'CREATING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  currentStep: string | null;
  answers: WorkspaceOnboardingAnswers;
  blueprint: WorkspaceBlueprint | null;
  schemaVersion: number;
  ruleSetVersion: string | null;
  generatorProvider: WorkspaceGeneratorProvider;
  workspaceId: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
```

Create `packages/shared-types/src/workspace-onboarding/index.ts`:

```ts
export * from './workspace-onboarding.types';
```

Add this export to the package's existing root barrel:

```ts
export * from './workspace-onboarding';
```

## 2.2 Zod schemas

Create `packages/validation/src/workspace-onboarding/workspace-onboarding.schemas.ts`:

```ts
import { engineeringSystems, workspaceApplicationTypes, workspaceEnvironments, workspacePlatforms, workspaceProductTypes, workspaceTechnologies } from '@command-center/shared-types';
import { z } from 'zod';

const unique = <T>(values: T[]) => new Set(values).size === values.length;

const uniqueArray = <T extends z.ZodTypeAny>(schema: T, maximum: number) => z.array(schema).max(maximum).refine(unique, 'Duplicate values are not allowed');

export const workspaceOnboardingAnswersSchema = z
  .object({
    productIdea: z.string().trim().min(3).max(500).optional(),
    workspaceName: z.string().trim().min(2).max(80).optional(),
    productType: z.enum(workspaceProductTypes).optional(),
    targetUsers: uniqueArray(z.string().trim().min(1).max(80), 20).optional(),
    applicationTypes: uniqueArray(z.enum(workspaceApplicationTypes), 3).optional(),
    coreFeatures: uniqueArray(z.string().trim().min(1).max(80), 30).optional(),
    authentication: z.boolean().optional(),
    collaboration: z.boolean().optional(),
    notifications: uniqueArray(z.string().trim().min(1).max(50), 10).optional(),
    technologyPreference: z.record(z.enum(workspaceApplicationTypes), uniqueArray(z.enum(workspaceTechnologies), 12)).optional(),
    mobilePlatforms: uniqueArray(z.enum(['ANDROID', 'IOS'] as const), 2).optional(),
    desktopPlatforms: uniqueArray(z.enum(['WINDOWS', 'MACOS', 'LINUX'] as const), 3).optional(),
    repositories: z.enum(['NONE', 'CONNECT_LATER', 'CONNECT_NOW']).optional(),
    environments: uniqueArray(z.enum(workspaceEnvironments), 3).optional(),
    qualityRequirements: uniqueArray(z.enum(engineeringSystems), 7).optional(),
  })
  .strict()
  .superRefine((answers, context) => {
    if (answers.mobilePlatforms?.length && !answers.applicationTypes?.includes('MOBILE')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mobilePlatforms'],
        message: 'Mobile platforms require the MOBILE application type',
      });
    }

    if (answers.desktopPlatforms?.length && !answers.applicationTypes?.includes('DESKTOP')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['desktopPlatforms'],
        message: 'Desktop platforms require the DESKTOP application type',
      });
    }
  });

const applicationSchema = z
  .object({
    type: z.enum(workspaceApplicationTypes),
    name: z.string().trim().min(2).max(100),
    platforms: uniqueArray(z.enum(workspacePlatforms), 6).min(1),
    stack: uniqueArray(z.enum(workspaceTechnologies), 12).min(1),
  })
  .strict()
  .superRefine((application, context) => {
    const allowedPlatforms = {
      WEB: ['WEB'],
      MOBILE: ['ANDROID', 'IOS'],
      DESKTOP: ['WINDOWS', 'MACOS', 'LINUX'],
    } as const;

    for (const platform of application.platforms) {
      if (!(allowedPlatforms[application.type] as readonly string[]).includes(platform)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['platforms'],
          message: `${platform} is incompatible with ${application.type}`,
        });
      }
    }
  });

export const workspaceBlueprintSchema = z
  .object({
    schemaVersion: z.literal(1),
    generator: z.object({
      provider: z.literal('rules'),
      version: z.string().min(1).max(30),
    }),
    workspace: z.object({
      name: z.string().trim().min(2).max(80),
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(80),
      description: z.string().trim().min(3).max(500),
      productType: z.enum(workspaceProductTypes),
    }),
    applications: uniqueArray(applicationSchema, 3)
      .min(1)
      .refine((applications) => unique(applications.map(({ type }) => type)), 'Only one application blueprint per type is allowed'),
    services: z.object({
      backend: uniqueArray(z.enum(workspaceTechnologies), 8),
      database: uniqueArray(z.enum(workspaceTechnologies), 4),
      cache: uniqueArray(z.enum(workspaceTechnologies), 4),
      authentication: uniqueArray(z.string().trim().min(1).max(50), 10),
    }),
    features: uniqueArray(z.string().trim().min(1).max(80), 30),
    environments: uniqueArray(z.enum(workspaceEnvironments), 3).min(1),
    engineeringSystems: uniqueArray(z.enum(engineeringSystems), 7),
    recommendations: z.array(
      z.object({
        id: z.string().min(1),
        ruleId: z.string().min(1),
        title: z.string().min(1).max(120),
        explanation: z.string().min(1).max(500),
      }),
    ),
  })
  .strict();

export const completeWorkspaceOnboardingAnswersSchema = workspaceOnboardingAnswersSchema.superRefine((answers, context) => {
  const required = ['productIdea', 'workspaceName', 'productType', 'targetUsers', 'applicationTypes', 'coreFeatures', 'authentication', 'repositories', 'environments', 'qualityRequirements'] as const;

  for (const key of required) {
    const value = answers[key];

    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: 'This answer is required before blueprint generation',
      });
    }
  }
});
```

Create the local and root barrel exports following the package's existing export convention.

## 2.3 Validation tests

Create `packages/test-code/api/unit/workspace-onboarding/workspace-onboarding.schemas.spec.ts`:

```ts
import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema, workspaceOnboardingAnswersSchema } from '@command-center/validation';

describe('workspace onboarding schemas', () => {
  it('rejects duplicate application types', () => {
    const result = workspaceOnboardingAnswersSchema.safeParse({
      applicationTypes: ['WEB', 'WEB'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects mobile platforms without a mobile application', () => {
    const result = workspaceOnboardingAnswersSchema.safeParse({
      applicationTypes: ['WEB'],
      mobilePlatforms: ['ANDROID'],
    });

    expect(result.success).toBe(false);
  });

  it('requires complete answers before generation', () => {
    expect(
      completeWorkspaceOnboardingAnswersSchema.safeParse({
        workspaceName: 'TodoFlow',
      }).success,
    ).toBe(false);
  });

  it('rejects an incompatible application platform', () => {
    const result = workspaceBlueprintSchema.safeParse({
      schemaVersion: 1,
      generator: { provider: 'rules', version: '1.0.0' },
      workspace: {
        name: 'TodoFlow',
        slug: 'todoflow',
        description: 'Task management product',
        productType: 'PRODUCTIVITY_SAAS',
      },
      applications: [
        {
          type: 'WEB',
          name: 'TodoFlow Web',
          platforms: ['ANDROID'],
          stack: ['NEXT_JS'],
        },
      ],
      services: {
        backend: ['NEST_JS'],
        database: ['POSTGRESQL'],
        cache: [],
        authentication: [],
      },
      features: ['TASKS'],
      environments: ['DEVELOPMENT'],
      engineeringSystems: [],
      recommendations: [],
    });

    expect(result.success).toBe(false);
  });
});
```

---

# Phase 3 — Onboarding session persistence

## 3.1 Prisma schema

Add the following model and enum. Add the corresponding relation fields to `User` and `Workspace` using the names confirmed by Phase 1.

```prisma
enum WorkspaceOnboardingStatus {
  IN_PROGRESS
  BLUEPRINT_READY
  CREATING
  COMPLETED
  FAILED
  EXPIRED
}

model WorkspaceOnboardingSession {
  id                String                      @id @default(cuid())
  userId            String
  status            WorkspaceOnboardingStatus  @default(IN_PROGRESS)
  currentStep       String?
  answers           Json
  blueprint         Json?
  schemaVersion     Int                         @default(1)
  ruleSetVersion    String?
  generatorProvider String                      @default("rules")
  workspaceId       String?                     @unique
  idempotencyKey    String?                     @unique
  expiresAt         DateTime
  completedAt       DateTime?
  createdAt         DateTime                    @default(now())
  updatedAt         DateTime                    @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace Workspace? @relation(fields: [workspaceId], references: [id], onDelete: SetNull)

  @@index([userId, status])
  @@index([expiresAt])
  @@map("workspace_onboarding_sessions")
}
```

Generate the migration rather than hand-writing SQL:

```powershell
pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma migrate dev --name workspace_onboarding_sessions
pnpm --filter @command-center/api exec prisma generate
```

## 3.2 DTOs

Create `apps/api/src/modules/workspace-onboarding/dto/update-onboarding-answers.dto.ts`:

```ts
import type { WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { workspaceOnboardingAnswersSchema } from '@command-center/validation';
import { BadRequestException } from '@nestjs/common';

export class UpdateOnboardingAnswersDto {
  answers!: Partial<WorkspaceOnboardingAnswers>;

  static parse(input: unknown): UpdateOnboardingAnswersDto {
    const body = input as { answers?: unknown };
    const result = workspaceOnboardingAnswersSchema.safeParse(body?.answers);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid onboarding answers',
        errors: result.error.flatten().fieldErrors,
      });
    }

    return { answers: result.data };
  }
}
```

## 3.3 Repository

Create `apps/api/src/modules/workspace-onboarding/workspace-onboarding.repository.ts`:

```ts
import type { Prisma, WorkspaceOnboardingStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkspaceOnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, expiresAt: Date) {
    return this.prisma.workspaceOnboardingSession.create({
      data: {
        userId,
        expiresAt,
        answers: {},
      },
    });
  }

  findOwned(id: string, userId: string) {
    return this.prisma.workspaceOnboardingSession.findFirst({
      where: { id, userId },
    });
  }

  updateAnswers(id: string, answers: Prisma.InputJsonValue, currentStep: string | null) {
    return this.prisma.workspaceOnboardingSession.update({
      where: { id },
      data: {
        answers,
        currentStep,
        blueprint: Prisma.JsonNull,
        ruleSetVersion: null,
        status: 'IN_PROGRESS',
      },
    });
  }

  updateStatus(id: string, status: WorkspaceOnboardingStatus) {
    return this.prisma.workspaceOnboardingSession.update({
      where: { id },
      data: { status },
    });
  }

  saveBlueprint(id: string, blueprint: Prisma.InputJsonValue, ruleSetVersion: string) {
    return this.prisma.workspaceOnboardingSession.update({
      where: { id },
      data: {
        blueprint,
        ruleSetVersion,
        status: 'BLUEPRINT_READY',
      },
    });
  }

  deleteOwned(id: string, userId: string) {
    return this.prisma.workspaceOnboardingSession.deleteMany({
      where: { id, userId },
    });
  }
}
```

## 3.4 Service

Create `apps/api/src/modules/workspace-onboarding/workspace-onboarding.service.ts`:

```ts
import type { WorkspaceOnboardingAnswers, WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { workspaceOnboardingAnswersSchema } from '@command-center/validation';
import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceOnboardingRepository } from './workspace-onboarding.repository';

const SESSION_TTL_HOURS = 168;

@Injectable()
export class WorkspaceOnboardingService {
  constructor(private readonly repository: WorkspaceOnboardingRepository) {}

  async create(userId: string): Promise<WorkspaceOnboardingSessionResponse> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    return this.toResponse(await this.repository.create(userId, expiresAt));
  }

  async getOwned(id: string, userId: string) {
    const session = await this.repository.findOwned(id, userId);

    if (!session) {
      throw new NotFoundException('Onboarding session not found');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      if (session.status !== 'EXPIRED') {
        await this.repository.updateStatus(id, 'EXPIRED');
      }

      throw new GoneException('Onboarding session has expired');
    }

    return session;
  }

  async get(id: string, userId: string) {
    return this.toResponse(await this.getOwned(id, userId));
  }

  async updateAnswers(id: string, userId: string, patch: Partial<WorkspaceOnboardingAnswers>) {
    const session = await this.getOwned(id, userId);
    const previous = workspaceOnboardingAnswersSchema.parse(session.answers);
    const answers = workspaceOnboardingAnswersSchema.parse({
      ...previous,
      ...patch,
    });

    const updated = await this.repository.updateAnswers(id, answers, Object.keys(patch).at(-1) ?? session.currentStep);

    return this.toResponse(updated);
  }

  async delete(id: string, userId: string) {
    await this.getOwned(id, userId);
    await this.repository.deleteOwned(id, userId);
  }

  toResponse(session: {
    id: string;
    status: string;
    currentStep: string | null;
    answers: unknown;
    blueprint: unknown;
    schemaVersion: number;
    ruleSetVersion: string | null;
    generatorProvider: string;
    workspaceId: string | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): WorkspaceOnboardingSessionResponse {
    return {
      id: session.id,
      status: session.status as WorkspaceOnboardingSessionResponse['status'],
      currentStep: session.currentStep,
      answers: workspaceOnboardingAnswersSchema.parse(session.answers),
      blueprint: session.blueprint as WorkspaceOnboardingSessionResponse['blueprint'],
      schemaVersion: session.schemaVersion,
      ruleSetVersion: session.ruleSetVersion,
      generatorProvider: 'rules',
      workspaceId: session.workspaceId,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
```

## 3.5 Controller and module

Create `apps/api/src/modules/workspace-onboarding/workspace-onboarding.controller.ts`:

```ts
import type { FastifyRequest } from 'fastify';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateOnboardingAnswersDto } from './dto/update-onboarding-answers.dto';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

type AuthenticatedRequest = FastifyRequest & RequestWithUser;

@Controller('workspace-onboarding/sessions')
export class WorkspaceOnboardingController {
  constructor(private readonly service: WorkspaceOnboardingService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest) {
    return this.service.create(request.user.id);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.get(id, request.user.id);
  }

  @Patch(':id/answers')
  updateAnswers(@Param('id') id: string, @Body() input: unknown, @Req() request: AuthenticatedRequest) {
    const body = UpdateOnboardingAnswersDto.parse(input);
    return this.service.updateAnswers(id, request.user.id, body.answers);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    await this.service.delete(id, request.user.id);
  }
}
```

Create `apps/api/src/modules/workspace-onboarding/workspace-onboarding.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { WorkspaceOnboardingController } from './workspace-onboarding.controller';
import { WorkspaceOnboardingRepository } from './workspace-onboarding.repository';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

@Module({
  controllers: [WorkspaceOnboardingController],
  providers: [WorkspaceOnboardingRepository, WorkspaceOnboardingService],
  exports: [WorkspaceOnboardingService],
})
export class WorkspaceOnboardingModule {}
```

Import the module into `AppModule`. Reuse the repository's existing global authentication guard; do not add a second authentication system.

## 3.6 Session API E2E tests

Create `packages/test-code/api/e2e/workspace-onboarding-sessions.e2e-spec.ts` using the existing Fastify test helper:

```ts
import type { INestApplication } from '@nestjs/common';
import type { FastifyAdapter } from '@nestjs/platform-fastify';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';

describe('Workspace onboarding sessions E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => resetDatabase(prisma));
  afterAll(async () => app.close());

  it('creates, resumes, updates and deletes an owned session', async () => {
    // Replace registerUser with the repository's existing authenticated fixture.
    const owner = await registerUser(app, 'guided-owner@example.test');
    const server = app.getHttpAdapter().getInstance<FastifyAdapter>();

    const created = await server.inject({
      method: 'POST',
      url: '/api/v1/workspace-onboarding/sessions',
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });

    expect(created.statusCode).toBe(201);
    const session = created.json();

    const updated = await server.inject({
      method: 'PATCH',
      url: `/api/v1/workspace-onboarding/sessions/${session.id}/answers`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: {
        answers: {
          workspaceName: 'TodoFlow',
          applicationTypes: ['WEB'],
        },
      },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json().answers.workspaceName).toBe('TodoFlow');

    const resumed = await server.inject({
      method: 'GET',
      url: `/api/v1/workspace-onboarding/sessions/${session.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });

    expect(resumed.statusCode).toBe(200);
    expect(resumed.json().answers.applicationTypes).toEqual(['WEB']);

    const removed = await server.inject({
      method: 'DELETE',
      url: `/api/v1/workspace-onboarding/sessions/${session.id}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });

    expect(removed.statusCode).toBe(204);
  });

  it('does not expose a session to another user', async () => {
    const owner = await registerUser(app, 'guided-owner@example.test');
    const outsider = await registerUser(app, 'guided-outsider@example.test');
    const session = await createSession(app, owner.accessToken);
    const response = await getSession(app, session.id, outsider.accessToken);

    expect(response.statusCode).toBe(404);
  });
});
```

The placeholder fixture functions must be replaced by the exact helpers found during Phase 1.

---

# Phase 4 — Question catalog and conditional flow

## 4.1 Catalog

Create `apps/api/src/modules/workspace-onboarding/questions/question-catalog.ts`:

```ts
import type { WorkspaceOnboardingAnswers, WorkspaceQuestionDefinition } from '@command-center/shared-types';

interface CatalogQuestion extends WorkspaceQuestionDefinition {
  visibleWhen?: (answers: WorkspaceOnboardingAnswers) => boolean;
}

export const QUESTION_CATALOG_VERSION = '1.0.0';

export const questionCatalog: readonly CatalogQuestion[] = [
  {
    key: 'productIdea',
    prompt: 'What are you building?',
    type: 'TEXT',
    required: true,
  },
  {
    key: 'workspaceName',
    prompt: 'What should the workspace be called?',
    type: 'TEXT',
    required: true,
  },
  {
    key: 'productType',
    prompt: 'What type of product is it?',
    type: 'SINGLE_SELECT',
    required: true,
    options: [
      { label: 'Productivity SaaS', value: 'PRODUCTIVITY_SAAS' },
      { label: 'E-commerce', value: 'ECOMMERCE' },
      { label: 'Marketplace', value: 'MARKETPLACE' },
      { label: 'Social product', value: 'SOCIAL' },
      { label: 'Internal tool', value: 'INTERNAL_TOOL' },
      { label: 'Other', value: 'OTHER' },
    ],
  },
  {
    key: 'targetUsers',
    prompt: 'Who will use the product?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Consumers', value: 'CONSUMERS' },
      { label: 'Businesses', value: 'BUSINESSES' },
      { label: 'Internal teams', value: 'INTERNAL_TEAMS' },
      { label: 'Developers', value: 'DEVELOPERS' },
    ],
  },
  {
    key: 'applicationTypes',
    prompt: 'Which applications do you need?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Web', value: 'WEB' },
      { label: 'Mobile', value: 'MOBILE' },
      { label: 'Desktop', value: 'DESKTOP' },
    ],
  },
  {
    key: 'mobilePlatforms',
    prompt: 'Which mobile platforms do you need?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Android', value: 'ANDROID' },
      { label: 'iOS', value: 'IOS' },
    ],
    visibleWhen: (answers) => answers.applicationTypes?.includes('MOBILE') === true,
  },
  {
    key: 'desktopPlatforms',
    prompt: 'Which desktop platforms do you need?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Windows', value: 'WINDOWS' },
      { label: 'macOS', value: 'MACOS' },
      { label: 'Linux', value: 'LINUX' },
    ],
    visibleWhen: (answers) => answers.applicationTypes?.includes('DESKTOP') === true,
  },
  {
    key: 'coreFeatures',
    prompt: 'Which core features are required?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Dashboard', value: 'DASHBOARD' },
      { label: 'Search', value: 'SEARCH' },
      { label: 'Payments', value: 'PAYMENTS' },
      { label: 'Notifications', value: 'NOTIFICATIONS' },
      { label: 'Real-time collaboration', value: 'COLLABORATION' },
    ],
  },
  {
    key: 'authentication',
    prompt: 'Does the product require user accounts?',
    type: 'BOOLEAN',
    required: true,
  },
  {
    key: 'collaboration',
    prompt: 'Does it require real-time collaboration?',
    type: 'BOOLEAN',
    required: false,
    visibleWhen: (answers) => answers.coreFeatures?.includes('COLLABORATION') === true,
  },
  {
    key: 'notifications',
    prompt: 'Which notification channels are required?',
    type: 'MULTI_SELECT',
    required: false,
    options: [
      { label: 'Email', value: 'EMAIL' },
      { label: 'Push', value: 'PUSH' },
      { label: 'In-app', value: 'IN_APP' },
    ],
    visibleWhen: (answers) => answers.coreFeatures?.includes('NOTIFICATIONS') === true,
  },
  {
    key: 'repositories',
    prompt: 'Do repositories already exist?',
    type: 'SINGLE_SELECT',
    required: true,
    options: [
      { label: 'No repositories', value: 'NONE' },
      { label: 'Connect later', value: 'CONNECT_LATER' },
      { label: 'Connect now', value: 'CONNECT_NOW' },
    ],
  },
  {
    key: 'environments',
    prompt: 'Which environments are required?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'Development', value: 'DEVELOPMENT' },
      { label: 'Staging', value: 'STAGING' },
      { label: 'Production', value: 'PRODUCTION' },
    ],
  },
  {
    key: 'qualityRequirements',
    prompt: 'Which engineering systems are required?',
    type: 'MULTI_SELECT',
    required: true,
    options: [
      { label: 'CI/CD', value: 'CI_CD' },
      { label: 'Monitoring', value: 'MONITORING' },
      { label: 'Analytics', value: 'ANALYTICS' },
      { label: 'Performance', value: 'PERFORMANCE' },
      { label: 'Alerts', value: 'ALERTS' },
      { label: 'Security', value: 'SECURITY' },
      { label: 'Backups', value: 'BACKUPS' },
    ],
  },
];
```

## 4.2 Flow service

Create `apps/api/src/modules/workspace-onboarding/questions/question-flow.service.ts`:

```ts
import type { WorkspaceOnboardingAnswers, WorkspaceQuestionFlowResponse } from '@command-center/shared-types';
import { Injectable } from '@nestjs/common';
import { questionCatalog } from './question-catalog';

const dependentKeys: Partial<Record<keyof WorkspaceOnboardingAnswers, (keyof WorkspaceOnboardingAnswers)[]>> = {
  applicationTypes: ['mobilePlatforms', 'desktopPlatforms', 'technologyPreference'],
  coreFeatures: ['collaboration', 'notifications'],
};

@Injectable()
export class QuestionFlowService {
  applicable(answers: WorkspaceOnboardingAnswers) {
    return questionCatalog.filter((question) => !question.visibleWhen || question.visibleWhen(answers)).map(({ visibleWhen: _visibleWhen, ...question }) => question);
  }

  flow(answers: WorkspaceOnboardingAnswers): WorkspaceQuestionFlowResponse {
    const questions = this.applicable(answers);
    const answered = questions.filter(({ key }) => answers[key] !== undefined);
    const currentQuestion = questions.find(({ key }) => answers[key] === undefined) ?? null;

    return {
      questions,
      currentQuestion,
      completed: answered.length,
      total: questions.length,
      percent: questions.length === 0 ? 100 : Math.round((answered.length / questions.length) * 100),
    };
  }

  removeInvalidDependents(previous: WorkspaceOnboardingAnswers, patch: Partial<WorkspaceOnboardingAnswers>): WorkspaceOnboardingAnswers {
    const next = { ...previous, ...patch };

    for (const changedKey of Object.keys(patch) as (keyof WorkspaceOnboardingAnswers)[]) {
      for (const dependentKey of dependentKeys[changedKey] ?? []) {
        delete next[dependentKey];
      }
    }

    const visibleKeys = new Set(this.applicable(next).map(({ key }) => key));

    for (const key of Object.keys(next) as (keyof WorkspaceOnboardingAnswers)[]) {
      if (!visibleKeys.has(key)) {
        delete next[key];
      }
    }

    return next;
  }
}
```

Inject this service into `WorkspaceOnboardingService`, run `removeInvalidDependents()` before validation, and add this controller endpoint:

```ts
@Get(':id/questions')
async questions(
  @Param('id') id: string,
  @Req() request: AuthenticatedRequest,
) {
  const session = await this.service.getOwned(id, request.user.id);
  return this.questionFlow.flow(
    workspaceOnboardingAnswersSchema.parse(session.answers),
  );
}
```

## 4.3 Frontend API client

Create `apps/web/src/features/workspace-onboarding/api/workspace-onboarding-api.ts`:

```ts
import type { WorkspaceOnboardingAnswers, WorkspaceOnboardingSessionResponse, WorkspaceQuestionFlowResponse } from '@command-center/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const workspaceOnboardingApi = {
  create: () =>
    request<WorkspaceOnboardingSessionResponse>('/workspace-onboarding/sessions', {
      method: 'POST',
    }),
  get: (id: string) => request<WorkspaceOnboardingSessionResponse>(`/workspace-onboarding/sessions/${id}`),
  questions: (id: string) => request<WorkspaceQuestionFlowResponse>(`/workspace-onboarding/sessions/${id}/questions`),
  updateAnswers: (id: string, answers: Partial<WorkspaceOnboardingAnswers>) =>
    request<WorkspaceOnboardingSessionResponse>(`/workspace-onboarding/sessions/${id}/answers`, {
      method: 'PATCH',
      body: JSON.stringify({ answers }),
    }),
};
```

Replace the internal `request()` implementation with the authenticated API wrapper found in Phase 1.

## 4.4 Question UI

Create `apps/web/src/features/workspace-onboarding/components/onboarding-question-card.tsx`:

```tsx
'use client';

import type { WorkspaceQuestionDefinition } from '@command-center/shared-types';
import { useState } from 'react';

interface Props {
  question: WorkspaceQuestionDefinition;
  disabled?: boolean;
  onSubmit: (value: unknown) => Promise<void>;
}

export function OnboardingQuestionCard({ question, disabled = false, onSubmit }: Props) {
  const [value, setValue] = useState<unknown>(question.type === 'MULTI_SELECT' ? [] : '');

  const toggle = (option: string) => {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    setValue(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <section aria-labelledby={`question-${question.key}`} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <h2 id={`question-${question.key}`} className='text-lg font-semibold'>
        {question.prompt}
      </h2>

      {question.type === 'TEXT' && (
        <textarea aria-label={question.prompt} className='mt-4 min-h-28 w-full rounded-xl border p-3' disabled={disabled} maxLength={500} onChange={(event) => setValue(event.target.value)} value={String(value)} />
      )}

      {question.type === 'BOOLEAN' && (
        <div className='mt-4 grid grid-cols-2 gap-3'>
          {[true, false].map((option) => (
            <button className='rounded-xl border p-3' disabled={disabled} key={String(option)} onClick={() => setValue(option)} type='button'>
              {option ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      )}

      {(question.type === 'SINGLE_SELECT' || question.type === 'MULTI_SELECT') && (
        <div className='mt-4 grid gap-3 sm:grid-cols-2'>
          {question.options?.map((option) => {
            const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value;

            return (
              <button
                aria-pressed={selected}
                className='rounded-xl border p-3 text-left aria-pressed:border-slate-900 aria-pressed:bg-slate-50'
                disabled={disabled}
                key={option.value}
                onClick={() => (question.type === 'MULTI_SELECT' ? toggle(option.value) : setValue(option.value))}
                type='button'
              >
                <span className='block font-medium'>{option.label}</span>
                {option.description && <span className='text-sm text-slate-600'>{option.description}</span>}
              </button>
            );
          })}
        </div>
      )}

      <button
        className='mt-5 rounded-xl bg-slate-950 px-5 py-3 font-medium text-white disabled:opacity-50'
        disabled={disabled || value === '' || (Array.isArray(value) && value.length === 0)}
        onClick={() => onSubmit(value)}
        type='button'
      >
        Continue
      </button>
    </section>
  );
}
```

Create `apps/web/src/features/workspace-onboarding/components/guided-workspace-builder.tsx`:

```tsx
'use client';

import type { WorkspaceOnboardingSessionResponse, WorkspaceQuestionFlowResponse } from '@command-center/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import { OnboardingQuestionCard } from './onboarding-question-card';

export function GuidedWorkspaceBuilder({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<WorkspaceOnboardingSessionResponse | null>(null);
  const [flow, setFlow] = useState<WorkspaceQuestionFlowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextSession, nextFlow] = await Promise.all([workspaceOnboardingApi.get(sessionId), workspaceOnboardingApi.questions(sessionId)]);
      setSession(nextSession);
      setFlow(nextFlow);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load session');
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <div role='alert'>{error}</div>;
  }

  if (!session || !flow) {
    return <div aria-live='polite'>Loading guided builder…</div>;
  }

  if (!flow.currentQuestion) {
    return <div data-testid='answers-complete'>Answers complete</div>;
  }

  return (
    <main className='mx-auto w-full max-w-3xl p-4 sm:p-8'>
      <header className='mb-6'>
        <p className='text-sm text-slate-600'>
          {flow.completed} of {flow.total} completed
        </p>
        <progress className='mt-2 w-full' max={100} value={flow.percent} />
      </header>

      <OnboardingQuestionCard
        disabled={saving}
        key={flow.currentQuestion.key}
        onSubmit={async (value) => {
          setSaving(true);
          setError(null);

          try {
            await workspaceOnboardingApi.updateAnswers(sessionId, {
              [flow.currentQuestion!.key]: value,
            });
            await load();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Save failed');
          } finally {
            setSaving(false);
          }
        }}
        question={flow.currentQuestion}
      />
    </main>
  );
}
```

Create the route using the repository's actual dynamic-parameter convention:

```tsx
import { GuidedWorkspaceBuilder } from '@/features/workspace-onboarding/components/guided-workspace-builder';

export default async function GuidedSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <GuidedWorkspaceBuilder sessionId={sessionId} />;
}
```

## 4.5 Phase 4 tests

```ts
import { QuestionFlowService } from 'src/modules/workspace-onboarding/questions/question-flow.service';

describe('QuestionFlowService', () => {
  const service = new QuestionFlowService();

  it('shows mobile questions only when mobile is selected', () => {
    expect(service.applicable({ applicationTypes: ['WEB'] }).map(({ key }) => key)).not.toContain('mobilePlatforms');

    expect(service.applicable({ applicationTypes: ['MOBILE'] }).map(({ key }) => key)).toContain('mobilePlatforms');
  });

  it('removes answers made irrelevant by an earlier change', () => {
    const result = service.removeInvalidDependents(
      {
        applicationTypes: ['MOBILE'],
        mobilePlatforms: ['ANDROID'],
      },
      { applicationTypes: ['WEB'] },
    );

    expect(result.mobilePlatforms).toBeUndefined();
  });
});
```

Frontend component test:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { OnboardingQuestionCard } from '@/features/workspace-onboarding/components/onboarding-question-card';

it('submits a multi-select answer', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);

  render(
    <OnboardingQuestionCard
      onSubmit={onSubmit}
      question={{
        key: 'applicationTypes',
        prompt: 'Which applications do you need?',
        type: 'MULTI_SELECT',
        required: true,
        options: [
          { label: 'Web', value: 'WEB' },
          { label: 'Mobile', value: 'MOBILE' },
        ],
      }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Web' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  expect(onSubmit).toHaveBeenCalledWith(['WEB']);
});
```

---

# Phase 5 — Rule engine foundation

## 5.1 Generator contract

Create `apps/api/src/modules/workspace-onboarding/generators/workspace-blueprint-generator.interface.ts`:

```ts
import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';

export const WORKSPACE_BLUEPRINT_GENERATOR = Symbol('WORKSPACE_BLUEPRINT_GENERATOR');

export interface WorkspaceBlueprintGenerator {
  generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint>;
}
```

## 5.2 Rule engine

Create `apps/api/src/modules/workspace-onboarding/rules/rule-engine.ts`:

```ts
import type { WorkspaceBlueprint, WorkspaceBlueprintRecommendation, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { Injectable } from '@nestjs/common';

export interface RuleContext {
  answers: WorkspaceOnboardingAnswers;
}

export type WorkspaceBlueprintDraft = WorkspaceBlueprint;

export interface WorkspaceRule {
  id: string;
  version: string;
  priority: number;
  when(context: RuleContext): boolean;
  apply(draft: WorkspaceBlueprintDraft, context: RuleContext): void;
  explanation: string;
}

@Injectable()
export class WorkspaceRuleEngine {
  apply(initial: WorkspaceBlueprintDraft, context: RuleContext, rules: readonly WorkspaceRule[]): WorkspaceBlueprintDraft {
    const seenPriorities = new Map<number, string>();
    const ordered = [...rules].sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));

    for (const rule of ordered) {
      const previousRule = seenPriorities.get(rule.priority);

      if (previousRule && previousRule !== rule.id) {
        throw new Error(`Rule priority conflict: ${previousRule} and ${rule.id} both use ${rule.priority}`);
      }

      seenPriorities.set(rule.priority, rule.id);

      if (!rule.when(context)) {
        continue;
      }

      rule.apply(initial, context);

      const recommendation: WorkspaceBlueprintRecommendation = {
        id: `${rule.id}:${initial.recommendations.length + 1}`,
        ruleId: rule.id,
        title: rule.id.replaceAll('-', ' '),
        explanation: rule.explanation,
      };

      initial.recommendations.push(recommendation);
    }

    return initial;
  }
}
```

## 5.3 Foundation rules

Create `apps/api/src/modules/workspace-onboarding/rules/foundation.rules.ts`:

```ts
import type { WorkspaceRule } from './rule-engine';

export const foundationRules: readonly WorkspaceRule[] = [
  {
    id: 'web-next-typescript',
    version: '1.0.0',
    priority: 100,
    when: ({ answers }) => answers.applicationTypes?.includes('WEB') === true,
    apply: (draft) => {
      draft.applications.push({
        type: 'WEB',
        name: `${draft.workspace.name} Web`,
        platforms: ['WEB'],
        stack: ['NEXT_JS', 'TYPESCRIPT'],
      });
    },
    explanation: 'Web products use the supported Next.js and TypeScript baseline.',
  },
  {
    id: 'mobile-native-defaults',
    version: '1.0.0',
    priority: 200,
    when: ({ answers }) => answers.applicationTypes?.includes('MOBILE') === true,
    apply: (draft, { answers }) => {
      const platforms = answers.mobilePlatforms?.length ? answers.mobilePlatforms : (['ANDROID', 'IOS'] as const);
      const stack = [...(platforms.includes('ANDROID') ? (['KOTLIN', 'JETPACK_COMPOSE'] as const) : []), ...(platforms.includes('IOS') ? (['SWIFT', 'SWIFTUI'] as const) : [])];

      draft.applications.push({
        type: 'MOBILE',
        name: `${draft.workspace.name} Mobile`,
        platforms: [...platforms],
        stack,
      });
    },
    explanation: 'Native mobile defaults follow the selected Android and iOS platforms.',
  },
  {
    id: 'desktop-tauri-default',
    version: '1.0.0',
    priority: 300,
    when: ({ answers }) => answers.applicationTypes?.includes('DESKTOP') === true,
    apply: (draft, { answers }) => {
      draft.applications.push({
        type: 'DESKTOP',
        name: `${draft.workspace.name} Desktop`,
        platforms: answers.desktopPlatforms?.length ? answers.desktopPlatforms : ['WINDOWS'],
        stack: ['TAURI', 'TYPESCRIPT'],
      });
    },
    explanation: 'Tauri provides the supported lightweight desktop baseline.',
  },
  {
    id: 'core-services',
    version: '1.0.0',
    priority: 400,
    when: () => true,
    apply: (draft) => {
      draft.services.backend = ['NEST_JS'];
      draft.services.database = ['POSTGRESQL'];
    },
    explanation: 'The platform baseline uses NestJS and PostgreSQL.',
  },
  {
    id: 'authentication-service',
    version: '1.0.0',
    priority: 500,
    when: ({ answers }) => answers.authentication === true,
    apply: (draft) => {
      draft.services.authentication = ['EMAIL_PASSWORD'];
    },
    explanation: 'User accounts require an initial email and password authentication method.',
  },
  {
    id: 'realtime-cache',
    version: '1.0.0',
    priority: 600,
    when: ({ answers }) => answers.collaboration === true,
    apply: (draft) => {
      draft.services.cache = ['REDIS'];
    },
    explanation: 'Real-time collaboration uses Redis coordination.',
  },
];
```

## 5.4 Rule-based generator

Create `apps/api/src/modules/workspace-onboarding/generators/rule-based-workspace-blueprint.generator.ts`:

```ts
import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema } from '@command-center/validation';
import { Injectable } from '@nestjs/common';
import type { WorkspaceBlueprintGenerator } from './workspace-blueprint-generator.interface';
import { foundationRules } from '../rules/foundation.rules';
import { WorkspaceRuleEngine } from '../rules/rule-engine';

export const RULE_SET_VERSION = '1.0.0';

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Injectable()
export class RuleBasedWorkspaceBlueprintGenerator implements WorkspaceBlueprintGenerator {
  constructor(private readonly ruleEngine: WorkspaceRuleEngine) {}

  async generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint> {
    const answers = completeWorkspaceOnboardingAnswersSchema.parse(input);

    const initial: WorkspaceBlueprint = {
      schemaVersion: 1,
      generator: {
        provider: 'rules',
        version: RULE_SET_VERSION,
      },
      workspace: {
        name: answers.workspaceName!,
        slug: slugify(answers.workspaceName!),
        description: answers.productIdea!,
        productType: answers.productType!,
      },
      applications: [],
      services: {
        backend: [],
        database: [],
        cache: [],
        authentication: [],
      },
      features: answers.coreFeatures!,
      environments: answers.environments!,
      engineeringSystems: answers.qualityRequirements!,
      recommendations: [],
    };

    const generated = this.ruleEngine.apply(initial, { answers }, foundationRules);

    return workspaceBlueprintSchema.parse(generated);
  }
}
```

## 5.5 Generation service and endpoint

Add to `WorkspaceOnboardingService`:

```ts
async generateBlueprint(id: string, userId: string) {
  const session = await this.getOwned(id, userId);
  const answers = workspaceOnboardingAnswersSchema.parse(session.answers);
  const blueprint = await this.generator.generate(answers);
  const updated = await this.repository.saveBlueprint(
    id,
    blueprint,
    blueprint.generator.version,
  );

  return this.toResponse(updated);
}
```

Inject the generator with the token:

```ts
constructor(
  private readonly repository: WorkspaceOnboardingRepository,
  private readonly questionFlow: QuestionFlowService,
  @Inject(WORKSPACE_BLUEPRINT_GENERATOR)
  private readonly generator: WorkspaceBlueprintGenerator,
) {}
```

Add to the controller:

```ts
@Post(':id/blueprint')
generateBlueprint(
  @Param('id') id: string,
  @Req() request: AuthenticatedRequest,
) {
  return this.service.generateBlueprint(id, request.user.id);
}
```

Update the module:

```ts
@Module({
  controllers: [WorkspaceOnboardingController],
  providers: [
    WorkspaceOnboardingRepository,
    WorkspaceOnboardingService,
    QuestionFlowService,
    WorkspaceRuleEngine,
    RuleBasedWorkspaceBlueprintGenerator,
    {
      provide: WORKSPACE_BLUEPRINT_GENERATOR,
      useExisting: RuleBasedWorkspaceBlueprintGenerator,
    },
  ],
  exports: [WorkspaceOnboardingService],
})
export class WorkspaceOnboardingModule {}
```

Add a generation call to the frontend API client:

```ts
generateBlueprint: (id: string) =>
  request<WorkspaceOnboardingSessionResponse>(
    `/workspace-onboarding/sessions/${id}/blueprint`,
    { method: 'POST' },
  ),
```

When `flow.currentQuestion` becomes `null`, render a button labelled **Generate guided recommendations**. Do not label the rule-based result as AI-generated.

## 5.6 Rule tests

Create `packages/test-code/api/unit/workspace-onboarding/rule-based-generator.spec.ts`:

```ts
import { RuleBasedWorkspaceBlueprintGenerator } from 'src/modules/workspace-onboarding/generators/rule-based-workspace-blueprint.generator';
import { WorkspaceRuleEngine } from 'src/modules/workspace-onboarding/rules/rule-engine';

describe('RuleBasedWorkspaceBlueprintGenerator', () => {
  const generator = new RuleBasedWorkspaceBlueprintGenerator(new WorkspaceRuleEngine());

  const answers = {
    productIdea: 'A cross-platform task management product',
    workspaceName: 'TodoFlow',
    productType: 'PRODUCTIVITY_SAAS' as const,
    targetUsers: ['CONSUMERS'],
    applicationTypes: ['WEB', 'MOBILE', 'DESKTOP'] as const,
    coreFeatures: ['TASKS', 'NOTIFICATIONS'],
    authentication: true,
    collaboration: false,
    notifications: ['PUSH'],
    mobilePlatforms: ['ANDROID', 'IOS'] as const,
    desktopPlatforms: ['WINDOWS'] as const,
    repositories: 'CONNECT_LATER' as const,
    environments: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const,
    qualityRequirements: ['CI_CD', 'MONITORING', 'SECURITY'] as const,
  };

  it('is deterministic for identical input and rule version', async () => {
    const first = await generator.generate(answers);
    const second = await generator.generate(answers);

    expect(first).toEqual(second);
  });

  it('generates one application for each requested type', async () => {
    const blueprint = await generator.generate(answers);

    expect(blueprint.applications.map(({ type }) => type)).toEqual(['WEB', 'MOBILE', 'DESKTOP']);
  });

  it('adds an explanation for every applied rule', async () => {
    const blueprint = await generator.generate(answers);

    expect(blueprint.recommendations.length).toBeGreaterThan(0);
    expect(blueprint.recommendations.every(({ ruleId, explanation }) => ruleId && explanation)).toBe(true);
  });
});

describe('WorkspaceRuleEngine', () => {
  it('rejects duplicate priorities', () => {
    const engine = new WorkspaceRuleEngine();
    const draft = {
      schemaVersion: 1 as const,
      generator: { provider: 'rules' as const, version: '1.0.0' },
      workspace: {
        name: 'Test',
        slug: 'test',
        description: 'Test product',
        productType: 'OTHER' as const,
      },
      applications: [],
      services: { backend: [], database: [], cache: [], authentication: [] },
      features: [],
      environments: ['DEVELOPMENT' as const],
      engineeringSystems: [],
      recommendations: [],
    };

    expect(() =>
      engine.apply(draft, { answers: {} }, [
        {
          id: 'one',
          version: '1',
          priority: 10,
          when: () => true,
          apply: () => undefined,
          explanation: 'one',
        },
        {
          id: 'two',
          version: '1',
          priority: 10,
          when: () => true,
          apply: () => undefined,
          explanation: 'two',
        },
      ]),
    ).toThrow('Rule priority conflict');
  });
});
```

## 5.7 Blueprint API E2E test

```ts
it('generates a deterministic schema-valid blueprint', async () => {
  const owner = await registerUser(app, 'guided-generator@example.test');
  const session = await createSession(app, owner.accessToken);

  await updateAnswers(app, session.id, owner.accessToken, {
    productIdea: 'A task management product',
    workspaceName: 'TodoFlow',
    productType: 'PRODUCTIVITY_SAAS',
    targetUsers: ['CONSUMERS'],
    applicationTypes: ['WEB'],
    coreFeatures: ['TASKS'],
    authentication: true,
    repositories: 'CONNECT_LATER',
    environments: ['DEVELOPMENT', 'PRODUCTION'],
    qualityRequirements: ['CI_CD', 'MONITORING', 'SECURITY'],
  });

  const response = await generateBlueprint(app, session.id, owner.accessToken);

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
    status: 'BLUEPRINT_READY',
    blueprint: {
      schemaVersion: 1,
      generator: { provider: 'rules', version: '1.0.0' },
      workspace: { name: 'TodoFlow', slug: 'todoflow' },
      applications: [
        {
          type: 'WEB',
          platforms: ['WEB'],
          stack: ['NEXT_JS', 'TYPESCRIPT'],
        },
      ],
    },
  });
});
```

---

# Integration order

Do not paste every file simultaneously. Integrate and verify in this order:

1. Finish the Phase 1 mapping and baseline.
2. Add shared contracts and validation schemas.
3. Build shared packages and run schema tests.
4. Add the Prisma model, relations, migration, and generated client.
5. Add repository, session service, controller, and module.
6. Replace authentication and test-fixture placeholders with mapped repository symbols.
7. Run session lifecycle E2E tests.
8. Add question catalog and flow service.
9. Add API client and question UI using the existing authenticated fetch wrapper.
10. Add the rule engine, generator provider, endpoint, and tests.

# Verification commands

```powershell
pnpm build:packages
pnpm --filter @command-center/api typecheck
pnpm --filter @command-center/api-tests typecheck
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web-tests typecheck

pnpm --filter @command-center/api-tests test:unit -- `
  workspace-onboarding `
  rule-based-generator

$env:E2E_WORKERS = '3'
pnpm --filter @command-center/api-tests test:e2e -- `
  workspace-onboarding `
  workspace `
  github-workspace-import
Remove-Item Env:E2E_WORKERS -ErrorAction SilentlyContinue

pnpm --filter @command-center/web-tests test:unit -- `
  unit/features/workspace-onboarding

pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

# Phase 1–5 completion gate

Phases 1–5 are complete only when:

- Existing manual and GitHub workspace creation tests still pass.
- Shared answer and blueprint schemas reject invalid cross-field combinations.
- Session creation, resume, answer update, expiration, deletion, and ownership tests pass.
- Conditional questions respond deterministically to earlier answers.
- Changing an earlier answer removes irrelevant dependent answers.
- Refreshing the route resumes the stored session.
- Rule generation performs no network request.
- Identical answers and rule-set versions generate identical blueprints.
- Every applied rule emits an explanation.
- Invalid generated output is rejected before persistence.
- API and web lint, typecheck, build, unit, and targeted E2E gates pass.

# Deferred work

This code pack intentionally stops before blueprint editing, transactional workspace creation, GitHub mapping, production engineering-system activation, retention jobs, rollout controls, and real-AI providers. Those belong to Phases 6–14 and should not be partially mixed into the Phase 1–5 implementation.
