# SaaS Command Center — Desktop Support Phase 11 Full Implementation

# PHASE 11 — RELEASES & UPDATE CHANNELS

> Assumption: Desktop Phases 1–10 are already applied. This Phase 11 code is written against the Phase 5–10 conventions already established in the prior implementation bundle: NestJS + Prisma backend, Next.js frontend, `@command-center/shared-types`, workspace guards, `DesktopBuild`, artifacts, tests, and `DesktopAppSubNav`.
>
> Verification status: **NOT EXECUTED**. Apply the files, create/apply the migration, then run the commands in section 8 before marking this phase complete.

---

## 1. Existing Code Analysis

Phase 11 adds a desktop-specific release lifecycle on top of the already completed source → build → artifact → test pipeline.

Existing Phase 1–10 systems reused here:

- `DesktopApplication` and workspace-scoped Desktop CRUD.
- `DesktopBuild` and `DesktopBuildStatus.SUCCESS` as the release source.
- `DesktopBuildArtifact` so every release can show the installer/package it came from.
- Existing `JwtAuthGuard`, `WorkspaceAccessGuard`, and `WorkspaceRolesGuard`.
- Existing `DesktopAppsService.findOne()` and `DesktopBuildsService.findOne()` for authoritative workspace scoping.
- Existing `DesktopAppSubNav` and `desktop-apps-api.ts` frontend patterns.
- Existing shared-types package rather than defining frontend-only release contracts.

Phase 11 deliberately does **not** duplicate the generic application release/deployment system or the mobile release implementation. It adds the desktop-specific release metadata required by the desktop plan: update channel, desktop platform, architecture, build linkage, release notes, lifecycle status, and rollback state.

### Files created

```text
apps/api/prisma/models/desktop-release.prisma
apps/api/src/modules/desktop-apps/dto/desktop-release.dto.ts
apps/api/src/modules/desktop-apps/services/desktop-releases.service.ts
apps/api/src/modules/desktop-apps/controllers/desktop-releases.controller.ts
apps/web/src/features/desktop-apps/desktop-release-utils.ts
apps/web/src/features/desktop-apps/desktop-releases.tsx
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/releases/page.tsx
packages/test-code/api/e2e/desktop-releases.e2e-spec.ts
packages/test-code/web/unit/features/desktop-apps/desktop-releases-api.test.ts
packages/test-code/web/unit/features/desktop-apps/desktop-releases.test.tsx
packages/test-code/web/e2e/full-stack/fullstack-desktop-releases.spec.ts
```

### Files modified

```text
apps/api/prisma/models/desktop-application.prisma
apps/api/prisma/models/desktop-build.prisma
apps/api/src/modules/desktop-apps/desktop-apps.module.ts
apps/api/src/modules/desktop-apps/services/desktop-overview.service.ts
packages/shared-types/src/desktop-apps/desktop-app.types.ts
apps/web/src/features/desktop-apps/desktop-apps-api.ts
apps/web/src/features/desktop-apps/desktop-app-sub-nav.tsx
apps/web/src/features/desktop-apps/index.ts
packages/test-code/web/unit/features/desktop-apps/desktop-app-sub-nav.test.tsx
```

---

## 2. Implementation Plan

Phase 11 implements this lifecycle:

```text
Successful Desktop Build
        ↓
Create Desktop Release
        ↓
DRAFT
  ├──→ FAILED
  └──→ READY
          ├──→ FAILED
          └──→ PUBLISHED
                    ↓
               ROLLED_BACK
```

A release inherits `platform` and `architecture` from its build. The browser is not trusted to choose those fields independently. Version and build number default to the build values, but the API permits explicit release overrides when required.

Each build can have one release per update channel:

```text
Build #184 → DEV
           → ALPHA
           → BETA
           → STABLE
           → LTS
```

The unique `(buildId, channel)` constraint keeps release creation idempotent at the database layer while still allowing one build to move through multiple channels.

---

## 3. Backend Implementation

### 3.1 Prisma — new desktop release model

Create:

```text
apps/api/prisma/models/desktop-release.prisma
```

```prisma
enum DesktopReleaseChannel {
  DEV
  ALPHA
  BETA
  STABLE
  LTS
}

enum DesktopReleaseStatus {
  DRAFT
  READY
  PUBLISHED
  FAILED
  ROLLED_BACK
}

model DesktopRelease {
  id           String @id @default(uuid()) @db.Uuid
  workspaceId  String @map("workspace_id") @db.Uuid
  desktopAppId String @map("desktop_app_id") @db.Uuid
  buildId      String @map("build_id") @db.Uuid

  version     String @db.VarChar(64)
  buildNumber String @map("build_number") @db.VarChar(64)

  channel      DesktopReleaseChannel
  platform     DesktopPlatform
  architecture DesktopArchitecture
  status       DesktopReleaseStatus @default(DRAFT)

  releaseNotes String?   @map("release_notes") @db.Text
  releasedAt   DateTime? @map("released_at") @db.Timestamptz(6)

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  desktopApp DesktopApplication @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)
  build      DesktopBuild       @relation(fields: [buildId], references: [id], onDelete: Restrict)

  @@unique([buildId, channel])
  @@index([workspaceId, desktopAppId, createdAt(sort: Desc)])
  @@index([desktopAppId, channel, createdAt(sort: Desc)])
  @@index([desktopAppId, status, createdAt(sort: Desc)])
  @@index([platform, architecture])
  @@map("desktop_releases")
}
```

### 3.2 Prisma — update DesktopApplication relation

In:

```text
apps/api/prisma/models/desktop-application.prisma
```

Add this relation inside `model DesktopApplication` beside the existing `builds` relation:

```prisma
releases DesktopRelease[]
```

The relevant relationship area should end up conceptually like this:

```prisma
model DesktopApplication {
  // existing Phase 1-10 fields...

  builds   DesktopBuild[]
  releases DesktopRelease[]

  // keep every other existing relation unchanged
}
```

### 3.3 Prisma — update DesktopBuild relation

In:

```text
apps/api/prisma/models/desktop-build.prisma
```

Add this relation inside `model DesktopBuild` beside the existing artifact/test relations:

```prisma
releases DesktopRelease[]
```

The relation area should contain the existing relations plus:

```prisma
artifacts DesktopBuildArtifact[]
testRuns  DesktopTestRun[]
releases  DesktopRelease[]
```

Do not delete or rename the Phase 8–10 relations.

---

### 3.4 Release DTOs

Create:

```text
apps/api/src/modules/desktop-apps/dto/desktop-release.dto.ts
```

```ts
import { DesktopArchitecture, DesktopPlatform, DesktopReleaseChannel, DesktopReleaseStatus } from 'src/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreateDesktopReleaseDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  buildId!: string;

  @ApiProperty({
    enum: DesktopReleaseChannel,
  })
  @IsEnum(DesktopReleaseChannel)
  channel!: DesktopReleaseChannel;

  @ApiPropertyOptional({
    example: '2.4.0',
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  version?: string;

  @ApiPropertyOptional({
    example: '184',
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  buildNumber?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 20_000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  releaseNotes?: string | null;
}

export class UpdateDesktopReleaseStatusDto {
  @ApiProperty({
    enum: DesktopReleaseStatus,
  })
  @IsEnum(DesktopReleaseStatus)
  status!: DesktopReleaseStatus;
}

export class DesktopReleaseQueryDto {
  @ApiPropertyOptional({
    enum: DesktopReleaseChannel,
  })
  @IsOptional()
  @IsEnum(DesktopReleaseChannel)
  channel?: DesktopReleaseChannel;

  @ApiPropertyOptional({
    enum: DesktopReleaseStatus,
  })
  @IsOptional()
  @IsEnum(DesktopReleaseStatus)
  status?: DesktopReleaseStatus;

  @ApiPropertyOptional({
    enum: DesktopPlatform,
  })
  @IsOptional()
  @IsEnum(DesktopPlatform)
  platform?: DesktopPlatform;

  @ApiPropertyOptional({
    enum: DesktopArchitecture,
  })
  @IsOptional()
  @IsEnum(DesktopArchitecture)
  architecture?: DesktopArchitecture;
}
```

---

### 3.5 Desktop releases service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-releases.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import { DesktopBuildStatus, DesktopReleaseStatus } from 'src/generated/prisma/enums';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateDesktopReleaseDto, DesktopReleaseQueryDto, UpdateDesktopReleaseStatusDto } from '../dto/desktop-release.dto';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopBuildsService } from './desktop-builds.service';

@Injectable()
export class DesktopReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly desktopBuilds: DesktopBuildsService,
  ) {}

  async create(workspaceId: string, desktopAppId: string, dto: CreateDesktopReleaseDto) {
    const desktopApp = await this.desktopApps.findOne(workspaceId, desktopAppId);

    if (desktopApp.application.archivedAt) {
      throw new BadRequestException('Archived desktop applications cannot create releases.');
    }

    const build = await this.desktopBuilds.findOne(workspaceId, desktopAppId, dto.buildId);

    if (build.status !== DesktopBuildStatus.SUCCESS) {
      throw new BadRequestException('Only successful desktop builds can be released.');
    }

    const version = this.requiredText(dto.version) ?? this.requiredText(build.version);

    if (!version) {
      throw new BadRequestException('Release version is required. Add a version to the build or provide one when creating the release.');
    }

    const buildNumber = this.requiredText(dto.buildNumber) ?? this.requiredText(build.buildNumber);

    if (!buildNumber) {
      throw new BadRequestException('Release build number is required. Add a build number to the build or provide one when creating the release.');
    }

    const existing = await this.prisma.desktopRelease.findFirst({
      where: {
        buildId: build.id,
        channel: dto.channel,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('This desktop build already has a release for the selected update channel.');
    }

    const release = await this.prisma.desktopRelease.create({
      data: {
        workspaceId,
        desktopAppId,
        buildId: build.id,
        version,
        buildNumber,
        channel: dto.channel,
        platform: build.platform,
        architecture: build.architecture,
        status: DesktopReleaseStatus.DRAFT,
        releaseNotes: this.optionalText(dto.releaseNotes),
      },
      include: this.releaseInclude(),
    });

    return this.serialize(release);
  }

  async list(workspaceId: string, desktopAppId: string, query: DesktopReleaseQueryDto) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const releases = await this.prisma.desktopRelease.findMany({
      where: {
        workspaceId,
        desktopAppId,
        ...(query.channel
          ? {
              channel: query.channel,
            }
          : {}),
        ...(query.status
          ? {
              status: query.status,
            }
          : {}),
        ...(query.platform
          ? {
              platform: query.platform,
            }
          : {}),
        ...(query.architecture
          ? {
              architecture: query.architecture,
            }
          : {}),
      },
      include: this.releaseInclude(),
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: 200,
    });

    return releases.map((release) => this.serialize(release));
  }

  async findOne(workspaceId: string, desktopAppId: string, releaseId: string) {
    const release = await this.prisma.desktopRelease.findFirst({
      where: {
        id: releaseId,
        workspaceId,
        desktopAppId,
      },
      include: this.releaseInclude(),
    });

    if (!release) {
      throw new NotFoundException('Desktop release not found.');
    }

    return this.serialize(release);
  }

  async updateStatus(workspaceId: string, desktopAppId: string, releaseId: string, dto: UpdateDesktopReleaseStatusDto) {
    const current = await this.prisma.desktopRelease.findFirst({
      where: {
        id: releaseId,
        workspaceId,
        desktopAppId,
      },
      select: {
        id: true,
        status: true,
        releasedAt: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Desktop release not found.');
    }

    if (current.status === dto.status) {
      return this.findOne(workspaceId, desktopAppId, releaseId);
    }

    this.assertTransition(current.status, dto.status);

    const updated = await this.prisma.desktopRelease.update({
      where: {
        id: current.id,
      },
      data: {
        status: dto.status,
        releasedAt: dto.status === DesktopReleaseStatus.PUBLISHED ? (current.releasedAt ?? new Date()) : current.releasedAt,
      },
      include: this.releaseInclude(),
    });

    return this.serialize(updated);
  }

  async getLatestPublished(workspaceId: string, desktopAppId: string) {
    const release = await this.prisma.desktopRelease.findFirst({
      where: {
        workspaceId,
        desktopAppId,
        status: DesktopReleaseStatus.PUBLISHED,
      },
      include: this.releaseInclude(),
      orderBy: [
        {
          releasedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    return release ? this.serialize(release) : null;
  }

  private assertTransition(current: DesktopReleaseStatus, next: DesktopReleaseStatus): void {
    const allowed: Record<DesktopReleaseStatus, DesktopReleaseStatus[]> = {
      DRAFT: [DesktopReleaseStatus.READY, DesktopReleaseStatus.FAILED],
      READY: [DesktopReleaseStatus.PUBLISHED, DesktopReleaseStatus.FAILED],
      PUBLISHED: [DesktopReleaseStatus.ROLLED_BACK],
      FAILED: [],
      ROLLED_BACK: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Invalid desktop release transition: ${current} -> ${next}`);
    }
  }

  private requiredText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private optionalText(value: string | null | undefined): string | null {
    return this.requiredText(value);
  }

  private releaseInclude() {
    return {
      build: {
        include: {
          artifacts: {
            orderBy: {
              createdAt: 'asc' as const,
            },
          },
        },
      },
    };
  }

  private serialize<
    T extends {
      build: {
        artifacts: Array<{
          sizeBytes: bigint | null;
        }>;
      };
    },
  >(release: T) {
    return {
      ...release,
      build: {
        ...release.build,
        artifacts: release.build.artifacts.map((artifact) => ({
          ...artifact,
          sizeBytes: artifact.sizeBytes === null ? null : Number(artifact.sizeBytes),
        })),
      },
    };
  }
}
```

### Why the serializer is required

`DesktopBuildArtifact.sizeBytes` is stored as `BigInt`. Returning raw Prisma artifacts through JSON can throw because JavaScript JSON serialization does not support `bigint`. Phase 11 converts it to a number before returning the build/artifact/release traceability payload.

---

### 3.6 Desktop releases controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-releases.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateDesktopReleaseDto, DesktopReleaseQueryDto, UpdateDesktopReleaseStatusDto } from '../dto/desktop-release.dto';
import { DesktopReleasesService } from '../services/desktop-releases.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Releases')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/releases')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopReleasesController {
  constructor(private readonly service: DesktopReleasesService) {}

  @Get()
  @ApiOperation({
    summary: 'List desktop releases',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Query()
    query: DesktopReleaseQueryDto,
  ) {
    return this.service.list(workspaceId, desktopAppId, query);
  }

  @Get(':releaseId')
  @ApiOperation({
    summary: 'Get a desktop release',
  })
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('releaseId', ParseUUIDPipe)
    releaseId: string,
  ) {
    return this.service.findOne(workspaceId, desktopAppId, releaseId);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Create a desktop release from a successful build',
  })
  create(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Body()
    dto: CreateDesktopReleaseDto,
  ) {
    return this.service.create(workspaceId, desktopAppId, dto);
  }

  @Patch(':releaseId/status')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Transition a desktop release status',
  })
  updateStatus(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,

    @Param('releaseId', ParseUUIDPipe)
    releaseId: string,

    @Body()
    dto: UpdateDesktopReleaseStatusDto,
  ) {
    return this.service.updateStatus(workspaceId, desktopAppId, releaseId, dto);
  }
}
```

---

### 3.7 Update Desktop overview with latest published release

Replace the Phase 6 overview service with this final Phase 11 version:

```text
apps/api/src/modules/desktop-apps/services/desktop-overview.service.ts
```

```ts
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopBuildsService } from './desktop-builds.service';
import { DesktopReleasesService } from './desktop-releases.service';
import { DesktopRepositoryService } from './desktop-repository.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DesktopOverviewService {
  constructor(
    private readonly desktopApps: DesktopAppsService,
    private readonly desktopRepositories: DesktopRepositoryService,
    private readonly desktopBuilds: DesktopBuildsService,
    private readonly desktopReleases: DesktopReleasesService,
  ) {}

  async get(workspaceId: string, desktopAppId: string) {
    const desktopApp = await this.desktopApps.findOne(workspaceId, desktopAppId);

    const [repository, latestBuild, latestRelease] = await Promise.all([
      this.desktopRepositories.getLinkedRepository(workspaceId, desktopAppId),
      this.desktopBuilds.getLatest(workspaceId, desktopAppId),
      this.desktopReleases.getLatestPublished(workspaceId, desktopAppId),
    ]);

    return {
      desktopApp,
      repository,
      latestBuild,
      latestRelease,
      latestPerformance: null,
    };
  }
}
```

This removes the old direct Prisma build lookup and reuses the already-authorized Phase 8 build service.

---

### 3.8 Register Phase 11 in DesktopAppsModule

Update:

```text
apps/api/src/modules/desktop-apps/desktop-apps.module.ts
```

Add imports:

```ts
import { DesktopReleasesController } from './controllers/desktop-releases.controller';
import { DesktopReleasesService } from './services/desktop-releases.service';
```

Then add the controller/service without removing any Phase 1–10 registration:

```ts
@Module({
  imports: [DatabaseModule, WorkspaceMembersModule, ActivityModule, RepositoriesModule],

  controllers: [
    DesktopAppsController,
    DesktopRepositoriesController,
    DesktopProjectDetectionController,
    DesktopOverviewController,
    DesktopBuildsController,
    DesktopBuildArtifactsController,
    DesktopTestsController,
    DesktopReleasesController,
  ],

  providers: [DesktopAppsService, DesktopRepositoryService, DesktopProjectDetectionService, DesktopBuildsService, DesktopBuildArtifactsService, DesktopTestsService, DesktopReleasesService, DesktopOverviewService],

  exports: [DesktopAppsService, DesktopRepositoryService, DesktopBuildsService, DesktopTestsService, DesktopReleasesService],
})
export class DesktopAppsModule {}
```

Important: if your actual module has extra Phase 1–10 providers/controllers, keep them. Only add the two Phase 11 classes and ensure `DesktopReleasesService` is declared before `DesktopOverviewService` in the provider list for readability; Nest DI does not require provider order.

---

## 4. Frontend Implementation

### 4.1 Desktop release utility

Create:

```text
apps/web/src/features/desktop-apps/desktop-release-utils.ts
```

```ts
import type { DesktopRelease, DesktopReleaseChannel, DesktopReleaseStatus } from '@command-center/shared-types';

export const DESKTOP_RELEASE_CHANNEL_LABELS: Record<DesktopReleaseChannel, string> = {
  DEV: 'Dev',
  ALPHA: 'Alpha',
  BETA: 'Beta',
  STABLE: 'Stable',
  LTS: 'LTS',
};

export const DESKTOP_RELEASE_STATUS_LABELS: Record<DesktopReleaseStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
  ROLLED_BACK: 'Rolled Back',
};

export function nextDesktopReleaseActions(status: DesktopReleaseStatus): Array<{
  label: string;
  status: DesktopReleaseStatus;
}> {
  switch (status) {
    case 'DRAFT':
      return [
        {
          label: 'Mark Ready',
          status: 'READY',
        },
        {
          label: 'Mark Failed',
          status: 'FAILED',
        },
      ];

    case 'READY':
      return [
        {
          label: 'Publish',
          status: 'PUBLISHED',
        },
        {
          label: 'Mark Failed',
          status: 'FAILED',
        },
      ];

    case 'PUBLISHED':
      return [
        {
          label: 'Roll Back',
          status: 'ROLLED_BACK',
        },
      ];

    case 'FAILED':
    case 'ROLLED_BACK':
      return [];
  }
}

export function formatReleaseTarget(release: Pick<DesktopRelease, 'platform' | 'architecture'>): string {
  const platform = release.platform === 'MACOS' ? 'macOS' : release.platform === 'WINDOWS' ? 'Windows' : release.platform === 'LINUX' ? 'Linux' : 'Cross-platform';

  const architecture = release.architecture === 'ARM64' ? 'arm64' : release.architecture === 'X64' ? 'x64' : release.architecture === 'X86' ? 'x86' : 'Universal';

  return `${platform} • ${architecture}`;
}

export function formatReleaseDate(value: string | null): string {
  if (!value) {
    return 'Not published';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
```

---

### 4.2 Extend Desktop API client

Update:

```text
apps/web/src/features/desktop-apps/desktop-apps-api.ts
```

Add these types to the existing `@command-center/shared-types` import:

```ts
import type { CreateDesktopReleaseInput, DesktopRelease, DesktopReleaseFilters, DesktopReleaseStatus } from '@command-center/shared-types';
```

Append these functions:

```ts
export function listDesktopReleases(workspaceId: string, desktopAppId: string, filters: DesktopReleaseFilters = {}) {
  const search = new URLSearchParams();

  if (filters.channel) {
    search.set('channel', filters.channel);
  }

  if (filters.status) {
    search.set('status', filters.status);
  }

  if (filters.platform) {
    search.set('platform', filters.platform);
  }

  if (filters.architecture) {
    search.set('architecture', filters.architecture);
  }

  const query = search.toString();

  return apiRequest<DesktopRelease[]>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases${query ? `?${query}` : ''}`);
}

export function getDesktopRelease(workspaceId: string, desktopAppId: string, releaseId: string) {
  return apiRequest<DesktopRelease>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases/${releaseId}`);
}

export function createDesktopRelease(workspaceId: string, desktopAppId: string, input: CreateDesktopReleaseInput) {
  return apiRequest<DesktopRelease>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateDesktopReleaseStatus(workspaceId: string, desktopAppId: string, releaseId: string, status: DesktopReleaseStatus) {
  return apiRequest<DesktopRelease>(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases/${releaseId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
    }),
  });
}
```

Do not create a second API client file unless your existing desktop feature has already been split. This keeps Phase 11 consistent with Phases 5–10.

---

### 4.3 Releases UI

Create:

```text
apps/web/src/features/desktop-apps/desktop-releases.tsx
```

```tsx
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { createDesktopRelease, listDesktopBuilds, listDesktopReleases, updateDesktopReleaseStatus } from './desktop-apps-api';
import { DESKTOP_RELEASE_CHANNEL_LABELS, DESKTOP_RELEASE_STATUS_LABELS, formatReleaseDate, formatReleaseTarget, nextDesktopReleaseActions } from './desktop-release-utils';
import { shortSha } from './desktop-build-utils';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { CreateDesktopReleaseInput, DesktopArchitecture, DesktopBuild, DesktopPlatform, DesktopRelease, DesktopReleaseChannel, DesktopReleaseFilters, DesktopReleaseStatus } from '@command-center/shared-types';
import { AlertTriangle, CheckCircle2, ExternalLink, PackageCheck, RefreshCw, RotateCcw, Rocket } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

const CHANNELS: DesktopReleaseChannel[] = ['DEV', 'ALPHA', 'BETA', 'STABLE', 'LTS'];

const STATUSES: DesktopReleaseStatus[] = ['DRAFT', 'READY', 'PUBLISHED', 'FAILED', 'ROLLED_BACK'];

const PLATFORMS: DesktopPlatform[] = ['WINDOWS', 'MACOS', 'LINUX', 'CROSS_PLATFORM'];

const ARCHITECTURES: DesktopArchitecture[] = ['X64', 'ARM64', 'X86', 'UNIVERSAL'];

function releaseStatusClasses(status: DesktopReleaseStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'READY':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'FAILED':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'ROLLED_BACK':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'DRAFT':
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

function buildLabel(build: DesktopBuild): string {
  const version = build.version ?? 'No version';
  const number = build.buildNumber ? ` #${build.buildNumber}` : '';

  return `${version}${number} • ${build.platform} • ${build.architecture} • ${shortSha(build.commitSha)}`;
}

export function DesktopReleases({ workspaceId, desktopAppId }: Props) {
  const [releases, setReleases] = useState<DesktopRelease[]>([]);
  const [successfulBuilds, setSuccessfulBuilds] = useState<DesktopBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [filters, setFilters] = useState<DesktopReleaseFilters>({});

  const [buildId, setBuildId] = useState('');
  const [channel, setChannel] = useState<DesktopReleaseChannel>('STABLE');
  const [version, setVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [releaseRows, builds] = await Promise.all([
        listDesktopReleases(workspaceId, desktopAppId, filters),
        listDesktopBuilds(workspaceId, desktopAppId, {
          status: 'SUCCESS',
        }),
      ]);

      setReleases(releaseRows);
      setSuccessfulBuilds(builds);
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedBuild = useMemo(() => successfulBuilds.find((build) => build.id === buildId) ?? null, [successfulBuilds, buildId]);

  useEffect(() => {
    if (!selectedBuild) {
      return;
    }

    setVersion(selectedBuild.version ?? '');
    setBuildNumber(selectedBuild.buildNumber ?? '');
  }, [selectedBuild]);

  const availableBuilds = useMemo(() => {
    const used = new Set(releases.filter((release) => release.channel === channel).map((release) => release.buildId));

    return successfulBuilds.filter((build) => !used.has(build.id));
  }, [successfulBuilds, releases, channel]);

  async function submitRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!buildId) {
      setActionError('Select a successful build.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    const payload: CreateDesktopReleaseInput = {
      buildId,
      channel,
      ...(version.trim()
        ? {
            version: version.trim(),
          }
        : {}),
      ...(buildNumber.trim()
        ? {
            buildNumber: buildNumber.trim(),
          }
        : {}),
      ...(releaseNotes.trim()
        ? {
            releaseNotes: releaseNotes.trim(),
          }
        : {}),
    };

    try {
      await createDesktopRelease(workspaceId, desktopAppId, payload);

      setBuildId('');
      setVersion('');
      setBuildNumber('');
      setReleaseNotes('');
      setShowCreateForm(false);

      await load();
    } catch (caughtError: unknown) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function transition(release: DesktopRelease, status: DesktopReleaseStatus) {
    const confirmed = window.confirm(status === 'ROLLED_BACK' ? `Roll back ${release.version} on ${DESKTOP_RELEASE_CHANNEL_LABELS[release.channel]}?` : `${DESKTOP_RELEASE_STATUS_LABELS[status]} ${release.version}?`);

    if (!confirmed) {
      return;
    }

    setTransitioningId(release.id);
    setActionError(null);

    try {
      await updateDesktopReleaseStatus(workspaceId, desktopAppId, release.id, status);

      await load();
    } catch (caughtError: unknown) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setTransitioningId(null);
    }
  }

  if (loading) {
    return (
      <section aria-label='Desktop releases loading' className='space-y-4'>
        <div className='h-28 animate-pulse rounded-2xl bg-slate-100' />
        <div className='h-44 animate-pulse rounded-2xl bg-slate-100' />
        <div className='h-44 animate-pulse rounded-2xl bg-slate-100' />
      </section>
    );
  }

  if (error) {
    return (
      <section className='rounded-2xl border border-red-200 bg-red-50 p-6'>
        <div className='flex items-start gap-3'>
          <AlertTriangle className='mt-0.5 h-5 w-5 text-red-600' />
          <div className='min-w-0 flex-1'>
            <h2 className='font-semibold text-red-900'>Releases could not be loaded</h2>
            <p className='mt-1 text-sm text-red-700'>{error}</p>
            <button type='button' onClick={() => void load()} className='mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100'>
              <RefreshCw className='h-4 w-4' />
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <Rocket className='h-5 w-5 text-slate-700' />
            <h2 className='text-lg font-semibold text-slate-950'>Desktop Releases</h2>
          </div>
          <p className='mt-1 text-sm text-slate-600'>Promote successful builds through Dev, Alpha, Beta, Stable, and LTS update channels.</p>
        </div>

        <button
          type='button'
          onClick={() => {
            setActionError(null);
            setShowCreateForm((current) => !current);
          }}
          className='inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800'
        >
          <PackageCheck className='h-4 w-4' />
          {showCreateForm ? 'Close Form' : 'Create Release'}
        </button>
      </div>

      {actionError ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {actionError}
        </div>
      ) : null}

      {showCreateForm ? (
        <form onSubmit={submitRelease} className='space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div>
            <h3 className='font-semibold text-slate-950'>Create release from successful build</h3>
            <p className='mt-1 text-sm text-slate-600'>Platform and architecture are inherited from the selected build and cannot be forged by the browser.</p>
          </div>

          <div className='grid gap-4 lg:grid-cols-2'>
            <label className='space-y-1.5 text-sm font-medium text-slate-700'>
              <span>Successful build</span>
              <select aria-label='Successful build' value={buildId} onChange={(event) => setBuildId(event.target.value)} required className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'>
                <option value=''>Select build</option>
                {availableBuilds.map((build) => (
                  <option key={build.id} value={build.id}>
                    {buildLabel(build)}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1.5 text-sm font-medium text-slate-700'>
              <span>Update channel</span>
              <select
                aria-label='Update channel'
                value={channel}
                onChange={(event) => setChannel(event.target.value as DesktopReleaseChannel)}
                className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
              >
                {CHANNELS.map((value) => (
                  <option key={value} value={value}>
                    {DESKTOP_RELEASE_CHANNEL_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1.5 text-sm font-medium text-slate-700'>
              <span>Version</span>
              <input
                aria-label='Release version'
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                maxLength={64}
                placeholder='Defaults to build version'
                className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              />
            </label>

            <label className='space-y-1.5 text-sm font-medium text-slate-700'>
              <span>Build number</span>
              <input
                aria-label='Release build number'
                value={buildNumber}
                onChange={(event) => setBuildNumber(event.target.value)}
                maxLength={64}
                placeholder='Defaults to build number'
                className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              />
            </label>
          </div>

          {selectedBuild ? (
            <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'>
              <div className='font-semibold text-slate-900'>Build source</div>
              <div className='mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                <span>{selectedBuild.platform}</span>
                <span>{selectedBuild.architecture}</span>
                <span>{selectedBuild.branch}</span>
                <span>{shortSha(selectedBuild.commitSha)}</span>
              </div>
            </div>
          ) : null}

          <label className='block space-y-1.5 text-sm font-medium text-slate-700'>
            <span>Release notes</span>
            <textarea
              aria-label='Release notes'
              value={releaseNotes}
              onChange={(event) => setReleaseNotes(event.target.value)}
              maxLength={20_000}
              rows={5}
              placeholder='What changed in this desktop release?'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
            />
          </label>

          <div className='flex flex-wrap gap-3'>
            <button
              type='submit'
              disabled={submitting || !buildId}
              className='inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {submitting ? 'Creating...' : 'Create Desktop Release'}
            </button>

            <button type='button' onClick={() => setShowCreateForm(false)} className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className='grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <select
          aria-label='Release channel filter'
          value={filters.channel ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              channel: (event.target.value as DesktopReleaseChannel) || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All channels</option>
          {CHANNELS.map((value) => (
            <option key={value} value={value}>
              {DESKTOP_RELEASE_CHANNEL_LABELS[value]}
            </option>
          ))}
        </select>

        <select
          aria-label='Release status filter'
          value={filters.status ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: (event.target.value as DesktopReleaseStatus) || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {DESKTOP_RELEASE_STATUS_LABELS[value]}
            </option>
          ))}
        </select>

        <select
          aria-label='Release platform filter'
          value={filters.platform ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              platform: (event.target.value as DesktopPlatform) || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All platforms</option>
          {PLATFORMS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          aria-label='Release architecture filter'
          value={filters.architecture ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              architecture: (event.target.value as DesktopArchitecture) || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All architectures</option>
          {ARCHITECTURES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {releases.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center'>
          <Rocket className='mx-auto h-8 w-8 text-slate-400' />
          <h3 className='mt-3 font-semibold text-slate-950'>No desktop releases yet</h3>
          <p className='mx-auto mt-1 max-w-xl text-sm text-slate-600'>Create a release from a successful desktop build. The release will keep its build, commit, target, and artifact history traceable.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {releases.map((release) => {
            const actions = nextDesktopReleaseActions(release.status);
            const busy = transitioningId === release.id;

            return (
              <article key={release.id} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='text-lg font-semibold text-slate-950'>{release.version}</h3>

                      <span className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700'>{DESKTOP_RELEASE_CHANNEL_LABELS[release.channel]}</span>

                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${releaseStatusClasses(release.status)}`}>{DESKTOP_RELEASE_STATUS_LABELS[release.status]}</span>
                    </div>

                    <div className='mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600'>
                      <span>{formatReleaseTarget(release)}</span>
                      <span>Build #{release.buildNumber}</span>
                      <span>Branch {release.build.branch}</span>
                      <span>Commit {shortSha(release.build.commitSha)}</span>
                    </div>

                    <p className='mt-2 text-xs text-slate-500'>Published: {formatReleaseDate(release.releasedAt)}</p>
                  </div>

                  {actions.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {actions.map((action) => (
                        <button
                          key={action.status}
                          type='button'
                          disabled={busy}
                          onClick={() => void transition(release, action.status)}
                          className='inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {action.status === 'ROLLED_BACK' ? <RotateCcw className='h-4 w-4' /> : action.status === 'PUBLISHED' ? <Rocket className='h-4 w-4' /> : <CheckCircle2 className='h-4 w-4' />}
                          {busy ? 'Updating...' : action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {release.releaseNotes ? (
                  <div className='mt-4 rounded-xl bg-slate-50 p-4'>
                    <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Release notes</div>
                    <p className='mt-2 whitespace-pre-wrap text-sm text-slate-700'>{release.releaseNotes}</p>
                  </div>
                ) : null}

                <div className='mt-4 border-t border-slate-100 pt-4'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h4 className='text-sm font-semibold text-slate-900'>Source → Build → Artifact → Release</h4>
                    <span className='text-xs text-slate-500'>Workflow run {release.build.workflowRunId}</span>
                  </div>

                  {release.build.artifacts.length === 0 ? (
                    <p className='mt-3 text-sm text-slate-500'>This release is traceable to its build, but that build has no artifact metadata recorded.</p>
                  ) : (
                    <ul className='mt-3 grid gap-2 md:grid-cols-2'>
                      {release.build.artifacts.map((artifact) => (
                        <li key={artifact.id} className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0'>
                              <div className='truncate text-sm font-semibold text-slate-900'>{artifact.fileName}</div>
                              <div className='mt-1 text-xs text-slate-500'>
                                {artifact.type} • {artifact.platform} • {artifact.architecture}
                              </div>
                            </div>

                            {artifact.externalUrl ? (
                              <a href={artifact.externalUrl} target='_blank' rel='noreferrer' aria-label={`Open ${artifact.fileName}`} className='rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-slate-900'>
                                <ExternalLink className='h-4 w-4' />
                              </a>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
```

---

### 4.4 Releases page route

Create:

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/releases/page.tsx
```

```tsx
'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopReleases } from '@/features/desktop-apps/desktop-releases';
import { useParams } from 'next/navigation';

export default function DesktopReleasesPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header>
        <p className='text-sm font-medium text-slate-500'>Desktop Application</p>
        <h1 className='mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'>Releases & Update Channels</h1>
        <p className='mt-2 max-w-3xl text-sm text-slate-600'>Track versioned desktop releases across Dev, Alpha, Beta, Stable, and LTS channels while preserving the exact build and artifact source.</p>
      </header>

      <DesktopAppSubNav workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />

      <DesktopReleases workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />
    </main>
  );
}
```

---

### 4.5 Make Releases a live Desktop tab

Replace the constants in:

```text
apps/web/src/features/desktop-apps/desktop-app-sub-nav.tsx
```

with:

```tsx
const LIVE_TABS = [
  {
    label: 'Overview',
    path: '',
  },
  {
    label: 'Code',
    path: '/code',
  },
  {
    label: 'Builds',
    path: '/builds',
  },
  {
    label: 'Tests',
    path: '/tests',
  },
  {
    label: 'Releases',
    path: '/releases',
  },
] as const;

const FUTURE_TABS = ['Performance', 'Crashes', 'Dependencies', 'Security'] as const;
```

Keep the remainder of the existing Phase 6 `DesktopAppSubNav` component unchanged.

---

### 4.6 Export the Phase 11 frontend feature

Update:

```text
apps/web/src/features/desktop-apps/index.ts
```

Keep all existing exports and add:

```ts
export * from './desktop-release-utils';
export * from './desktop-releases';
```

---

## 5. Shared Types / Contracts

Update:

```text
packages/shared-types/src/desktop-apps/desktop-app.types.ts
```

Append:

```ts
export type DesktopReleaseChannel = 'DEV' | 'ALPHA' | 'BETA' | 'STABLE' | 'LTS';

export type DesktopReleaseStatus = 'DRAFT' | 'READY' | 'PUBLISHED' | 'FAILED' | 'ROLLED_BACK';

export interface DesktopReleaseBuildSummary extends DesktopBuild {
  artifacts: DesktopBuildArtifact[];
}

export interface DesktopRelease {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  buildId: string;
  version: string;
  buildNumber: string;
  channel: DesktopReleaseChannel;
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  status: DesktopReleaseStatus;
  releaseNotes: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  build: DesktopReleaseBuildSummary;
}

export interface DesktopReleaseFilters {
  channel?: DesktopReleaseChannel;
  status?: DesktopReleaseStatus;
  platform?: DesktopPlatform;
  architecture?: DesktopArchitecture;
}

export interface CreateDesktopReleaseInput {
  buildId: string;
  channel: DesktopReleaseChannel;
  version?: string;
  buildNumber?: string;
  releaseNotes?: string | null;
}
```

Then update the existing Phase 6 overview type from:

```ts
latestRelease: null;
```

to:

```ts
latestRelease: DesktopRelease | null;
```

Final relevant overview contract:

```ts
export interface DesktopAppOverview {
  desktopApp: DesktopApplicationDetails;
  repository: DesktopOverviewRepository | null;
  latestBuild: DesktopBuild | null;
  latestRelease: DesktopRelease | null;
  latestPerformance: null;
}
```

The package root should already export this desktop file from Phase 1. Do not add a duplicate export if it is already present:

```ts
export * from './desktop-apps/desktop-app.types';
```

---

## 6. Database / Migration

### 6.1 Generate the migration

After adding the Prisma model/relations:

```powershell
pnpm --dir apps/api exec prisma format
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate dev --name desktop_release_channels
pnpm --dir apps/api exec prisma generate
```

### 6.2 Expected migration SQL

Let Prisma generate the actual timestamped migration directory. Its SQL should be equivalent to the following PostgreSQL migration:

```sql
CREATE TYPE "DesktopReleaseChannel" AS ENUM (
  'DEV',
  'ALPHA',
  'BETA',
  'STABLE',
  'LTS'
);

CREATE TYPE "DesktopReleaseStatus" AS ENUM (
  'DRAFT',
  'READY',
  'PUBLISHED',
  'FAILED',
  'ROLLED_BACK'
);

CREATE TABLE "desktop_releases" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "desktop_app_id" UUID NOT NULL,
  "build_id" UUID NOT NULL,
  "version" VARCHAR(64) NOT NULL,
  "build_number" VARCHAR(64) NOT NULL,
  "channel" "DesktopReleaseChannel" NOT NULL,
  "platform" "DesktopPlatform" NOT NULL,
  "architecture" "DesktopArchitecture" NOT NULL,
  "status" "DesktopReleaseStatus" NOT NULL DEFAULT 'DRAFT',
  "release_notes" TEXT,
  "released_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "desktop_releases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "desktop_releases_build_id_channel_key"
  ON "desktop_releases"("build_id", "channel");

CREATE INDEX "desktop_releases_workspace_id_desktop_app_id_created_at_idx"
  ON "desktop_releases"("workspace_id", "desktop_app_id", "created_at" DESC);

CREATE INDEX "desktop_releases_desktop_app_id_channel_created_at_idx"
  ON "desktop_releases"("desktop_app_id", "channel", "created_at" DESC);

CREATE INDEX "desktop_releases_desktop_app_id_status_created_at_idx"
  ON "desktop_releases"("desktop_app_id", "status", "created_at" DESC);

CREATE INDEX "desktop_releases_platform_architecture_idx"
  ON "desktop_releases"("platform", "architecture");

ALTER TABLE "desktop_releases"
  ADD CONSTRAINT "desktop_releases_desktop_app_id_fkey"
  FOREIGN KEY ("desktop_app_id")
  REFERENCES "desktop_applications"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "desktop_releases"
  ADD CONSTRAINT "desktop_releases_build_id_fkey"
  FOREIGN KEY ("build_id")
  REFERENCES "desktop_builds"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
```

Do **not** hand-name a migration with an arbitrary timestamp if your repository already has newer migrations. Use Prisma to generate the timestamped folder, then review its SQL against the above intent.

---

## 7. Tests

### 7.1 API E2E — Desktop Releases

Create:

```text
packages/test-code/api/e2e/desktop-releases.e2e-spec.ts
```

This reuses the `desktop-test-fixtures.ts` helper already created for Phases 5–10 instead of introducing another fixture system.

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { buildPath, createLinkedDesktopFixture, ingestSuccessfulBuild } from './helpers/desktop-test-fixtures';

const API = '/api/v1';

describe('Desktop Releases E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  async function createSuccessfulFixture() {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const artifactResponse = await fixture.owner.agent
      .post(`${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/${build.id}/artifacts`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: `phase11-artifact-${Date.now()}`,
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'command-center-1.0.0-x64.msi',
        sizeBytes: 88_000_000,
        checksum: 'sha256:phase11',
        externalUrl: 'https://example.test/artifacts/command-center-1.0.0-x64.msi',
      });

    expect(artifactResponse.status).toBe(201);

    return {
      ...fixture,
      build,
      artifact: artifactResponse.body as {
        id: string;
        fileName: string;
      },
    };
  }

  function releasePath(workspaceId: string, desktopAppId: string) {
    return `${API}/workspaces/${workspaceId}` + `/desktop-apps/${desktopAppId}/releases`;
  }

  async function createRelease(fixture: Awaited<ReturnType<typeof createSuccessfulFixture>>, overrides: Record<string, unknown> = {}) {
    return fixture.owner.agent
      .post(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        buildId: fixture.build.id,
        channel: 'STABLE',
        ...overrides,
      });
  }

  it('rejects anonymous release access', async () => {
    const fixture = await createSuccessfulFixture();

    await fixture.owner.agent.get(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)).expect(401);
  });

  it('creates a release from a successful build and inherits target metadata', async () => {
    const fixture = await createSuccessfulFixture();

    const response = await createRelease(fixture, {
      releaseNotes: 'Stable desktop release',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      workspaceId: fixture.owner.workspaceId,
      desktopAppId: fixture.desktopApp.id,
      buildId: fixture.build.id,
      version: '1.0.0',
      buildNumber: '100',
      channel: 'STABLE',
      platform: 'WINDOWS',
      architecture: 'X64',
      status: 'DRAFT',
      releaseNotes: 'Stable desktop release',
      releasedAt: null,
    });
  });

  it('returns source build and artifact traceability', async () => {
    const fixture = await createSuccessfulFixture();

    const response = await createRelease(fixture);

    expect(response.status).toBe(201);
    expect(response.body.build).toMatchObject({
      id: fixture.build.id,
      workflowRunId: fixture.build.workflowRunId,
    });
    expect(response.body.build.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fixture.artifact.id,
          fileName: fixture.artifact.fileName,
          sizeBytes: 88_000_000,
        }),
      ]),
    );
  });

  it('rejects a failed build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const failedBuildResponse = await fixture.owner.agent
      .post(`${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        repositoryId: fixture.repository.id,
        workflowRunId: `phase11-failed-${Date.now()}`,
        commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        branch: 'main',
        version: '1.0.1',
        buildNumber: '101',
        platform: 'WINDOWS',
        architecture: 'X64',
        status: 'FAILED',
        startedAt: '2026-08-23T01:00:00.000Z',
        completedAt: '2026-08-23T01:02:00.000Z',
      });

    expect(failedBuildResponse.status).toBe(201);

    await fixture.owner.agent
      .post(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        buildId: failedBuildResponse.body.build.id,
        channel: 'BETA',
      })
      .expect(400);
  });

  it('rejects a nonexistent build', async () => {
    const fixture = await createSuccessfulFixture();

    await fixture.owner.agent
      .post(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        buildId: '11111111-1111-4111-8111-111111111111',
        channel: 'BETA',
      })
      .expect(404);
  });

  it('persists explicit version, build number, and update channel', async () => {
    const fixture = await createSuccessfulFixture();

    const response = await createRelease(fixture, {
      channel: 'BETA',
      version: '2.5.0-beta.2',
      buildNumber: '190',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      version: '2.5.0-beta.2',
      buildNumber: '190',
      channel: 'BETA',
    });
  });

  it('rejects an invalid update channel', async () => {
    const fixture = await createSuccessfulFixture();

    await createRelease(fixture, {
      channel: 'PRODUCTION',
    }).expect(400);
  });

  it('allows the same build in different channels and rejects duplicate build/channel', async () => {
    const fixture = await createSuccessfulFixture();

    await createRelease(fixture, {
      channel: 'BETA',
    }).expect(201);

    await createRelease(fixture, {
      channel: 'BETA',
    }).expect(409);

    await createRelease(fixture, {
      channel: 'STABLE',
    }).expect(201);
  });

  it('transitions DRAFT -> READY -> PUBLISHED -> ROLLED_BACK', async () => {
    const fixture = await createSuccessfulFixture();
    const created = await createRelease(fixture);

    expect(created.status).toBe(201);

    const path = `${releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)}/${created.body.id}/status`;

    await fixture.owner.agent.patch(path).set('Authorization', `Bearer ${fixture.owner.accessToken}`).send({ status: 'READY' }).expect(200);

    const published = await fixture.owner.agent.patch(path).set('Authorization', `Bearer ${fixture.owner.accessToken}`).send({ status: 'PUBLISHED' }).expect(200);

    expect(published.body.status).toBe('PUBLISHED');
    expect(published.body.releasedAt).not.toBeNull();

    const rolledBack = await fixture.owner.agent.patch(path).set('Authorization', `Bearer ${fixture.owner.accessToken}`).send({ status: 'ROLLED_BACK' }).expect(200);

    expect(rolledBack.body.status).toBe('ROLLED_BACK');
    expect(rolledBack.body.releasedAt).toBe(published.body.releasedAt);
  });

  it('rejects invalid lifecycle transitions', async () => {
    const fixture = await createSuccessfulFixture();
    const created = await createRelease(fixture);

    expect(created.status).toBe(201);

    await fixture.owner.agent
      .patch(`${releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)}/${created.body.id}/status`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(400);
  });

  it('keeps repeated same-status updates idempotent', async () => {
    const fixture = await createSuccessfulFixture();
    const created = await createRelease(fixture);

    expect(created.status).toBe(201);

    const response = await fixture.owner.agent
      .patch(`${releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)}/${created.body.id}/status`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({ status: 'DRAFT' })
      .expect(200);

    expect(response.body.status).toBe('DRAFT');
  });

  it('rejects a build belonging to another workspace', async () => {
    const first = await createSuccessfulFixture();
    const second = await createSuccessfulFixture();

    await first.owner.agent
      .post(releasePath(first.owner.workspaceId, first.desktopApp.id))
      .set('Authorization', `Bearer ${first.owner.accessToken}`)
      .send({
        buildId: second.build.id,
        channel: 'STABLE',
      })
      .expect(404);
  });

  it('rejects a user from another workspace', async () => {
    const fixture = await createSuccessfulFixture();
    const outsider = await registerWorkspaceTestUser(app, prisma);

    await outsider.agent.get(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)).set('Authorization', `Bearer ${outsider.accessToken}`).expect(403);
  });

  it('rejects cross-workspace release lookup', async () => {
    const first = await createSuccessfulFixture();
    const second = await createSuccessfulFixture();
    const created = await createRelease(second);

    expect(created.status).toBe(201);

    await first.owner.agent
      .get(`${releasePath(first.owner.workspaceId, first.desktopApp.id)}/${created.body.id}`)
      .set('Authorization', `Bearer ${first.owner.accessToken}`)
      .expect(404);
  });

  it('orders release history newest first', async () => {
    const fixture = await createSuccessfulFixture();

    const first = await createRelease(fixture, {
      channel: 'BETA',
    });
    const second = await createRelease(fixture, {
      channel: 'STABLE',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    await prisma.desktopRelease.update({
      where: { id: first.body.id },
      data: {
        createdAt: new Date('2026-08-23T01:00:00.000Z'),
      },
    });

    await prisma.desktopRelease.update({
      where: { id: second.body.id },
      data: {
        createdAt: new Date('2026-08-23T02:00:00.000Z'),
      },
    });

    const list = await fixture.owner.agent.get(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)).set('Authorization', `Bearer ${fixture.owner.accessToken}`).expect(200);

    expect(list.body.map((item: { id: string }) => item.id)).toEqual([second.body.id, first.body.id]);
  });

  it('filters release history by channel/status/platform/architecture', async () => {
    const fixture = await createSuccessfulFixture();

    await createRelease(fixture, {
      channel: 'BETA',
    }).expect(201);
    await createRelease(fixture, {
      channel: 'STABLE',
    }).expect(201);

    const response = await fixture.owner.agent
      .get(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .query({
        channel: 'STABLE',
        status: 'DRAFT',
        platform: 'WINDOWS',
        architecture: 'X64',
      })
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      channel: 'STABLE',
      status: 'DRAFT',
      platform: 'WINDOWS',
      architecture: 'X64',
    });
  });

  it('rejects release creation for an archived desktop application', async () => {
    const fixture = await createSuccessfulFixture();

    const archiveResponse = await fixture.owner.agent.delete(`${API}/workspaces/${fixture.owner.workspaceId}` + `/desktop-apps/${fixture.desktopApp.id}`).set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect([200, 204]).toContain(archiveResponse.status);

    await createRelease(fixture).expect(400);
  });
});
```

The cross-workspace tests deliberately use both the workspace guard (`403` for a user who is not a member) and resource scoping (`404` when a foreign release/build ID is presented inside an authorized workspace).

---

### 7.2 Frontend API-client test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-releases-api.test.ts
```

```ts
import { createDesktopRelease, getDesktopRelease, listDesktopReleases, updateDesktopReleaseStatus } from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const requestMock = vi.mocked(apiRequest);
const workspaceId = 'workspace-1';
const desktopAppId = 'desktop-1';
const releaseId = 'release-1';

describe('desktop release API client', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue(undefined);
  });

  it('lists releases with filters', async () => {
    await listDesktopReleases(workspaceId, desktopAppId, {
      channel: 'STABLE',
      status: 'PUBLISHED',
      platform: 'WINDOWS',
      architecture: 'X64',
    });

    const url = requestMock.mock.calls[0]?.[0] as string;

    expect(url).toContain(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases?`);
    expect(url).toContain('channel=STABLE');
    expect(url).toContain('status=PUBLISHED');
    expect(url).toContain('platform=WINDOWS');
    expect(url).toContain('architecture=X64');
  });

  it('gets one release', async () => {
    await getDesktopRelease(workspaceId, desktopAppId, releaseId);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases/${releaseId}`);
  });

  it('creates a release', async () => {
    const input = {
      buildId: 'build-1',
      channel: 'BETA',
      version: '2.5.0-beta.2',
      releaseNotes: 'Beta candidate',
    } as const;

    await createDesktopRelease(workspaceId, desktopAppId, input);

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('updates lifecycle status', async () => {
    await updateDesktopReleaseStatus(workspaceId, desktopAppId, releaseId, 'PUBLISHED');

    expect(requestMock).toHaveBeenCalledWith(`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases/${releaseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'PUBLISHED',
      }),
    });
  });
});
```

---

### 7.3 Frontend Releases component test

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-releases.test.tsx
```

```tsx
// @vitest-environment jsdom

import { DesktopReleases } from '@/features/desktop-apps/desktop-releases';
import { createDesktopRelease, listDesktopBuilds, listDesktopReleases, updateDesktopReleaseStatus } from '@/features/desktop-apps/desktop-apps-api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  createDesktopRelease: vi.fn(),
  listDesktopBuilds: vi.fn(),
  listDesktopReleases: vi.fn(),
  updateDesktopReleaseStatus: vi.fn(),
}));

const listReleasesMock = vi.mocked(listDesktopReleases);
const listBuildsMock = vi.mocked(listDesktopBuilds);
const createReleaseMock = vi.mocked(createDesktopRelease);
const updateStatusMock = vi.mocked(updateDesktopReleaseStatus);

const build = {
  id: 'build-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  repositoryId: 'repo-1',
  workflowRunId: '184',
  source: 'GITHUB_ACTIONS',
  commitSha: 'abcdef1234567890',
  branch: 'main',
  version: '2.4.0',
  buildNumber: '184',
  platform: 'WINDOWS',
  architecture: 'X64',
  status: 'SUCCESS',
  startedAt: '2026-08-23T01:00:00.000Z',
  completedAt: '2026-08-23T01:04:00.000Z',
  durationMs: 240000,
  createdAt: '2026-08-23T01:00:00.000Z',
  updatedAt: '2026-08-23T01:04:00.000Z',
} as const;

const release = {
  id: 'release-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  buildId: 'build-1',
  version: '2.4.0',
  buildNumber: '184',
  channel: 'STABLE',
  platform: 'WINDOWS',
  architecture: 'X64',
  status: 'PUBLISHED',
  releaseNotes: 'Stable release notes',
  releasedAt: '2026-08-23T02:00:00.000Z',
  createdAt: '2026-08-23T01:30:00.000Z',
  updatedAt: '2026-08-23T02:00:00.000Z',
  build: {
    ...build,
    artifacts: [
      {
        id: 'artifact-1',
        buildId: 'build-1',
        providerArtifactId: 'provider-artifact-1',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'command-center-2.4.0-x64.msi',
        sizeBytes: 88_000_000,
        checksum: 'sha256:test',
        externalUrl: 'https://example.test/app.msi',
        createdAt: '2026-08-23T01:05:00.000Z',
      },
    ],
  },
} as const;

describe('DesktopReleases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    listBuildsMock.mockResolvedValue([build] as never);
    listReleasesMock.mockResolvedValue([] as never);
    createReleaseMock.mockResolvedValue(release as never);
    updateStatusMock.mockResolvedValue(release as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders the empty release state', async () => {
    render(<DesktopReleases workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('No desktop releases yet')).toBeInTheDocument();
  });

  it('creates a release from a successful build', async () => {
    const user = userEvent.setup();

    render(<DesktopReleases workspaceId='workspace-1' desktopAppId='desktop-1' />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Create Release',
      }),
    );

    await user.selectOptions(screen.getByLabelText('Successful build'), 'build-1');

    await user.selectOptions(screen.getByLabelText('Update channel'), 'STABLE');

    await user.type(screen.getByLabelText('Release notes'), 'Ship stable build');

    await user.click(
      screen.getByRole('button', {
        name: 'Create Desktop Release',
      }),
    );

    await waitFor(() => {
      expect(createReleaseMock).toHaveBeenCalledWith(
        'workspace-1',
        'desktop-1',
        expect.objectContaining({
          buildId: 'build-1',
          channel: 'STABLE',
          version: '2.4.0',
          buildNumber: '184',
          releaseNotes: 'Ship stable build',
        }),
      );
    });
  });

  it('renders source -> build -> artifact -> release traceability', async () => {
    listReleasesMock.mockResolvedValue([release] as never);

    render(<DesktopReleases workspaceId='workspace-1' desktopAppId='desktop-1' />);

    expect(await screen.findByText('2.4.0')).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('command-center-2.4.0-x64.msi')).toBeInTheDocument();
    expect(screen.getByText('Source → Build → Artifact → Release')).toBeInTheDocument();
  });

  it('rolls back a published release', async () => {
    listReleasesMock.mockResolvedValue([release] as never);

    render(<DesktopReleases workspaceId='workspace-1' desktopAppId='desktop-1' />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Roll Back',
      }),
    );

    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalledWith('workspace-1', 'desktop-1', 'release-1', 'ROLLED_BACK');
    });
  });
});
```

---

### 7.4 Update Desktop sub-navigation test

Update:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-app-sub-nav.test.tsx
```

The final assertions for Phase 11 should include:

```tsx
it('renders Phase 5-11 live tabs', () => {
  render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

  expect(screen.getByText('Overview')).toBeInTheDocument();
  expect(screen.getByText('Code')).toBeInTheDocument();
  expect(screen.getByText('Builds')).toBeInTheDocument();
  expect(screen.getByText('Tests')).toBeInTheDocument();
  expect(screen.getByText('Releases')).toBeInTheDocument();
});

it('links Releases to the desktop release route', () => {
  render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

  expect(
    screen.getByRole('link', {
      name: 'Releases',
    }),
  ).toHaveAttribute('href', '/workspaces/workspace-1/desktop-apps/desktop-1/releases');
});

it('keeps only Phase 12+ tabs disabled', () => {
  render(<DesktopAppSubNav workspaceId='workspace-1' desktopAppId='desktop-1' />);

  expect(screen.queryByRole('link', { name: 'Performance' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Crashes' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Dependencies' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Security' })).not.toBeInTheDocument();
});
```

Keep the existing `// @vitest-environment jsdom` line and `next/navigation` mock from Phase 6.

---

### 7.5 Full-stack Playwright UI test

Create:

```text
packages/test-code/web/e2e/full-stack/fullstack-desktop-releases.spec.ts
```

```ts
import { authorizedApiRequest, loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type APIRequestContext, type Route } from '@playwright/test';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

async function createDesktopApp(request: APIRequestContext) {
  const response = await authorizedApiRequest(request, state, state.owner.accessToken, `/workspaces/${state.owner.workspaceId}/desktop-apps`, {
    method: 'POST',
    data: {
      name: uniqueValue('Phase 11 Desktop', state.runId),
      platform: 'WINDOWS',
      framework: 'ELECTRON',
      architecture: 'X64',
      packageName: `com.commandcenter.phase11.${Date.now()}`,
      currentVersion: '2.4.0',
      currentBuildNumber: '184',
    },
  });

  expect(response.status()).toBe(201);

  return (await response.json()) as {
    id: string;
  };
}

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  });
}

test.describe('Desktop Phase 11 releases frontend', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('creates, publishes, and rolls back a desktop release in the real frontend', async ({ page, request }) => {
    await loginThroughUi(page, state.owner);

    const desktop = await createDesktopApp(request);

    const build = {
      id: '11111111-1111-4111-8111-111111111111',
      workspaceId: state.owner.workspaceId,
      desktopAppId: desktop.id,
      repositoryId: '22222222-2222-4222-8222-222222222222',
      workflowRunId: '184',
      source: 'GITHUB_ACTIONS',
      commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
      branch: 'main',
      version: '2.4.0',
      buildNumber: '184',
      platform: 'WINDOWS',
      architecture: 'X64',
      status: 'SUCCESS',
      startedAt: '2026-08-23T01:00:00.000Z',
      completedAt: '2026-08-23T01:04:00.000Z',
      durationMs: 240000,
      createdAt: '2026-08-23T01:00:00.000Z',
      updatedAt: '2026-08-23T01:04:00.000Z',
    };

    const artifact = {
      id: '33333333-3333-4333-8333-333333333333',
      buildId: build.id,
      providerArtifactId: 'artifact-184',
      platform: 'WINDOWS',
      architecture: 'X64',
      type: 'MSI',
      fileName: 'command-center-2.4.0-x64.msi',
      sizeBytes: 88_000_000,
      checksum: 'sha256:phase11',
      externalUrl: 'https://example.test/command-center.msi',
      createdAt: '2026-08-23T01:05:00.000Z',
    };

    type Release = {
      id: string;
      workspaceId: string;
      desktopAppId: string;
      buildId: string;
      version: string;
      buildNumber: string;
      channel: 'STABLE';
      platform: 'WINDOWS';
      architecture: 'X64';
      status: 'DRAFT' | 'READY' | 'PUBLISHED' | 'ROLLED_BACK';
      releaseNotes: string | null;
      releasedAt: string | null;
      createdAt: string;
      updatedAt: string;
      build: typeof build & {
        artifacts: Array<typeof artifact>;
      };
    };

    let releases: Release[] = [];

    const apiBase = `/api/v1/workspaces/${state.owner.workspaceId}` + `/desktop-apps/${desktop.id}`;

    await page.route(`**${apiBase}/builds*`, async (route) => {
      if (route.request().method() === 'GET') {
        await json(route, [build]);
        return;
      }

      await route.fallback();
    });

    await page.route(`**${apiBase}/releases*`, async (route) => {
      const method = route.request().method();
      const url = new URL(route.request().url());
      const statusMatch = url.pathname.match(/\/releases\/([^/]+)\/status$/);

      if (method === 'GET') {
        await json(route, releases);
        return;
      }

      if (method === 'POST') {
        const input = route.request().postDataJSON() as {
          buildId: string;
          channel: 'STABLE';
          version?: string;
          buildNumber?: string;
          releaseNotes?: string;
        };

        const created: Release = {
          id: '44444444-4444-4444-8444-444444444444',
          workspaceId: state.owner.workspaceId,
          desktopAppId: desktop.id,
          buildId: input.buildId,
          version: input.version ?? '2.4.0',
          buildNumber: input.buildNumber ?? '184',
          channel: input.channel,
          platform: 'WINDOWS',
          architecture: 'X64',
          status: 'DRAFT',
          releaseNotes: input.releaseNotes ?? null,
          releasedAt: null,
          createdAt: '2026-08-23T02:00:00.000Z',
          updatedAt: '2026-08-23T02:00:00.000Z',
          build: {
            ...build,
            artifacts: [artifact],
          },
        };

        releases = [created];
        await json(route, created, 201);
        return;
      }

      if (method === 'PATCH' && statusMatch) {
        const input = route.request().postDataJSON() as {
          status: Release['status'];
        };

        releases = releases.map((release) =>
          release.id === statusMatch[1]
            ? {
                ...release,
                status: input.status,
                releasedAt: input.status === 'PUBLISHED' ? '2026-08-23T02:10:00.000Z' : release.releasedAt,
                updatedAt: '2026-08-23T02:10:00.000Z',
              }
            : release,
        );

        await json(route, releases[0]);
        return;
      }

      await route.fallback();
    });

    await page.goto(`/workspaces/${state.owner.workspaceId}` + `/desktop-apps/${desktop.id}/releases`);

    await expect(
      page.getByRole('heading', {
        name: 'Releases & Update Channels',
      }),
    ).toBeVisible();

    await expect(page.getByText('No desktop releases yet')).toBeVisible();

    await page
      .getByRole('button', {
        name: 'Create Release',
      })
      .click();

    await page.getByLabel('Successful build').selectOption(build.id);

    await page.getByLabel('Update channel').selectOption('STABLE');

    await page.getByLabel('Release notes').fill('Phase 11 stable release');

    await page
      .getByRole('button', {
        name: 'Create Desktop Release',
      })
      .click();

    await expect(page.getByText('2.4.0')).toBeVisible();
    await expect(page.getByText('Draft')).toBeVisible();
    await expect(page.getByText('command-center-2.4.0-x64.msi')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', {
        name: 'Mark Ready',
      })
      .click();
    await expect(page.getByText('Ready')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', {
        name: 'Publish',
      })
      .click();
    await expect(page.getByText('Published')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', {
        name: 'Roll Back',
      })
      .click();
    await expect(page.getByText('Rolled Back')).toBeVisible();
  });
});
```

This browser test intentionally mocks only Phase 11 build/release transport so the UI test remains deterministic. The API E2E suite above is the authoritative persistence, workspace-isolation, validation, and lifecycle test.

---

## 8. Commands

Run from the repository root in this order.

### 8.1 Format Phase 11 code

```powershell
pnpm exec prettier --write `
  "apps/api/prisma/models/desktop-release.prisma" `
  "apps/api/prisma/models/desktop-application.prisma" `
  "apps/api/prisma/models/desktop-build.prisma" `
  "apps/api/src/modules/desktop-apps/dto/desktop-release.dto.ts" `
  "apps/api/src/modules/desktop-apps/services/desktop-releases.service.ts" `
  "apps/api/src/modules/desktop-apps/controllers/desktop-releases.controller.ts" `
  "apps/api/src/modules/desktop-apps/services/desktop-overview.service.ts" `
  "apps/api/src/modules/desktop-apps/desktop-apps.module.ts" `
  "packages/shared-types/src/desktop-apps/desktop-app.types.ts" `
  "apps/web/src/features/desktop-apps/desktop-apps-api.ts" `
  "apps/web/src/features/desktop-apps/desktop-app-sub-nav.tsx" `
  "apps/web/src/features/desktop-apps/desktop-release-utils.ts" `
  "apps/web/src/features/desktop-apps/desktop-releases.tsx" `
  "apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/releases/page.tsx" `
  "packages/test-code/api/e2e/desktop-releases.e2e-spec.ts" `
  "packages/test-code/web/unit/features/desktop-apps/desktop-releases-api.test.ts" `
  "packages/test-code/web/unit/features/desktop-apps/desktop-releases.test.tsx" `
  "packages/test-code/web/unit/features/desktop-apps/desktop-app-sub-nav.test.tsx" `
  "packages/test-code/web/e2e/full-stack/fullstack-desktop-releases.spec.ts"
```

### 8.2 Prisma validation/migration

```powershell
pnpm --dir apps/api exec prisma format
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate dev --name desktop_release_channels
pnpm --dir apps/api exec prisma generate
pnpm --dir apps/api exec prisma migrate status
```

### 8.3 Shared types

```powershell
pnpm --filter @command-center/shared-types run build
```

### 8.4 API typecheck/build

```powershell
pnpm --filter @command-center/api run typecheck
pnpm --filter @command-center/api run build
```

If your API package does not expose `typecheck`, use the already-established repo command:

```powershell
pnpm --dir apps/api exec tsc --noEmit
```

### 8.5 Web typecheck/build

```powershell
pnpm --filter @command-center/web run typecheck
pnpm --filter @command-center/web run build
```

### 8.6 Phase 11 API E2E

Use the same API E2E config that your Phase 1–10 Desktop tests already use. Based on the existing repo convention:

```powershell
pnpm --filter @command-center/api-tests exec jest `
  --config ../../packages/test-code/api/jest-e2e.config.cjs `
  --runInBand `
  e2e/desktop-releases.e2e-spec.ts
```

If your working Phase 10 command uses `--runTestsByPath`, keep that convention:

```powershell
pnpm --filter @command-center/api-tests exec jest `
  --config ../../packages/test-code/api/jest-e2e.config.cjs `
  --runInBand `
  --runTestsByPath e2e/desktop-releases.e2e-spec.ts
```

### 8.7 Frontend unit tests

```powershell
pnpm --filter @command-center/web-tests exec vitest run `
  unit/features/desktop-apps/desktop-releases-api.test.ts `
  unit/features/desktop-apps/desktop-releases.test.tsx `
  unit/features/desktop-apps/desktop-app-sub-nav.test.tsx
```

### 8.8 Browser E2E

```powershell
pnpm --filter @command-center/web-tests exec playwright test `
  e2e/full-stack/fullstack-desktop-releases.spec.ts `
  --config=playwright.fullstack.config.ts `
  --workers=1
```

If your actual full-stack config has a different filename, use the exact config already passing for Desktop Phase 10.

### 8.9 Lint

```powershell
pnpm run lint
```

### 8.10 Regression

At minimum rerun the Desktop Phase 8–10 suites plus Phase 11:

```powershell
pnpm --filter @command-center/api-tests exec jest `
  --config ../../packages/test-code/api/jest-e2e.config.cjs `
  --runInBand `
  e2e/desktop-builds.e2e-spec.ts `
  e2e/desktop-build-artifacts.e2e-spec.ts `
  e2e/desktop-tests.e2e-spec.ts `
  e2e/desktop-releases.e2e-spec.ts
```

Then run the repository's full test command before considering Phase 11 complete:

```powershell
pnpm run test:all
```

---

## 9. Verification

Phase 11 should be considered complete only after all of these are confirmed locally:

```text
[ ] Prisma schema validates
[ ] Migration applies cleanly on the test/local database
[ ] Prisma client generates
[ ] Shared types build
[ ] API typecheck passes
[ ] Web typecheck passes
[ ] API build passes
[ ] Web production build passes
[ ] Desktop release API E2E passes
[ ] Release creation requires successful build
[ ] Version/build number persist correctly
[ ] Channel persists correctly
[ ] DRAFT -> READY -> PUBLISHED -> ROLLED_BACK works
[ ] Invalid status transition is rejected
[ ] Duplicate build/channel is rejected safely
[ ] Cross-workspace build release is rejected
[ ] Cross-workspace release access is rejected
[ ] Viewer can read but cannot mutate
[ ] Archived desktop app cannot create release
[ ] Release history is newest-first
[ ] Artifact BigInt serializes safely
[ ] Releases frontend loading state works
[ ] Releases empty state works
[ ] Releases error/retry state works
[ ] Create Release form works
[ ] Filters work
[ ] Release lifecycle buttons work
[ ] Source -> build -> artifact -> release is visible
[ ] Releases tab does not route to 404
[ ] Desktop Phase 8-10 regression remains green
[ ] Existing mobile/web/API/app/repository features remain green
[ ] Lint/format pass
[ ] No provider/updater secrets are exposed
```

---

## 10. Changed Files

```text
NEW
---
apps/api/prisma/models/desktop-release.prisma
apps/api/src/modules/desktop-apps/dto/desktop-release.dto.ts
apps/api/src/modules/desktop-apps/services/desktop-releases.service.ts
apps/api/src/modules/desktop-apps/controllers/desktop-releases.controller.ts
apps/web/src/features/desktop-apps/desktop-release-utils.ts
apps/web/src/features/desktop-apps/desktop-releases.tsx
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/releases/page.tsx
packages/test-code/api/e2e/desktop-releases.e2e-spec.ts
packages/test-code/web/unit/features/desktop-apps/desktop-releases-api.test.ts
packages/test-code/web/unit/features/desktop-apps/desktop-releases.test.tsx
packages/test-code/web/e2e/full-stack/fullstack-desktop-releases.spec.ts

MODIFY
------
apps/api/prisma/models/desktop-application.prisma
apps/api/prisma/models/desktop-build.prisma
apps/api/src/modules/desktop-apps/desktop-apps.module.ts
apps/api/src/modules/desktop-apps/services/desktop-overview.service.ts
packages/shared-types/src/desktop-apps/desktop-app.types.ts
apps/web/src/features/desktop-apps/desktop-apps-api.ts
apps/web/src/features/desktop-apps/desktop-app-sub-nav.tsx
apps/web/src/features/desktop-apps/index.ts
packages/test-code/web/unit/features/desktop-apps/desktop-app-sub-nav.test.tsx
```

---

## 11. Phase Status

```text
PHASE 11 — RELEASES & UPDATE CHANNELS
------------------------------------
Backend:        NOT EXECUTED
Frontend:       NOT EXECUTED
Shared Types:   NOT EXECUTED
Database:       NOT EXECUTED
Unit Tests:     NOT EXECUTED
API E2E:        NOT EXECUTED
Frontend Tests: NOT EXECUTED
Browser E2E:    NOT EXECUTED
Typecheck:      NOT EXECUTED
Build:          NOT EXECUTED
Lint:           NOT EXECUTED
Security:       NOT EXECUTED

Overall: UNVERIFIED
```

Do not change these statuses to PASS until the actual repository commands complete successfully.

---

# Phase 11 Result

After verification, the Desktop Application flow becomes:

```text
Repository
   ↓
Desktop Build
   ↓
Build Artifact
   ↓
Desktop Release
   ├── DEV
   ├── ALPHA
   ├── BETA
   ├── STABLE
   └── LTS
         ↓
DRAFT → READY → PUBLISHED → ROLLED_BACK
```

This is the required foundation for Phase 12 telemetry and later Phase 13 runtime health because crashes/performance can now be correlated to a concrete released desktop version, target platform, architecture, and update channel.
