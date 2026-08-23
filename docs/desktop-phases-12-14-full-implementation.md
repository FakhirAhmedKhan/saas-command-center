# SaaS Command Center — Desktop Support
## Phases 12–14 Full Backend + Frontend + Testing Implementation

**Assumption:** Desktop Phases 1–11 are already implemented and passing. This bundle continues the conventions established in the previous implementation files: NestJS + Prisma, Next.js, `@command-center/shared-types`, workspace-scoped authorization, `DesktopApplication`, `DesktopBuild`, `DesktopBuildArtifact`, `DesktopTestRun`, `DesktopRelease`, `DesktopAppSubNav`, linked repositories, and the existing GitHub Code Explorer services.

> Verification status: **NOT EXECUTED**. The code below is designed as a concrete implementation bundle, but it has not been executed against the user's local repository. Apply each phase in order and run its verification before marking it PASS.

The source plan defines these phases as:

```text
Phase 12 → Telemetry Foundation
Phase 13 → Performance & Crash Monitoring
Phase 14 → Dependency & Security Health
```

The implementation keeps secrets backend-only, scopes every desktop resource by workspace, reuses the existing repository/GitHub stack, and does not add a duplicate Code Explorer or GitHub integration.

---

# 0. Final File Map

```text
packages/shared-types/src/desktop-apps/
└── desktop-app.types.ts                                      UPDATE

apps/api/prisma/models/
├── desktop-application.prisma                               UPDATE
├── desktop-telemetry.prisma                                 NEW
├── desktop-runtime.prisma                                   NEW
└── desktop-security-health.prisma                           NEW

apps/api/src/modules/desktop-apps/
├── controllers/
│   ├── desktop-telemetry.controller.ts                      NEW
│   ├── desktop-performance.controller.ts                    NEW
│   ├── desktop-crashes.controller.ts                        NEW
│   └── desktop-security-health.controller.ts                NEW
├── dto/
│   ├── desktop-telemetry.dto.ts                             NEW
│   ├── desktop-runtime.dto.ts                               NEW
│   └── desktop-security-health.dto.ts                       NEW
├── services/
│   ├── desktop-telemetry-secret.service.ts                  NEW
│   ├── desktop-telemetry-url-policy.service.ts              NEW
│   ├── desktop-telemetry-provider-registry.service.ts       NEW
│   ├── desktop-telemetry.service.ts                         NEW
│   ├── desktop-runtime.service.ts                           NEW
│   ├── desktop-performance.service.ts                       NEW
│   ├── desktop-crashes.service.ts                           NEW
│   ├── desktop-repository-metadata.service.ts               NEW
│   ├── desktop-dependency-health.service.ts                 NEW
│   └── desktop-security.service.ts                          NEW
├── telemetry/
│   ├── desktop-telemetry-provider.interface.ts              NEW
│   └── normalized-http-desktop-telemetry.provider.ts        NEW
└── desktop-apps.module.ts                                   UPDATE

apps/web/src/features/desktop-apps/
├── desktop-apps-api.ts                                      UPDATE
├── desktop-app-sub-nav.tsx                                  UPDATE
├── desktop-telemetry-settings.tsx                           NEW
├── desktop-performance.tsx                                  NEW
├── desktop-crashes.tsx                                      NEW
├── desktop-dependencies.tsx                                 NEW
├── desktop-security.tsx                                     NEW
└── index.ts                                                 UPDATE

apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/
├── settings/page.tsx                                        NEW
├── performance/page.tsx                                     NEW
├── crashes/page.tsx                                         NEW
├── dependencies/page.tsx                                    NEW
└── security/page.tsx                                        NEW

packages/test-code/api/unit/modules/desktop-apps/
├── desktop-telemetry-secret.service.spec.ts                 NEW
└── desktop-security-parsers.spec.ts                         NEW

packages/test-code/api/e2e/
├── desktop-telemetry.e2e-spec.ts                            NEW
├── desktop-performance.e2e-spec.ts                          NEW
└── desktop-security-health.e2e-spec.ts                      NEW

packages/test-code/web/unit/features/desktop-apps/
├── desktop-telemetry-api.test.ts                            NEW
├── desktop-telemetry-settings.test.tsx                      NEW
├── desktop-performance.test.tsx                             NEW
├── desktop-crashes.test.tsx                                 NEW
├── desktop-dependencies.test.tsx                            NEW
└── desktop-security.test.tsx                                NEW

packages/test-code/web/e2e/full-stack/
└── fullstack-desktop-phases-12-14.spec.ts                   NEW
```

---

# 1. Shared Types — append once

Open:

```text
packages/shared-types/src/desktop-apps/desktop-app.types.ts
```

Keep all Phase 1–11 declarations and append:

```ts
export type DesktopTelemetryProvider =
  | 'SENTRY'
  | 'DATADOG'
  | 'NEW_RELIC'
  | 'OPENTELEMETRY'
  | 'CUSTOM';

export type DesktopTelemetryIntegrationStatus =
  | 'CONNECTED'
  | 'ERROR'
  | 'DISCONNECTED';

export interface DesktopTelemetryIntegration {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  provider: DesktopTelemetryProvider;
  status: DesktopTelemetryIntegrationStatus;
  externalProjectId: string;
  endpointUrl: string;
  configuredAt: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  hasSecret: boolean;
}

export interface ConnectDesktopTelemetryInput {
  provider: DesktopTelemetryProvider;
  externalProjectId: string;
  endpointUrl: string;
  secret: string;
}

export type DesktopPerformanceMetricType =
  | 'CRASH_FREE_USERS_PERCENT'
  | 'CRASH_FREE_SESSIONS_PERCENT'
  | 'STARTUP_MS'
  | 'MEMORY_MB'
  | 'CPU_PERCENT'
  | 'HANG_RATE_PERCENT'
  | 'NETWORK_LATENCY_MS'
  | 'API_FAILURE_RATE_PERCENT'
  | 'VERSION_ADOPTION_PERCENT';

export interface DesktopTelemetryPerformanceSample {
  externalId: string;
  type: DesktopPerformanceMetricType;
  value: number;
  unit: string;
  recordedAt: string;
  version?: string | null;
  platform?: DesktopPlatform | null;
  architecture?: DesktopArchitecture | null;
  channel?: DesktopReleaseChannel | null;
}

export interface DesktopTelemetryCrashSample {
  externalId: string;
  fingerprint: string;
  message: string;
  count: number;
  affectedUsers: number;
  firstSeenAt: string;
  lastSeenAt: string;
  version?: string | null;
  platform?: DesktopPlatform | null;
  architecture?: DesktopArchitecture | null;
  channel?: DesktopReleaseChannel | null;
}

export interface DesktopTelemetryVersionSample {
  version: string;
  users: number;
  sessions: number;
}

export interface DesktopTelemetrySnapshot {
  performance: DesktopTelemetryPerformanceSample[];
  crashes: DesktopTelemetryCrashSample[];
  versions: DesktopTelemetryVersionSample[];
}

export interface DesktopTelemetrySyncResult {
  integration: DesktopTelemetryIntegration;
  performanceInserted: number;
  performanceUpdated: number;
  crashesUpserted: number;
  versionsSeen: number;
}

export interface DesktopRuntimeFilters {
  from?: string;
  to?: string;
  version?: string;
  platform?: DesktopPlatform;
  architecture?: DesktopArchitecture;
  channel?: DesktopReleaseChannel;
}

export interface DesktopMetric {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  telemetryIntegrationId: string;
  externalId: string;
  type: DesktopPerformanceMetricType;
  value: number;
  unit: string;
  version: string | null;
  platform: DesktopPlatform | null;
  architecture: DesktopArchitecture | null;
  channel: DesktopReleaseChannel | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesktopPerformanceSummary {
  crashFreeUsersPercent: number | null;
  crashFreeSessionsPercent: number | null;
  startupMs: number | null;
  memoryMb: number | null;
  cpuPercent: number | null;
  hangRatePercent: number | null;
  networkLatencyMs: number | null;
  apiFailureRatePercent: number | null;
  versionAdoptionPercent: number | null;
  sampleCount: number;
  from: string | null;
  to: string | null;
}

export interface DesktopPerformanceResponse {
  summary: DesktopPerformanceSummary;
  metrics: DesktopMetric[];
}

export interface DesktopCrash {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  telemetryIntegrationId: string;
  externalId: string;
  fingerprint: string;
  message: string;
  count: number;
  affectedUsers: number;
  version: string | null;
  platform: DesktopPlatform | null;
  architecture: DesktopArchitecture | null;
  channel: DesktopReleaseChannel | null;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DesktopDependencyEcosystem =
  | 'NPM'
  | 'CARGO'
  | 'NUGET'
  | 'MAVEN'
  | 'GRADLE'
  | 'CMAKE'
  | 'CONAN'
  | 'VCPKG'
  | 'OTHER';

export type DesktopDependencyRiskStatus =
  | 'CURRENT'
  | 'UPDATE_AVAILABLE'
  | 'VULNERABLE'
  | 'UNKNOWN';

export type DesktopSecuritySeverity =
  | 'INFO'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface DesktopDependency {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  ecosystem: DesktopDependencyEcosystem;
  manifestPath: string;
  name: string;
  currentVersion: string;
  latestVersion: string | null;
  direct: boolean;
  riskStatus: DesktopDependencyRiskStatus;
  severity: DesktopSecuritySeverity | null;
  advisoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type DesktopSecurityCheckType =
  | 'WINDOWS_SIGNING'
  | 'MACOS_SIGNING'
  | 'MACOS_NOTARIZATION'
  | 'PACKAGING_CONFIGURATION'
  | 'DEPENDENCY_VULNERABILITY';

export type DesktopSecurityCheckStatus =
  | 'PASS'
  | 'WARN'
  | 'FAIL'
  | 'UNKNOWN';

export interface DesktopSecurityFinding {
  id: string;
  workspaceId: string;
  desktopAppId: string;
  findingKey: string;
  type: DesktopSecurityCheckType;
  status: DesktopSecurityCheckStatus;
  severity: DesktopSecuritySeverity;
  title: string;
  message: string;
  sourcePath: string | null;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DesktopSecuritySummary {
  windowsSigning: DesktopSecurityCheckStatus;
  macosSigning: DesktopSecurityCheckStatus;
  notarization: DesktopSecurityCheckStatus;
  criticalRisks: number;
  highRisks: number;
  findings: DesktopSecurityFinding[];
}
```

Update the existing Phase 6 overview contract from:

```ts
latestPerformance: null;
```

to:

```ts
latestPerformance: DesktopPerformanceSummary | null;
```

Do not duplicate the package export if Phase 1 already exports the desktop type file.

---

# 2. Prisma — Phase 12 Telemetry Foundation

Create:

```text
apps/api/prisma/models/desktop-telemetry.prisma
```

```prisma
enum DesktopTelemetryProvider {
  SENTRY
  DATADOG
  NEW_RELIC
  OPENTELEMETRY
  CUSTOM
}

enum DesktopTelemetryIntegrationStatus {
  CONNECTED
  ERROR
  DISCONNECTED
}

model DesktopTelemetryIntegration {
  id           String @id @default(uuid()) @db.Uuid
  workspaceId  String @map("workspace_id") @db.Uuid
  desktopAppId String @map("desktop_app_id") @db.Uuid

  provider          DesktopTelemetryProvider
  status            DesktopTelemetryIntegrationStatus @default(CONNECTED)
  externalProjectId String @map("external_project_id") @db.VarChar(255)
  endpointUrl       String @map("endpoint_url") @db.VarChar(2048)

  // AES-256-GCM ciphertext. The plaintext provider token is never returned.
  secretCiphertext String @map("secret_ciphertext") @db.Text

  configuredAt DateTime  @default(now()) @map("configured_at") @db.Timestamptz(6)
  lastSyncedAt DateTime? @map("last_synced_at") @db.Timestamptz(6)
  lastError    String?   @map("last_error") @db.Text

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  desktopApp DesktopApplication @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)
  metrics    DesktopMetric[]
  crashes    DesktopCrash[]

  @@unique([desktopAppId, provider])
  @@index([workspaceId, desktopAppId])
  @@index([desktopAppId, status])
  @@map("desktop_telemetry_integrations")
}
```

---

# 3. Prisma — Phase 13 Runtime Metrics + Crashes

Create:

```text
apps/api/prisma/models/desktop-runtime.prisma
```

```prisma
enum DesktopPerformanceMetricType {
  CRASH_FREE_USERS_PERCENT
  CRASH_FREE_SESSIONS_PERCENT
  STARTUP_MS
  MEMORY_MB
  CPU_PERCENT
  HANG_RATE_PERCENT
  NETWORK_LATENCY_MS
  API_FAILURE_RATE_PERCENT
  VERSION_ADOPTION_PERCENT
}

model DesktopMetric {
  id                     String @id @default(uuid()) @db.Uuid
  workspaceId            String @map("workspace_id") @db.Uuid
  desktopAppId           String @map("desktop_app_id") @db.Uuid
  telemetryIntegrationId String @map("telemetry_integration_id") @db.Uuid

  externalId String @map("external_id") @db.VarChar(255)
  type       DesktopPerformanceMetricType
  value      Float
  unit       String @db.VarChar(32)

  version      String?               @db.VarChar(64)
  platform     DesktopPlatform?
  architecture DesktopArchitecture?
  channel      DesktopReleaseChannel?

  recordedAt DateTime @map("recorded_at") @db.Timestamptz(6)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  desktopApp DesktopApplication          @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)
  integration DesktopTelemetryIntegration @relation(fields: [telemetryIntegrationId], references: [id], onDelete: Cascade)

  @@unique([telemetryIntegrationId, externalId])
  @@index([workspaceId, desktopAppId, recordedAt(sort: Desc)])
  @@index([desktopAppId, type, recordedAt(sort: Desc)])
  @@index([desktopAppId, version, platform, architecture])
  @@map("desktop_metrics")
}

model DesktopCrash {
  id                     String @id @default(uuid()) @db.Uuid
  workspaceId            String @map("workspace_id") @db.Uuid
  desktopAppId           String @map("desktop_app_id") @db.Uuid
  telemetryIntegrationId String @map("telemetry_integration_id") @db.Uuid

  externalId    String @map("external_id") @db.VarChar(255)
  fingerprint   String @db.VarChar(512)
  message       String @db.Text
  count         Int    @default(1)
  affectedUsers Int    @default(0) @map("affected_users")

  version      String?               @db.VarChar(64)
  platform     DesktopPlatform?
  architecture DesktopArchitecture?
  channel      DesktopReleaseChannel?

  firstSeenAt DateTime @map("first_seen_at") @db.Timestamptz(6)
  lastSeenAt  DateTime @map("last_seen_at") @db.Timestamptz(6)

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  desktopApp DesktopApplication          @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)
  integration DesktopTelemetryIntegration @relation(fields: [telemetryIntegrationId], references: [id], onDelete: Cascade)

  @@unique([telemetryIntegrationId, externalId])
  @@index([workspaceId, desktopAppId, lastSeenAt(sort: Desc)])
  @@index([desktopAppId, version, platform, architecture])
  @@index([desktopAppId, fingerprint])
  @@map("desktop_crashes")
}
```

---

# 4. Prisma — Phase 14 Dependency + Security Health

Create:

```text
apps/api/prisma/models/desktop-security-health.prisma
```

```prisma
enum DesktopDependencyEcosystem {
  NPM
  CARGO
  NUGET
  MAVEN
  GRADLE
  CMAKE
  CONAN
  VCPKG
  OTHER
}

enum DesktopDependencyRiskStatus {
  CURRENT
  UPDATE_AVAILABLE
  VULNERABLE
  UNKNOWN
}

enum DesktopSecuritySeverity {
  INFO
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum DesktopSecurityCheckType {
  WINDOWS_SIGNING
  MACOS_SIGNING
  MACOS_NOTARIZATION
  PACKAGING_CONFIGURATION
  DEPENDENCY_VULNERABILITY
}

enum DesktopSecurityCheckStatus {
  PASS
  WARN
  FAIL
  UNKNOWN
}

model DesktopDependency {
  id           String @id @default(uuid()) @db.Uuid
  workspaceId  String @map("workspace_id") @db.Uuid
  desktopAppId String @map("desktop_app_id") @db.Uuid

  ecosystem      DesktopDependencyEcosystem
  manifestPath   String @map("manifest_path") @db.VarChar(1024)
  name           String @db.VarChar(255)
  currentVersion String @map("current_version") @db.VarChar(255)
  latestVersion  String? @map("latest_version") @db.VarChar(255)
  direct         Boolean @default(true)
  riskStatus     DesktopDependencyRiskStatus @default(UNKNOWN) @map("risk_status")
  severity       DesktopSecuritySeverity?
  advisoryIds    Json @default("[]") @map("advisory_ids")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  desktopApp DesktopApplication @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)

  @@unique([desktopAppId, manifestPath, name])
  @@index([workspaceId, desktopAppId])
  @@index([desktopAppId, riskStatus])
  @@index([desktopAppId, ecosystem])
  @@map("desktop_dependencies")
}

model DesktopSecurityFinding {
  id           String @id @default(uuid()) @db.Uuid
  workspaceId  String @map("workspace_id") @db.Uuid
  desktopAppId String @map("desktop_app_id") @db.Uuid

  findingKey String @map("finding_key") @db.VarChar(255)
  type       DesktopSecurityCheckType
  status     DesktopSecurityCheckStatus
  severity   DesktopSecuritySeverity
  title      String @db.VarChar(255)
  message    String @db.Text
  sourcePath String? @map("source_path") @db.VarChar(1024)
  evidence   Json @default("[]")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  desktopApp DesktopApplication @relation(fields: [desktopAppId], references: [id], onDelete: Cascade)

  @@unique([desktopAppId, findingKey])
  @@index([workspaceId, desktopAppId])
  @@index([desktopAppId, status, severity])
  @@index([desktopAppId, type])
  @@map("desktop_security_findings")
}
```

Update:

```text
apps/api/prisma/models/desktop-application.prisma
```

Add these relations without removing Phase 1–11 relations:

```prisma
telemetryIntegrations DesktopTelemetryIntegration[]
metrics               DesktopMetric[]
crashes               DesktopCrash[]
dependencies          DesktopDependency[]
securityFindings      DesktopSecurityFinding[]
```

---

# PHASE 12 — DESKTOP TELEMETRY FOUNDATION

## 12.1 Telemetry provider interface

Create:

```text
apps/api/src/modules/desktop-apps/telemetry/desktop-telemetry-provider.interface.ts
```

```ts
import type {
  DesktopTelemetryProvider,
  DesktopTelemetrySnapshot,
} from '@command-center/shared-types';

export interface DesktopTelemetryProviderContext {
  provider: DesktopTelemetryProvider;
  workspaceId: string;
  desktopAppId: string;
  externalProjectId: string;
  endpointUrl: string;
  secret: string;
}

export interface DesktopTelemetryProviderAdapter {
  getSnapshot(
    context: DesktopTelemetryProviderContext,
  ): Promise<DesktopTelemetrySnapshot>;
}
```

## 12.2 Secret encryption service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-telemetry-secret.service.ts
```

```ts
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class DesktopTelemetrySecretService {
  private readonly algorithm = 'aes-256-gcm';

  encrypt(secret: string): string {
    const value = secret.trim();

    if (!value) {
      throw new ServiceUnavailableException(
        'Telemetry secret cannot be empty.',
      );
    }

    const key = this.key();
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const [version, ivValue, tagValue, ciphertextValue] =
      payload.split('.');

    if (
      version !== 'v1' ||
      !ivValue ||
      !tagValue ||
      !ciphertextValue
    ) {
      throw new ServiceUnavailableException(
        'Telemetry secret payload is invalid.',
      );
    }

    const decipher = createDecipheriv(
      this.algorithm,
      this.key(),
      Buffer.from(ivValue, 'base64url'),
    );

    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private key(): Buffer {
    const configured = process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;

    if (!configured) {
      throw new ServiceUnavailableException(
        'DESKTOP_TELEMETRY_ENCRYPTION_KEY is not configured.',
      );
    }

    let key: Buffer;

    try {
      key = Buffer.from(configured, 'base64');
    } catch {
      throw new ServiceUnavailableException(
        'DESKTOP_TELEMETRY_ENCRYPTION_KEY must be valid base64.',
      );
    }

    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        'DESKTOP_TELEMETRY_ENCRYPTION_KEY must decode to exactly 32 bytes.',
      );
    }

    return key;
  }
}
```

Generate a local development key once with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Put the resulting value in the API environment as `DESKTOP_TELEMETRY_ENCRYPTION_KEY`. Never commit the generated value.

## 12.3 Telemetry URL policy / SSRF protection

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-telemetry-url-policy.service.ts
```

```ts
import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class DesktopTelemetryUrlPolicyService {
  async assertSafe(urlValue: string): Promise<URL> {
    let url: URL;

    try {
      url = new URL(urlValue);
    } catch {
      throw new BadRequestException('Telemetry endpoint URL is invalid.');
    }

    if (
      process.env.NODE_ENV === 'test' &&
      url.protocol === 'mock:'
    ) {
      return url;
    }

    if (url.protocol !== 'https:') {
      throw new BadRequestException(
        'Telemetry endpoint must use HTTPS.',
      );
    }

    if (url.username || url.password) {
      throw new BadRequestException(
        'Telemetry endpoint cannot contain URL credentials.',
      );
    }

    const host = url.hostname.toLowerCase();

    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '0.0.0.0' ||
      host === '::1'
    ) {
      throw new BadRequestException(
        'Telemetry endpoint cannot target localhost.',
      );
    }

    const addresses = await this.resolve(host);

    for (const address of addresses) {
      if (this.isPrivateAddress(address)) {
        throw new BadRequestException(
          'Telemetry endpoint cannot target a private network address.',
        );
      }
    }

    return url;
  }

  private async resolve(host: string): Promise<string[]> {
    if (isIP(host)) {
      return [host];
    }

    try {
      const results = await dns.lookup(host, {
        all: true,
        verbatim: true,
      });

      if (results.length === 0) {
        throw new Error('No DNS records');
      }

      return results.map((item) => item.address);
    } catch {
      throw new BadRequestException(
        'Telemetry endpoint hostname could not be resolved.',
      );
    }
  }

  private isPrivateAddress(address: string): boolean {
    if (address.includes(':')) {
      const normalized = address.toLowerCase();

      return (
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
      );
    }

    const octets = address.split('.').map(Number);

    if (octets.length !== 4 || octets.some(Number.isNaN)) {
      return true;
    }

    const [a, b] = octets;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
}
```

## 12.4 Normalized HTTP provider

Create:

```text
apps/api/src/modules/desktop-apps/telemetry/normalized-http-desktop-telemetry.provider.ts
```

```ts
import type {
  DesktopArchitecture,
  DesktopPlatform,
  DesktopReleaseChannel,
  DesktopTelemetryPerformanceSample,
  DesktopTelemetryCrashSample,
  DesktopTelemetrySnapshot,
  DesktopTelemetryVersionSample,
} from '@command-center/shared-types';
import {
  BadGatewayException,
  Injectable,
} from '@nestjs/common';
import type {
  DesktopTelemetryProviderAdapter,
  DesktopTelemetryProviderContext,
} from './desktop-telemetry-provider.interface';

const METRIC_TYPES = new Set([
  'CRASH_FREE_USERS_PERCENT',
  'CRASH_FREE_SESSIONS_PERCENT',
  'STARTUP_MS',
  'MEMORY_MB',
  'CPU_PERCENT',
  'HANG_RATE_PERCENT',
  'NETWORK_LATENCY_MS',
  'API_FAILURE_RATE_PERCENT',
  'VERSION_ADOPTION_PERCENT',
]);

const PLATFORMS = new Set([
  'WINDOWS',
  'MACOS',
  'LINUX',
  'CROSS_PLATFORM',
]);

const ARCHITECTURES = new Set([
  'X64',
  'ARM64',
  'X86',
  'UNIVERSAL',
]);

const CHANNELS = new Set([
  'DEV',
  'ALPHA',
  'BETA',
  'STABLE',
  'LTS',
]);

@Injectable()
export class NormalizedHttpDesktopTelemetryProvider
  implements DesktopTelemetryProviderAdapter
{
  async getSnapshot(
    context: DesktopTelemetryProviderContext,
  ): Promise<DesktopTelemetrySnapshot> {
    const url = new URL(context.endpointUrl);

    if (
      process.env.NODE_ENV === 'test' &&
      url.protocol === 'mock:'
    ) {
      return this.testSnapshot(url.hostname);
    }

    url.searchParams.set(
      'externalProjectId',
      context.externalProjectId,
    );
    url.searchParams.set('desktopAppId', context.desktopAppId);

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${context.secret}`,
          'x-saas-command-center-provider': context.provider,
        },
        signal: AbortSignal.timeout(12_000),
        redirect: 'error',
      });
    } catch {
      throw new BadGatewayException(
        'Telemetry provider could not be reached.',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `Telemetry provider returned HTTP ${response.status}.`,
      );
    }

    let raw: unknown;

    try {
      raw = await response.json();
    } catch {
      throw new BadGatewayException(
        'Telemetry provider returned invalid JSON.',
      );
    }

    return this.normalize(raw);
  }

  private normalize(raw: unknown): DesktopTelemetrySnapshot {
    if (!raw || typeof raw !== 'object') {
      throw new BadGatewayException(
        'Telemetry provider payload must be an object.',
      );
    }

    const value = raw as Record<string, unknown>;

    return {
      performance: this.performance(value.performance),
      crashes: this.crashes(value.crashes),
      versions: this.versions(value.versions),
    };
  }

  private performance(raw: unknown): DesktopTelemetryPerformanceSample[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.flatMap((item, index) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const value = item as Record<string, unknown>;
      const type = String(value.type ?? '');
      const metricValue = Number(value.value);
      const recordedAt = String(value.recordedAt ?? '');

      if (
        !METRIC_TYPES.has(type) ||
        !Number.isFinite(metricValue) ||
        Number.isNaN(Date.parse(recordedAt))
      ) {
        return [];
      }

      return [
        {
          externalId: String(value.externalId ?? `metric-${index}`),
          type: type as DesktopTelemetryPerformanceSample['type'],
          value: metricValue,
          unit: String(value.unit ?? ''),
          recordedAt,
          version: this.optionalString(value.version),
          platform: this.platform(value.platform),
          architecture: this.architecture(value.architecture),
          channel: this.channel(value.channel),
        },
      ];
    });
  }

  private crashes(raw: unknown): DesktopTelemetryCrashSample[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.flatMap((item, index) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const value = item as Record<string, unknown>;
      const fingerprint = String(value.fingerprint ?? '').trim();
      const message = String(value.message ?? '').trim();
      const firstSeenAt = String(value.firstSeenAt ?? '');
      const lastSeenAt = String(value.lastSeenAt ?? '');
      const count = Math.max(0, Math.trunc(Number(value.count ?? 0)));
      const affectedUsers = Math.max(
        0,
        Math.trunc(Number(value.affectedUsers ?? 0)),
      );

      if (
        !fingerprint ||
        !message ||
        Number.isNaN(Date.parse(firstSeenAt)) ||
        Number.isNaN(Date.parse(lastSeenAt))
      ) {
        return [];
      }

      return [
        {
          externalId: String(value.externalId ?? `crash-${index}`),
          fingerprint,
          message,
          count,
          affectedUsers,
          firstSeenAt,
          lastSeenAt,
          version: this.optionalString(value.version),
          platform: this.platform(value.platform),
          architecture: this.architecture(value.architecture),
          channel: this.channel(value.channel),
        },
      ];
    });
  }

  private versions(raw: unknown): DesktopTelemetryVersionSample[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const value = item as Record<string, unknown>;
      const version = String(value.version ?? '').trim();

      if (!version) {
        return [];
      }

      return [
        {
          version,
          users: Math.max(0, Math.trunc(Number(value.users ?? 0))),
          sessions: Math.max(0, Math.trunc(Number(value.sessions ?? 0))),
        },
      ];
    });
  }

  private optionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  private platform(value: unknown): DesktopPlatform | null {
    const normalized = String(value ?? '').toUpperCase();
    return PLATFORMS.has(normalized)
      ? (normalized as DesktopPlatform)
      : null;
  }

  private architecture(value: unknown): DesktopArchitecture | null {
    const normalized = String(value ?? '').toUpperCase();
    return ARCHITECTURES.has(normalized)
      ? (normalized as DesktopArchitecture)
      : null;
  }

  private channel(value: unknown): DesktopReleaseChannel | null {
    const normalized = String(value ?? '').toUpperCase();
    return CHANNELS.has(normalized)
      ? (normalized as DesktopReleaseChannel)
      : null;
  }

  private testSnapshot(mode: string): DesktopTelemetrySnapshot {
    if (mode === 'failure') {
      throw new BadGatewayException('Injected telemetry provider failure.');
    }

    return {
      performance: [
        {
          externalId: 'perf-startup-1',
          type: 'STARTUP_MS',
          value: 1800,
          unit: 'ms',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
        {
          externalId: 'perf-memory-1',
          type: 'MEMORY_MB',
          value: 242,
          unit: 'MB',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
        {
          externalId: 'perf-cpu-1',
          type: 'CPU_PERCENT',
          value: 4.8,
          unit: '%',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
        {
          externalId: 'perf-crashfree-1',
          type: 'CRASH_FREE_USERS_PERCENT',
          value: 99.7,
          unit: '%',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
      ],
      crashes: [
        {
          externalId: 'crash-renderer-1',
          fingerprint: 'renderer-crash',
          message: 'Renderer process exited unexpectedly',
          count: 12,
          affectedUsers: 8,
          firstSeenAt: '2026-08-22T20:00:00.000Z',
          lastSeenAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
      ],
      versions: [
        {
          version: '2.4.0',
          users: 120,
          sessions: 440,
        },
      ],
    };
  }
}
```

## 12.5 Provider registry

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-telemetry-provider-registry.service.ts
```

```ts
import { Injectable } from '@nestjs/common';
import type {
  DesktopTelemetryProviderAdapter,
} from '../telemetry/desktop-telemetry-provider.interface';
import { NormalizedHttpDesktopTelemetryProvider } from '../telemetry/normalized-http-desktop-telemetry.provider';

@Injectable()
export class DesktopTelemetryProviderRegistryService {
  constructor(
    private readonly normalizedHttp: NormalizedHttpDesktopTelemetryProvider,
  ) {}

  get(): DesktopTelemetryProviderAdapter {
    // The core consumes one normalized adapter contract. Provider-specific
    // collectors/bridges normalize Sentry/Datadog/New Relic/OTel responses
    // before they reach this boundary, keeping vendor logic out of the core.
    return this.normalizedHttp;
  }
}
```

## 12.6 Telemetry DTOs

Create:

```text
apps/api/src/modules/desktop-apps/dto/desktop-telemetry.dto.ts
```

```ts
import { DesktopTelemetryProvider } from 'src/generated/prisma/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ApiProperty,
} from '@nestjs/swagger';

export class ConnectDesktopTelemetryDto {
  @ApiProperty({ enum: DesktopTelemetryProvider })
  @IsEnum(DesktopTelemetryProvider)
  provider!: DesktopTelemetryProvider;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalProjectId!: string;

  @ApiProperty({
    description:
      'HTTPS endpoint exposing the normalized desktop telemetry snapshot contract.',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(2048)
  endpointUrl!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  secret!: string;
}
```

`@IsUrl()` is intentionally not used because the E2E fake provider uses the `mock:` protocol in test mode. Runtime URL safety is enforced by `DesktopTelemetryUrlPolicyService`.

## 12.7 Telemetry service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-telemetry.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import {
  DesktopTelemetryIntegrationStatus,
} from 'src/generated/prisma/enums';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConnectDesktopTelemetryDto } from '../dto/desktop-telemetry.dto';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopTelemetrySecretService } from './desktop-telemetry-secret.service';
import { DesktopTelemetryUrlPolicyService } from './desktop-telemetry-url-policy.service';
import { DesktopTelemetryProviderRegistryService } from './desktop-telemetry-provider-registry.service';

@Injectable()
export class DesktopTelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly secrets: DesktopTelemetrySecretService,
    private readonly urls: DesktopTelemetryUrlPolicyService,
    private readonly providers: DesktopTelemetryProviderRegistryService,
  ) {}

  async list(workspaceId: string, desktopAppId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const integrations =
      await this.prisma.desktopTelemetryIntegration.findMany({
        where: {
          workspaceId,
          desktopAppId,
        },
        orderBy: {
          configuredAt: 'desc',
        },
      });

    return integrations.map((integration) => this.publicIntegration(integration));
  }

  async connect(
    workspaceId: string,
    desktopAppId: string,
    dto: ConnectDesktopTelemetryDto,
  ) {
    const app = await this.desktopApps.findOne(workspaceId, desktopAppId);

    if (app.application.archivedAt) {
      throw new BadRequestException(
        'Archived desktop applications cannot configure telemetry.',
      );
    }

    const safeUrl = await this.urls.assertSafe(dto.endpointUrl.trim());
    const encrypted = this.secrets.encrypt(dto.secret);

    const integration =
      await this.prisma.desktopTelemetryIntegration.upsert({
        where: {
          desktopAppId_provider: {
            desktopAppId,
            provider: dto.provider,
          },
        },
        create: {
          workspaceId,
          desktopAppId,
          provider: dto.provider,
          status: DesktopTelemetryIntegrationStatus.CONNECTED,
          externalProjectId: dto.externalProjectId.trim(),
          endpointUrl: safeUrl.toString(),
          secretCiphertext: encrypted,
          configuredAt: new Date(),
          lastError: null,
        },
        update: {
          status: DesktopTelemetryIntegrationStatus.CONNECTED,
          externalProjectId: dto.externalProjectId.trim(),
          endpointUrl: safeUrl.toString(),
          secretCiphertext: encrypted,
          configuredAt: new Date(),
          lastError: null,
        },
      });

    return this.publicIntegration(integration);
  }

  async preview(
    workspaceId: string,
    desktopAppId: string,
    integrationId: string,
  ) {
    const integration = await this.requireIntegration(
      workspaceId,
      desktopAppId,
      integrationId,
    );

    const adapter = this.providers.get();

    try {
      const snapshot = await adapter.getSnapshot({
        provider: integration.provider,
        workspaceId,
        desktopAppId,
        externalProjectId: integration.externalProjectId,
        endpointUrl: integration.endpointUrl,
        secret: this.secrets.decrypt(integration.secretCiphertext),
      });

      await this.prisma.desktopTelemetryIntegration.update({
        where: { id: integration.id },
        data: {
          status: DesktopTelemetryIntegrationStatus.CONNECTED,
          lastSyncedAt: new Date(),
          lastError: null,
        },
      });

      return snapshot;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 2000)
          : 'Unknown telemetry provider failure';

      await this.prisma.desktopTelemetryIntegration.update({
        where: { id: integration.id },
        data: {
          status: DesktopTelemetryIntegrationStatus.ERROR,
          lastError: message,
        },
      });

      throw error;
    }
  }

  async disconnect(
    workspaceId: string,
    desktopAppId: string,
    integrationId: string,
  ) {
    const integration = await this.requireIntegration(
      workspaceId,
      desktopAppId,
      integrationId,
    );

    await this.prisma.desktopTelemetryIntegration.update({
      where: { id: integration.id },
      data: {
        status: DesktopTelemetryIntegrationStatus.DISCONNECTED,
        secretCiphertext: '',
        lastError: null,
      },
    });

    return { success: true as const };
  }

  async requireIntegration(
    workspaceId: string,
    desktopAppId: string,
    integrationId: string,
  ) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const integration =
      await this.prisma.desktopTelemetryIntegration.findFirst({
        where: {
          id: integrationId,
          workspaceId,
          desktopAppId,
        },
      });

    if (!integration) {
      throw new NotFoundException('Desktop telemetry integration not found.');
    }

    return integration;
  }

  async snapshotForSync(
    workspaceId: string,
    desktopAppId: string,
    integrationId: string,
  ) {
    const integration = await this.requireIntegration(
      workspaceId,
      desktopAppId,
      integrationId,
    );

    if (integration.status === DesktopTelemetryIntegrationStatus.DISCONNECTED) {
      throw new BadRequestException('Telemetry integration is disconnected.');
    }

    const snapshot = await this.providers.get().getSnapshot({
      provider: integration.provider,
      workspaceId,
      desktopAppId,
      externalProjectId: integration.externalProjectId,
      endpointUrl: integration.endpointUrl,
      secret: this.secrets.decrypt(integration.secretCiphertext),
    });

    return { integration, snapshot };
  }

  publicIntegration<T extends {
    id: string;
    workspaceId: string;
    desktopAppId: string;
    provider: unknown;
    status: unknown;
    externalProjectId: string;
    endpointUrl: string;
    secretCiphertext: string;
    configuredAt: Date;
    lastSyncedAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>(integration: T) {
    return {
      id: integration.id,
      workspaceId: integration.workspaceId,
      desktopAppId: integration.desktopAppId,
      provider: integration.provider,
      status: integration.status,
      externalProjectId: integration.externalProjectId,
      endpointUrl: integration.endpointUrl,
      configuredAt: integration.configuredAt,
      lastSyncedAt: integration.lastSyncedAt,
      lastError: integration.lastError,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      hasSecret: integration.secretCiphertext.length > 0,
    };
  }
}
```

## 12.8 Telemetry controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-telemetry.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { ConnectDesktopTelemetryDto } from '../dto/desktop-telemetry.dto';
import { DesktopTelemetryService } from '../services/desktop-telemetry.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Telemetry')
@ApiBearerAuth('access-token')
@Controller(
  'workspaces/:workspaceId/desktop-apps/:desktopAppId/telemetry',
)
@UseGuards(
  JwtAuthGuard,
  WorkspaceAccessGuard,
  WorkspaceRolesGuard,
)
export class DesktopTelemetryController {
  constructor(private readonly service: DesktopTelemetryService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
  ) {
    return this.service.list(workspaceId, desktopAppId);
  }

  @Post()
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({ summary: 'Configure a desktop telemetry provider' })
  connect(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Body() dto: ConnectDesktopTelemetryDto,
  ) {
    return this.service.connect(workspaceId, desktopAppId, dto);
  }

  @Post(':integrationId/preview')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  preview(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
  ) {
    return this.service.preview(
      workspaceId,
      desktopAppId,
      integrationId,
    );
  }

  @Delete(':integrationId')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
  )
  disconnect(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
  ) {
    return this.service.disconnect(
      workspaceId,
      desktopAppId,
      integrationId,
    );
  }
}
```

---

# PHASE 13 — PERFORMANCE & CRASH MONITORING

## 13.1 Runtime DTOs

Create:

```text
apps/api/src/modules/desktop-apps/dto/desktop-runtime.dto.ts
```

```ts
import {
  DesktopArchitecture,
  DesktopPerformanceMetricType,
  DesktopPlatform,
  DesktopReleaseChannel,
} from 'src/generated/prisma/enums';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DesktopRuntimeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string;

  @ApiPropertyOptional({ enum: DesktopPlatform })
  @IsOptional()
  @IsEnum(DesktopPlatform)
  platform?: DesktopPlatform;

  @ApiPropertyOptional({ enum: DesktopArchitecture })
  @IsOptional()
  @IsEnum(DesktopArchitecture)
  architecture?: DesktopArchitecture;

  @ApiPropertyOptional({ enum: DesktopReleaseChannel })
  @IsOptional()
  @IsEnum(DesktopReleaseChannel)
  channel?: DesktopReleaseChannel;
}

export class DesktopMetricIngestItemDto {
  @IsString()
  @MaxLength(255)
  externalId!: string;

  @IsEnum(DesktopPerformanceMetricType)
  type!: DesktopPerformanceMetricType;

  @IsNumber()
  value!: number;

  @IsString()
  @MaxLength(32)
  unit!: string;

  @IsDateString()
  recordedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string | null;

  @IsOptional()
  @IsEnum(DesktopPlatform)
  platform?: DesktopPlatform | null;

  @IsOptional()
  @IsEnum(DesktopArchitecture)
  architecture?: DesktopArchitecture | null;

  @IsOptional()
  @IsEnum(DesktopReleaseChannel)
  channel?: DesktopReleaseChannel | null;
}

export class DesktopCrashIngestItemDto {
  @IsString()
  @MaxLength(255)
  externalId!: string;

  @IsString()
  @MaxLength(512)
  fingerprint!: string;

  @IsString()
  @MaxLength(10_000)
  message!: string;

  @IsInt()
  @Min(0)
  count!: number;

  @IsInt()
  @Min(0)
  affectedUsers!: number;

  @IsDateString()
  firstSeenAt!: string;

  @IsDateString()
  lastSeenAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string | null;

  @IsOptional()
  @IsEnum(DesktopPlatform)
  platform?: DesktopPlatform | null;

  @IsOptional()
  @IsEnum(DesktopArchitecture)
  architecture?: DesktopArchitecture | null;

  @IsOptional()
  @IsEnum(DesktopReleaseChannel)
  channel?: DesktopReleaseChannel | null;
}

export class IngestDesktopRuntimeDto {
  @IsUUID()
  integrationId!: string;

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => DesktopMetricIngestItemDto)
  performance!: DesktopMetricIngestItemDto[];

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => DesktopCrashIngestItemDto)
  crashes!: DesktopCrashIngestItemDto[];
}
```

## 13.2 Runtime persistence service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-runtime.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import {
  DesktopTelemetryIntegrationStatus,
} from 'src/generated/prisma/enums';
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type {
  DesktopTelemetryCrashSample,
  DesktopTelemetryPerformanceSample,
} from '@command-center/shared-types';
import type { IngestDesktopRuntimeDto } from '../dto/desktop-runtime.dto';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopTelemetryService } from './desktop-telemetry.service';

@Injectable()
export class DesktopRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly telemetry: DesktopTelemetryService,
  ) {}

  async syncProvider(
    workspaceId: string,
    desktopAppId: string,
    integrationId: string,
  ) {
    const { integration, snapshot } =
      await this.telemetry.snapshotForSync(
        workspaceId,
        desktopAppId,
        integrationId,
      );

    const result = await this.persist(
      workspaceId,
      desktopAppId,
      integration.id,
      snapshot.performance,
      snapshot.crashes,
    );

    const updated =
      await this.prisma.desktopTelemetryIntegration.update({
        where: { id: integration.id },
        data: {
          status: DesktopTelemetryIntegrationStatus.CONNECTED,
          lastSyncedAt: new Date(),
          lastError: null,
        },
      });

    return {
      integration: this.telemetry.publicIntegration(updated),
      ...result,
      versionsSeen: snapshot.versions.length,
    };
  }

  async ingestNormalized(
    workspaceId: string,
    desktopAppId: string,
    dto: IngestDesktopRuntimeDto,
  ) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const integration = await this.telemetry.requireIntegration(
      workspaceId,
      desktopAppId,
      dto.integrationId,
    );

    if (
      integration.status ===
      DesktopTelemetryIntegrationStatus.DISCONNECTED
    ) {
      throw new BadRequestException(
        'Disconnected integrations cannot ingest runtime data.',
      );
    }

    const result = await this.persist(
      workspaceId,
      desktopAppId,
      integration.id,
      dto.performance,
      dto.crashes,
    );

    await this.prisma.desktopTelemetryIntegration.update({
      where: { id: integration.id },
      data: {
        status: DesktopTelemetryIntegrationStatus.CONNECTED,
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });

    return result;
  }

  private async persist(
    workspaceId: string,
    desktopAppId: string,
    telemetryIntegrationId: string,
    performance: DesktopTelemetryPerformanceSample[],
    crashes: DesktopTelemetryCrashSample[],
  ) {
    let performanceInserted = 0;
    let performanceUpdated = 0;
    let crashesUpserted = 0;

    await this.prisma.$transaction(async (transaction) => {
      for (const metric of performance) {
        const existing = await transaction.desktopMetric.findUnique({
          where: {
            telemetryIntegrationId_externalId: {
              telemetryIntegrationId,
              externalId: metric.externalId,
            },
          },
          select: { id: true },
        });

        await transaction.desktopMetric.upsert({
          where: {
            telemetryIntegrationId_externalId: {
              telemetryIntegrationId,
              externalId: metric.externalId,
            },
          },
          create: {
            workspaceId,
            desktopAppId,
            telemetryIntegrationId,
            externalId: metric.externalId,
            type: metric.type,
            value: metric.value,
            unit: metric.unit,
            version: metric.version ?? null,
            platform: metric.platform ?? null,
            architecture: metric.architecture ?? null,
            channel: metric.channel ?? null,
            recordedAt: new Date(metric.recordedAt),
          },
          update: {
            type: metric.type,
            value: metric.value,
            unit: metric.unit,
            version: metric.version ?? null,
            platform: metric.platform ?? null,
            architecture: metric.architecture ?? null,
            channel: metric.channel ?? null,
            recordedAt: new Date(metric.recordedAt),
          },
        });

        if (existing) {
          performanceUpdated += 1;
        } else {
          performanceInserted += 1;
        }
      }

      for (const crash of crashes) {
        await transaction.desktopCrash.upsert({
          where: {
            telemetryIntegrationId_externalId: {
              telemetryIntegrationId,
              externalId: crash.externalId,
            },
          },
          create: {
            workspaceId,
            desktopAppId,
            telemetryIntegrationId,
            externalId: crash.externalId,
            fingerprint: crash.fingerprint,
            message: crash.message,
            count: crash.count,
            affectedUsers: crash.affectedUsers,
            version: crash.version ?? null,
            platform: crash.platform ?? null,
            architecture: crash.architecture ?? null,
            channel: crash.channel ?? null,
            firstSeenAt: new Date(crash.firstSeenAt),
            lastSeenAt: new Date(crash.lastSeenAt),
          },
          update: {
            fingerprint: crash.fingerprint,
            message: crash.message,
            count: crash.count,
            affectedUsers: crash.affectedUsers,
            version: crash.version ?? null,
            platform: crash.platform ?? null,
            architecture: crash.architecture ?? null,
            channel: crash.channel ?? null,
            firstSeenAt: new Date(crash.firstSeenAt),
            lastSeenAt: new Date(crash.lastSeenAt),
          },
        });

        crashesUpserted += 1;
      }
    });

    return {
      performanceInserted,
      performanceUpdated,
      crashesUpserted,
    };
  }
}
```

## 13.3 Performance service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-performance.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import { Injectable } from '@nestjs/common';
import type { DesktopRuntimeQueryDto } from '../dto/desktop-runtime.dto';
import { DesktopAppsService } from './desktop-apps.service';

@Injectable()
export class DesktopPerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
  ) {}

  async get(
    workspaceId: string,
    desktopAppId: string,
    query: DesktopRuntimeQueryDto,
  ) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    const metrics = await this.prisma.desktopMetric.findMany({
      where: {
        workspaceId,
        desktopAppId,
        ...(query.version ? { version: query.version } : {}),
        ...(query.platform ? { platform: query.platform } : {}),
        ...(query.architecture
          ? { architecture: query.architecture }
          : {}),
        ...(query.channel ? { channel: query.channel } : {}),
        ...(from || to
          ? {
              recordedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: 2000,
    });

    const average = (type: string): number | null => {
      const values = metrics
        .filter((metric) => metric.type === type)
        .map((metric) => metric.value)
        .filter(Number.isFinite);

      if (values.length === 0) {
        return null;
      }

      return (
        values.reduce((sum, value) => sum + value, 0) /
        values.length
      );
    };

    return {
      summary: {
        crashFreeUsersPercent: average('CRASH_FREE_USERS_PERCENT'),
        crashFreeSessionsPercent: average(
          'CRASH_FREE_SESSIONS_PERCENT',
        ),
        startupMs: average('STARTUP_MS'),
        memoryMb: average('MEMORY_MB'),
        cpuPercent: average('CPU_PERCENT'),
        hangRatePercent: average('HANG_RATE_PERCENT'),
        networkLatencyMs: average('NETWORK_LATENCY_MS'),
        apiFailureRatePercent: average('API_FAILURE_RATE_PERCENT'),
        versionAdoptionPercent: average('VERSION_ADOPTION_PERCENT'),
        sampleCount: metrics.length,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      },
      metrics,
    };
  }
}
```

## 13.4 Crash service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-crashes.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DesktopRuntimeQueryDto } from '../dto/desktop-runtime.dto';
import { DesktopAppsService } from './desktop-apps.service';

@Injectable()
export class DesktopCrashesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
  ) {}

  async list(
    workspaceId: string,
    desktopAppId: string,
    query: DesktopRuntimeQueryDto,
  ) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    return this.prisma.desktopCrash.findMany({
      where: {
        workspaceId,
        desktopAppId,
        ...(query.version ? { version: query.version } : {}),
        ...(query.platform ? { platform: query.platform } : {}),
        ...(query.architecture
          ? { architecture: query.architecture }
          : {}),
        ...(query.channel ? { channel: query.channel } : {}),
        ...(from || to
          ? {
              lastSeenAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: [
        { affectedUsers: 'desc' },
        { count: 'desc' },
        { lastSeenAt: 'desc' },
      ],
      take: 500,
    });
  }

  async findOne(
    workspaceId: string,
    desktopAppId: string,
    crashId: string,
  ) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const crash = await this.prisma.desktopCrash.findFirst({
      where: {
        id: crashId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!crash) {
      throw new NotFoundException('Desktop crash not found.');
    }

    return crash;
  }
}
```

## 13.5 Performance controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-performance.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import {
  DesktopRuntimeQueryDto,
  IngestDesktopRuntimeDto,
} from '../dto/desktop-runtime.dto';
import { DesktopPerformanceService } from '../services/desktop-performance.service';
import { DesktopRuntimeService } from '../services/desktop-runtime.service';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Performance')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(
  JwtAuthGuard,
  WorkspaceAccessGuard,
  WorkspaceRolesGuard,
)
export class DesktopPerformanceController {
  constructor(
    private readonly performance: DesktopPerformanceService,
    private readonly runtime: DesktopRuntimeService,
  ) {}

  @Get('performance')
  get(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Query() query: DesktopRuntimeQueryDto,
  ) {
    return this.performance.get(workspaceId, desktopAppId, query);
  }

  @Post('telemetry/:integrationId/sync')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  sync(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
  ) {
    return this.runtime.syncProvider(
      workspaceId,
      desktopAppId,
      integrationId,
    );
  }

  @Post('runtime/ingest')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  ingest(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Body() dto: IngestDesktopRuntimeDto,
  ) {
    return this.runtime.ingestNormalized(
      workspaceId,
      desktopAppId,
      dto,
    );
  }
}
```

## 13.6 Crashes controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-crashes.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { DesktopRuntimeQueryDto } from '../dto/desktop-runtime.dto';
import { DesktopCrashesService } from '../services/desktop-crashes.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Desktop Crashes')
@ApiBearerAuth('access-token')
@Controller(
  'workspaces/:workspaceId/desktop-apps/:desktopAppId/crashes',
)
@UseGuards(
  JwtAuthGuard,
  WorkspaceAccessGuard,
  WorkspaceRolesGuard,
)
export class DesktopCrashesController {
  constructor(private readonly service: DesktopCrashesService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Query() query: DesktopRuntimeQueryDto,
  ) {
    return this.service.list(workspaceId, desktopAppId, query);
  }

  @Get(':crashId')
  findOne(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Param('crashId', ParseUUIDPipe) crashId: string,
  ) {
    return this.service.findOne(workspaceId, desktopAppId, crashId);
  }
}
```

## 13.7 Update Desktop Overview to include performance

Update the Phase 11 service:

```text
apps/api/src/modules/desktop-apps/services/desktop-overview.service.ts
```

Inject `DesktopPerformanceService`:

```ts
constructor(
  private readonly desktopApps: DesktopAppsService,
  private readonly desktopRepositories: DesktopRepositoryService,
  private readonly desktopBuilds: DesktopBuildsService,
  private readonly desktopReleases: DesktopReleasesService,
  private readonly desktopPerformance: DesktopPerformanceService,
) {}
```

Then change the aggregate call to:

```ts
const [
  repository,
  latestBuild,
  latestRelease,
  performance,
] = await Promise.all([
  this.desktopRepositories.getLinkedRepository(
    workspaceId,
    desktopAppId,
  ),
  this.desktopBuilds.getLatest(
    workspaceId,
    desktopAppId,
  ),
  this.desktopReleases.getLatestPublished(
    workspaceId,
    desktopAppId,
  ),
  this.desktopPerformance.get(
    workspaceId,
    desktopAppId,
    {},
  ),
]);

return {
  desktopApp,
  repository,
  latestBuild,
  latestRelease,
  latestPerformance:
    performance.summary.sampleCount > 0
      ? performance.summary
      : null,
};
```

---

---

# PHASE 14 — DEPENDENCY & SECURITY HEALTH

## 14.1 Repository metadata snapshot service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-repository-metadata.service.ts
```

```ts
import { GithubCodeService } from '../../repositories/services/github-code.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DesktopRepositoryService } from './desktop-repository.service';

export interface DesktopRepositoryMetadataSnapshot {
  repositoryId: string;
  repositoryFullName: string;
  branch: string;
  paths: string[];
  files: Record<string, string>;
  truncated: boolean;
}

const MAX_FILES = 120;
const MAX_FILE_SIZE = 500_000;

@Injectable()
export class DesktopRepositoryMetadataService {
  constructor(
    private readonly desktopRepositories: DesktopRepositoryService,
    private readonly githubCode: GithubCodeService,
  ) {}

  async load(
    workspaceId: string,
    desktopAppId: string,
  ): Promise<DesktopRepositoryMetadataSnapshot> {
    const repository =
      await this.desktopRepositories.getLinkedRepository(
        workspaceId,
        desktopAppId,
      );

    if (!repository) {
      throw new BadRequestException(
        'Connect a repository before scanning dependencies or security configuration.',
      );
    }

    if (repository.archived || !repository.isAvailable) {
      throw new BadRequestException(
        'The linked repository is not available.',
      );
    }

    const tree = await this.githubCode.getTree(
      repository.installation.externalInstallationId,
      repository.owner,
      repository.name,
      repository.defaultBranch,
    );

    const entries = tree.entries
      .filter(
        (entry) =>
          entry.type === 'file' &&
          this.isInteresting(entry.path) &&
          (entry.size === null ||
            entry.size === undefined ||
            entry.size <= MAX_FILE_SIZE),
      )
      .slice(0, MAX_FILES);

    const files: Record<string, string> = {};

    for (const entry of entries) {
      try {
        const file = await this.githubCode.getFile(
          repository.installation.externalInstallationId,
          repository.owner,
          repository.name,
          entry.path,
          repository.defaultBranch,
        );

        if (file.size <= MAX_FILE_SIZE) {
          files[entry.path] = file.content;
        }
      } catch {
        // A deleted/unreadable manifest is ignored; the scan still returns
        // the safely available repository evidence.
      }
    }

    return {
      repositoryId: repository.id,
      repositoryFullName: repository.fullName,
      branch: repository.defaultBranch,
      paths: tree.entries
        .filter((entry) => entry.type === 'file')
        .map((entry) => entry.path),
      files,
      truncated: tree.truncated || entries.length >= MAX_FILES,
    };
  }

  private isInteresting(path: string): boolean {
    return (
      /(^|\/)package\.json$/i.test(path) ||
      /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(path) ||
      /(^|\/)Cargo\.toml$/i.test(path) ||
      /(^|\/)Cargo\.lock$/i.test(path) ||
      /\.(csproj|fsproj|vbproj)$/i.test(path) ||
      /(^|\/)(packages\.lock\.json|Directory\.Packages\.props)$/i.test(path) ||
      /(^|\/)(pom\.xml|build\.gradle|build\.gradle\.kts)$/i.test(path) ||
      /(^|\/)(CMakeLists\.txt|conanfile\.(txt|py)|vcpkg\.json)$/i.test(path) ||
      /(^|\/)src-tauri\/tauri\.conf\.(json|json5)$/i.test(path) ||
      /(^|\/)(electron-builder\.(yml|yaml|json|json5)|forge\.config\.(js|cjs|mjs|ts))$/i.test(path) ||
      /(^|\/)[^/]+\.xcodeproj\/project\.pbxproj$/i.test(path) ||
      /(^|\/)(osv-scanner\.json|npm-audit\.json|pnpm-audit\.json)$/i.test(path)
    );
  }
}
```

## 14.2 Dependency health service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-dependency-health.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import {
  DesktopDependencyEcosystem,
  DesktopDependencyRiskStatus,
  DesktopSecuritySeverity,
} from 'src/generated/prisma/enums';
import { Injectable } from '@nestjs/common';
import { DesktopAppsService } from './desktop-apps.service';
import {
  DesktopRepositoryMetadataService,
  type DesktopRepositoryMetadataSnapshot,
} from './desktop-repository-metadata.service';

interface ParsedDependency {
  ecosystem: DesktopDependencyEcosystem;
  manifestPath: string;
  name: string;
  currentVersion: string;
  direct: boolean;
}

interface VulnerabilityHint {
  packageName: string;
  advisoryIds: string[];
  severity: DesktopSecuritySeverity;
}

@Injectable()
export class DesktopDependencyHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly metadata: DesktopRepositoryMetadataService,
  ) {}

  async list(workspaceId: string, desktopAppId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const rows = await this.prisma.desktopDependency.findMany({
      where: { workspaceId, desktopAppId },
      orderBy: [
        { riskStatus: 'asc' },
        { ecosystem: 'asc' },
        { name: 'asc' },
      ],
    });

    return rows.map((row) => ({
      ...row,
      advisoryIds: this.stringArray(row.advisoryIds),
    }));
  }

  async scan(workspaceId: string, desktopAppId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);
    const snapshot = await this.metadata.load(workspaceId, desktopAppId);
    const parsed = this.parse(snapshot);
    const vulnerabilities = this.vulnerabilities(snapshot);

    const vulnerabilityByName = new Map(
      vulnerabilities.map((item) => [item.packageName.toLowerCase(), item]),
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.desktopDependency.deleteMany({
        where: { workspaceId, desktopAppId },
      });

      for (const dependency of parsed) {
        const vulnerability = vulnerabilityByName.get(
          dependency.name.toLowerCase(),
        );

        await transaction.desktopDependency.create({
          data: {
            workspaceId,
            desktopAppId,
            ecosystem: dependency.ecosystem,
            manifestPath: dependency.manifestPath,
            name: dependency.name,
            currentVersion: dependency.currentVersion,
            latestVersion: null,
            direct: dependency.direct,
            riskStatus: vulnerability
              ? DesktopDependencyRiskStatus.VULNERABLE
              : DesktopDependencyRiskStatus.UNKNOWN,
            severity: vulnerability?.severity ?? null,
            advisoryIds: vulnerability?.advisoryIds ?? [],
          },
        });
      }
    });

    return this.list(workspaceId, desktopAppId);
  }

  parse(snapshot: DesktopRepositoryMetadataSnapshot): ParsedDependency[] {
    const output = new Map<string, ParsedDependency>();

    const add = (dependency: ParsedDependency) => {
      const key = [
        dependency.ecosystem,
        dependency.manifestPath,
        dependency.name,
      ].join('|');
      output.set(key, dependency);
    };

    for (const [path, content] of Object.entries(snapshot.files)) {
      if (/(^|\/)package\.json$/i.test(path)) {
        this.parsePackageJson(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)Cargo\.toml$/i.test(path)) {
        this.parseCargo(path, content).forEach(add);
        continue;
      }

      if (/\.(csproj|fsproj|vbproj)$/i.test(path)) {
        this.parseCsproj(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)pom\.xml$/i.test(path)) {
        this.parsePom(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)build\.gradle(\.kts)?$/i.test(path)) {
        this.parseGradle(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)vcpkg\.json$/i.test(path)) {
        this.parseVcpkg(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)conanfile\.txt$/i.test(path)) {
        this.parseConan(path, content).forEach(add);
      }
    }

    return [...output.values()];
  }

  vulnerabilities(
    snapshot: DesktopRepositoryMetadataSnapshot,
  ): VulnerabilityHint[] {
    const output: VulnerabilityHint[] = [];

    for (const [path, content] of Object.entries(snapshot.files)) {
      if (!/(osv-scanner|npm-audit|pnpm-audit)\.json$/i.test(path)) {
        continue;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(content);
      } catch {
        continue;
      }

      this.collectVulnerabilities(parsed, output);
    }

    return output;
  }

  private parsePackageJson(path: string, content: string): ParsedDependency[] {
    try {
      const parsed = JSON.parse(content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
      };

      return [
        ...Object.entries(parsed.dependencies ?? {}).map(([name, version]) => ({
          ecosystem: DesktopDependencyEcosystem.NPM,
          manifestPath: path,
          name,
          currentVersion: String(version),
          direct: true,
        })),
        ...Object.entries(parsed.devDependencies ?? {}).map(([name, version]) => ({
          ecosystem: DesktopDependencyEcosystem.NPM,
          manifestPath: path,
          name,
          currentVersion: String(version),
          direct: true,
        })),
        ...Object.entries(parsed.optionalDependencies ?? {}).map(([name, version]) => ({
          ecosystem: DesktopDependencyEcosystem.NPM,
          manifestPath: path,
          name,
          currentVersion: String(version),
          direct: true,
        })),
      ];
    } catch {
      return [];
    }
  }

  private parseCargo(path: string, content: string): ParsedDependency[] {
    const output: ParsedDependency[] = [];
    let inDependencies = false;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (/^\[(dependencies|dev-dependencies|build-dependencies)\]$/.test(line)) {
        inDependencies = true;
        continue;
      }

      if (/^\[.+\]$/.test(line)) {
        inDependencies = false;
        continue;
      }

      if (!inDependencies || !line || line.startsWith('#')) {
        continue;
      }

      const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
      if (!match) continue;

      const name = match[1];
      const rhs = match[2];
      const version =
        rhs.match(/^['\"]([^'\"]+)['\"]/)?.[1] ??
        rhs.match(/version\s*=\s*['\"]([^'\"]+)['\"]/)?.[1] ??
        'workspace/git/path';

      output.push({
        ecosystem: DesktopDependencyEcosystem.CARGO,
        manifestPath: path,
        name,
        currentVersion: version,
        direct: true,
      });
    }

    return output;
  }

  private parseCsproj(path: string, content: string): ParsedDependency[] {
    return [...content.matchAll(
      /<PackageReference\s+Include=["']([^"']+)["'][^>]*(?:Version=["']([^"']+)["'])?[^>]*>(?:[\s\S]*?<Version>([^<]+)<\/Version>)?[\s\S]*?<\/PackageReference>|<PackageReference\s+Include=["']([^"']+)["'][^>]*Version=["']([^"']+)["'][^>]*\/>/gi,
    )].flatMap((match) => {
      const name = match[1] ?? match[4];
      const version = match[2] ?? match[3] ?? match[5];
      return name && version
        ? [{
            ecosystem: DesktopDependencyEcosystem.NUGET,
            manifestPath: path,
            name,
            currentVersion: version.trim(),
            direct: true,
          }]
        : [];
    });
  }

  private parsePom(path: string, content: string): ParsedDependency[] {
    return [...content.matchAll(/<dependency>([\s\S]*?)<\/dependency>/gi)]
      .flatMap((match) => {
        const block = match[1];
        const group = block.match(/<groupId>([^<]+)<\/groupId>/i)?.[1]?.trim();
        const artifact = block.match(/<artifactId>([^<]+)<\/artifactId>/i)?.[1]?.trim();
        const version = block.match(/<version>([^<]+)<\/version>/i)?.[1]?.trim();

        if (!artifact) return [];

        return [{
          ecosystem: DesktopDependencyEcosystem.MAVEN,
          manifestPath: path,
          name: group ? `${group}:${artifact}` : artifact,
          currentVersion: version ?? 'managed',
          direct: true,
        }];
      });
  }

  private parseGradle(path: string, content: string): ParsedDependency[] {
    const output: ParsedDependency[] = [];
    const regex = /(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s*\(?["']([^:"']+):([^:"']+):([^"']+)["']\)?/g;

    for (const match of content.matchAll(regex)) {
      output.push({
        ecosystem: DesktopDependencyEcosystem.GRADLE,
        manifestPath: path,
        name: `${match[1]}:${match[2]}`,
        currentVersion: match[3],
        direct: true,
      });
    }

    return output;
  }

  private parseVcpkg(path: string, content: string): ParsedDependency[] {
    try {
      const parsed = JSON.parse(content) as {
        dependencies?: Array<string | { name?: string; version?: string }>;
      };

      return (parsed.dependencies ?? []).flatMap((item) => {
        if (typeof item === 'string') {
          return [{
            ecosystem: DesktopDependencyEcosystem.VCPKG,
            manifestPath: path,
            name: item,
            currentVersion: 'manifest',
            direct: true,
          }];
        }

        if (!item.name) return [];

        return [{
          ecosystem: DesktopDependencyEcosystem.VCPKG,
          manifestPath: path,
          name: item.name,
          currentVersion: item.version ?? 'manifest',
          direct: true,
        }];
      });
    } catch {
      return [];
    }
  }

  private parseConan(path: string, content: string): ParsedDependency[] {
    const output: ParsedDependency[] = [];
    let requires = false;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (line.toLowerCase() === '[requires]') {
        requires = true;
        continue;
      }

      if (/^\[.+\]$/.test(line)) {
        requires = false;
        continue;
      }

      if (!requires || !line || line.startsWith('#')) continue;

      const [name, version] = line.split('/', 2);
      if (!name) continue;

      output.push({
        ecosystem: DesktopDependencyEcosystem.CONAN,
        manifestPath: path,
        name,
        currentVersion: version ?? 'unknown',
        direct: true,
      });
    }

    return output;
  }

  private collectVulnerabilities(
    value: unknown,
    output: VulnerabilityHint[],
  ): void {
    if (Array.isArray(value)) {
      value.forEach((item) => this.collectVulnerabilities(item, output));
      return;
    }

    if (!value || typeof value !== 'object') return;

    const record = value as Record<string, unknown>;
    const packageName =
      typeof record.package === 'string'
        ? record.package
        : typeof record.name === 'string'
          ? record.name
          : null;

    const ids = [
      record.id,
      record.advisory,
      record.cve,
    ]
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

    const severityRaw = String(record.severity ?? '').toUpperCase();
    const severity =
      severityRaw === 'CRITICAL'
        ? DesktopSecuritySeverity.CRITICAL
        : severityRaw === 'HIGH'
          ? DesktopSecuritySeverity.HIGH
          : severityRaw === 'MEDIUM' || severityRaw === 'MODERATE'
            ? DesktopSecuritySeverity.MEDIUM
            : severityRaw === 'LOW'
              ? DesktopSecuritySeverity.LOW
              : DesktopSecuritySeverity.INFO;

    if (packageName && ids.length > 0) {
      output.push({
        packageName,
        advisoryIds: ids,
        severity,
      });
    }

    Object.values(record).forEach((child) =>
      this.collectVulnerabilities(child, output),
    );
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
```

## 14.3 Security service

Create:

```text
apps/api/src/modules/desktop-apps/services/desktop-security.service.ts
```

```ts
import { PrismaService } from '../../../database/prisma.service';
import {
  DesktopSecurityCheckStatus,
  DesktopSecurityCheckType,
  DesktopSecuritySeverity,
} from 'src/generated/prisma/enums';
import { Injectable } from '@nestjs/common';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopDependencyHealthService } from './desktop-dependency-health.service';
import {
  DesktopRepositoryMetadataService,
  type DesktopRepositoryMetadataSnapshot,
} from './desktop-repository-metadata.service';

interface FindingDraft {
  findingKey: string;
  type: DesktopSecurityCheckType;
  status: DesktopSecurityCheckStatus;
  severity: DesktopSecuritySeverity;
  title: string;
  message: string;
  sourcePath: string | null;
  evidence: string[];
}

@Injectable()
export class DesktopSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly metadata: DesktopRepositoryMetadataService,
    private readonly dependencies: DesktopDependencyHealthService,
  ) {}

  async get(workspaceId: string, desktopAppId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const findings = await this.prisma.desktopSecurityFinding.findMany({
      where: { workspaceId, desktopAppId },
      orderBy: [
        { severity: 'desc' },
        { type: 'asc' },
      ],
    });

    const normalized = findings.map((finding) => ({
      ...finding,
      evidence: this.stringArray(finding.evidence),
    }));

    const statusFor = (type: DesktopSecurityCheckType) =>
      normalized.find((finding) => finding.type === type)?.status ??
      DesktopSecurityCheckStatus.UNKNOWN;

    return {
      windowsSigning: statusFor(DesktopSecurityCheckType.WINDOWS_SIGNING),
      macosSigning: statusFor(DesktopSecurityCheckType.MACOS_SIGNING),
      notarization: statusFor(
        DesktopSecurityCheckType.MACOS_NOTARIZATION,
      ),
      criticalRisks: normalized.filter(
        (finding) =>
          finding.severity === DesktopSecuritySeverity.CRITICAL &&
          finding.status !== DesktopSecurityCheckStatus.PASS,
      ).length,
      highRisks: normalized.filter(
        (finding) =>
          finding.severity === DesktopSecuritySeverity.HIGH &&
          finding.status !== DesktopSecurityCheckStatus.PASS,
      ).length,
      findings: normalized,
    };
  }

  async scan(workspaceId: string, desktopAppId: string) {
    const app = await this.desktopApps.findOne(workspaceId, desktopAppId);
    const snapshot = await this.metadata.load(workspaceId, desktopAppId);

    // Keep dependency inventory and vulnerability-derived findings aligned.
    const dependencies = await this.dependencies.scan(
      workspaceId,
      desktopAppId,
    );

    const findings = this.evaluate(snapshot, app.framework);

    for (const dependency of dependencies) {
      if (dependency.riskStatus !== 'VULNERABLE') continue;

      findings.push({
        findingKey: `dependency:${dependency.manifestPath}:${dependency.name}`,
        type: DesktopSecurityCheckType.DEPENDENCY_VULNERABILITY,
        status: DesktopSecurityCheckStatus.FAIL,
        severity:
          dependency.severity ?? DesktopSecuritySeverity.HIGH,
        title: `Vulnerable dependency: ${dependency.name}`,
        message:
          'A repository-provided vulnerability report contains this dependency.',
        sourcePath: dependency.manifestPath,
        evidence: dependency.advisoryIds,
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.desktopSecurityFinding.deleteMany({
        where: { workspaceId, desktopAppId },
      });

      for (const finding of findings) {
        await transaction.desktopSecurityFinding.create({
          data: {
            workspaceId,
            desktopAppId,
            ...finding,
            evidence: finding.evidence,
          },
        });
      }
    });

    return this.get(workspaceId, desktopAppId);
  }

  evaluate(
    snapshot: DesktopRepositoryMetadataSnapshot,
    framework: string,
  ): FindingDraft[] {
    const findings: FindingDraft[] = [];
    const all = Object.entries(snapshot.files);
    const combined = all.map(([, content]) => content).join('\n');

    const windowsEvidence: string[] = [];
    const macEvidence: string[] = [];
    const notarizationEvidence: string[] = [];

    for (const [path, content] of all) {
      if (
        /certificate(File|SubjectName|Sha1)|certificateThumbprint|signtool|SignAssembly\s*>\s*true/i.test(
          content,
        )
      ) {
        windowsEvidence.push(path);
      }

      if (
        /CODE_SIGN_STYLE|DEVELOPMENT_TEAM|signingIdentity|hardenedRuntime\s*[:=]\s*true/i.test(
          content,
        )
      ) {
        macEvidence.push(path);
      }

      if (
        /notarize|notarytool|APPLE_ID|APPLE_TEAM_ID|APPLE_APP_SPECIFIC_PASSWORD/i.test(
          content,
        )
      ) {
        notarizationEvidence.push(path);
      }
    }

    findings.push(
      this.binaryFinding(
        'windows-signing',
        DesktopSecurityCheckType.WINDOWS_SIGNING,
        windowsEvidence.length > 0,
        'Windows signing configuration',
        windowsEvidence.length > 0
          ? 'Repository metadata contains Windows signing configuration markers.'
          : 'No Windows signing configuration marker was detected in scanned metadata.',
        windowsEvidence,
      ),
    );

    findings.push(
      this.binaryFinding(
        'macos-signing',
        DesktopSecurityCheckType.MACOS_SIGNING,
        macEvidence.length > 0,
        'macOS signing configuration',
        macEvidence.length > 0
          ? 'Repository metadata contains macOS code-signing configuration markers.'
          : 'No macOS code-signing configuration marker was detected in scanned metadata.',
        macEvidence,
      ),
    );

    findings.push(
      this.binaryFinding(
        'macos-notarization',
        DesktopSecurityCheckType.MACOS_NOTARIZATION,
        notarizationEvidence.length > 0,
        'macOS notarization configuration',
        notarizationEvidence.length > 0
          ? 'Repository metadata contains notarization workflow markers.'
          : 'No notarization workflow marker was detected in scanned metadata.',
        notarizationEvidence,
      ),
    );

    if (
      framework === 'ELECTRON' &&
      /nodeIntegration\s*[:=]\s*true/i.test(combined)
    ) {
      findings.push({
        findingKey: 'packaging:electron-node-integration',
        type: DesktopSecurityCheckType.PACKAGING_CONFIGURATION,
        status: DesktopSecurityCheckStatus.WARN,
        severity: DesktopSecuritySeverity.HIGH,
        title: 'Electron nodeIntegration appears enabled',
        message:
          'Enabling Node.js integration in renderer content increases the impact of renderer compromise. Review the BrowserWindow security configuration.',
        sourcePath: null,
        evidence: ['nodeIntegration=true'],
      });
    }

    if (
      framework === 'ELECTRON' &&
      !/asar\s*[:=]\s*(true|['\"]?[^false])/i.test(combined)
    ) {
      findings.push({
        findingKey: 'packaging:electron-asar',
        type: DesktopSecurityCheckType.PACKAGING_CONFIGURATION,
        status: DesktopSecurityCheckStatus.WARN,
        severity: DesktopSecuritySeverity.MEDIUM,
        title: 'Electron package hardening is not explicit',
        message:
          'No explicit ASAR packaging configuration was detected. Verify the release packaging configuration before publication.',
        sourcePath: null,
        evidence: [],
      });
    }

    return findings;
  }

  private binaryFinding(
    findingKey: string,
    type: DesktopSecurityCheckType,
    configured: boolean,
    title: string,
    message: string,
    evidence: string[],
  ): FindingDraft {
    return {
      findingKey,
      type,
      status: configured
        ? DesktopSecurityCheckStatus.PASS
        : DesktopSecurityCheckStatus.UNKNOWN,
      severity: configured
        ? DesktopSecuritySeverity.INFO
        : DesktopSecuritySeverity.MEDIUM,
      title,
      message,
      sourcePath: evidence[0] ?? null,
      evidence,
    };
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
```

Important security behavior: this scanner only reports **configuration markers and safe evidence strings**. It never returns environment values, certificate blobs, signing private keys, telemetry tokens, Apple app-specific passwords, or other secret material.

## 14.4 Security-health controller

Create:

```text
apps/api/src/modules/desktop-apps/controllers/desktop-security-health.controller.ts
```

```ts
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { DesktopDependencyHealthService } from '../services/desktop-dependency-health.service';
import { DesktopSecurityService } from '../services/desktop-security.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Dependency and Security Health')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(
  JwtAuthGuard,
  WorkspaceAccessGuard,
  WorkspaceRolesGuard,
)
export class DesktopSecurityHealthController {
  constructor(
    private readonly dependencies: DesktopDependencyHealthService,
    private readonly security: DesktopSecurityService,
  ) {}

  @Get('dependencies')
  listDependencies(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
  ) {
    return this.dependencies.list(workspaceId, desktopAppId);
  }

  @Post('dependencies/scan')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  scanDependencies(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
  ) {
    return this.dependencies.scan(workspaceId, desktopAppId);
  }

  @Get('security')
  getSecurity(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
  ) {
    return this.security.get(workspaceId, desktopAppId);
  }

  @Post('security/scan')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  scanSecurity(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
  ) {
    return this.security.scan(workspaceId, desktopAppId);
  }
}
```

---

# 15. DesktopAppsModule — final Phase 12–14 registration

Open:

```text
apps/api/src/modules/desktop-apps/desktop-apps.module.ts
```

Keep every Phase 1–11 registration and add these imports:

```ts
import { DesktopCrashesController } from './controllers/desktop-crashes.controller';
import { DesktopPerformanceController } from './controllers/desktop-performance.controller';
import { DesktopSecurityHealthController } from './controllers/desktop-security-health.controller';
import { DesktopTelemetryController } from './controllers/desktop-telemetry.controller';

import { DesktopCrashesService } from './services/desktop-crashes.service';
import { DesktopDependencyHealthService } from './services/desktop-dependency-health.service';
import { DesktopPerformanceService } from './services/desktop-performance.service';
import { DesktopRepositoryMetadataService } from './services/desktop-repository-metadata.service';
import { DesktopRuntimeService } from './services/desktop-runtime.service';
import { DesktopSecurityService } from './services/desktop-security.service';
import { DesktopTelemetryProviderRegistryService } from './services/desktop-telemetry-provider-registry.service';
import { DesktopTelemetrySecretService } from './services/desktop-telemetry-secret.service';
import { DesktopTelemetryService } from './services/desktop-telemetry.service';
import { DesktopTelemetryUrlPolicyService } from './services/desktop-telemetry-url-policy.service';
import { NormalizedHttpDesktopTelemetryProvider } from './telemetry/normalized-http-desktop-telemetry.provider';
```

Add to `controllers`:

```ts
DesktopTelemetryController,
DesktopPerformanceController,
DesktopCrashesController,
DesktopSecurityHealthController,
```

Add to `providers`:

```ts
DesktopTelemetrySecretService,
DesktopTelemetryUrlPolicyService,
NormalizedHttpDesktopTelemetryProvider,
DesktopTelemetryProviderRegistryService,
DesktopTelemetryService,
DesktopRuntimeService,
DesktopPerformanceService,
DesktopCrashesService,
DesktopRepositoryMetadataService,
DesktopDependencyHealthService,
DesktopSecurityService,
```

Add to `exports` where later phases need them:

```ts
DesktopTelemetryService,
DesktopPerformanceService,
DesktopCrashesService,
DesktopDependencyHealthService,
DesktopSecurityService,
```

The module still imports the already-existing `RepositoriesModule` so `GithubCodeService` remains reused rather than duplicated.

---

# 16. Database migration

After the three Prisma model files and relations are in place:

```powershell
pnpm --dir apps/api exec prisma format
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate dev --name desktop_telemetry_runtime_security
pnpm --dir apps/api exec prisma generate
```

The generated migration should create:

```text
desktop_telemetry_integrations
desktop_metrics
desktop_crashes
desktop_dependencies
desktop_security_findings
```

and all enums/indexes/foreign keys above. Do not hand-edit an already-applied migration; generate a new migration from the actual schema state.

---

# 17. Frontend API — Phases 12–14

Open:

```text
apps/web/src/features/desktop-apps/desktop-apps-api.ts
```

Add the following types to the existing shared-types import and append the functions below:

```ts
import type {
  ConnectDesktopTelemetryInput,
  DesktopCrash,
  DesktopDependency,
  DesktopPerformanceResponse,
  DesktopRuntimeFilters,
  DesktopSecuritySummary,
  DesktopTelemetryIntegration,
  DesktopTelemetrySnapshot,
  DesktopTelemetrySyncResult,
} from '@command-center/shared-types';

function runtimeSearch(filters: DesktopRuntimeFilters = {}): string {
  const search = new URLSearchParams();

  if (filters.from) search.set('from', filters.from);
  if (filters.to) search.set('to', filters.to);
  if (filters.version) search.set('version', filters.version);
  if (filters.platform) search.set('platform', filters.platform);
  if (filters.architecture) {
    search.set('architecture', filters.architecture);
  }
  if (filters.channel) search.set('channel', filters.channel);

  const value = search.toString();
  return value ? `?${value}` : '';
}

export function listDesktopTelemetryIntegrations(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<DesktopTelemetryIntegration[]>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/telemetry`,
  );
}

export function connectDesktopTelemetry(
  workspaceId: string,
  desktopAppId: string,
  input: ConnectDesktopTelemetryInput,
) {
  return apiRequest<DesktopTelemetryIntegration>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/telemetry`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function previewDesktopTelemetry(
  workspaceId: string,
  desktopAppId: string,
  integrationId: string,
) {
  return apiRequest<DesktopTelemetrySnapshot>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/telemetry/${integrationId}/preview`,
    {
      method: 'POST',
    },
  );
}

export function syncDesktopTelemetry(
  workspaceId: string,
  desktopAppId: string,
  integrationId: string,
) {
  return apiRequest<DesktopTelemetrySyncResult>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/telemetry/${integrationId}/sync`,
    {
      method: 'POST',
    },
  );
}

export function disconnectDesktopTelemetry(
  workspaceId: string,
  desktopAppId: string,
  integrationId: string,
) {
  return apiRequest<{ success: true }>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/telemetry/${integrationId}`,
    {
      method: 'DELETE',
    },
  );
}

export function getDesktopPerformance(
  workspaceId: string,
  desktopAppId: string,
  filters: DesktopRuntimeFilters = {},
) {
  return apiRequest<DesktopPerformanceResponse>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/performance${runtimeSearch(filters)}`,
  );
}

export function listDesktopCrashes(
  workspaceId: string,
  desktopAppId: string,
  filters: DesktopRuntimeFilters = {},
) {
  return apiRequest<DesktopCrash[]>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/crashes${runtimeSearch(filters)}`,
  );
}

export function listDesktopDependencies(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<DesktopDependency[]>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/dependencies`,
  );
}

export function scanDesktopDependencies(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<DesktopDependency[]>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/dependencies/scan`,
    {
      method: 'POST',
    },
  );
}

export function getDesktopSecurity(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<DesktopSecuritySummary>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/security`,
  );
}

export function scanDesktopSecurity(
  workspaceId: string,
  desktopAppId: string,
) {
  return apiRequest<DesktopSecuritySummary>(
    `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/security/scan`,
    {
      method: 'POST',
    },
  );
}
```

---

# 18. Frontend — Telemetry Settings

Create:

```text
apps/web/src/features/desktop-apps/desktop-telemetry-settings.tsx
```

```tsx
'use client';

import {
  connectDesktopTelemetry,
  disconnectDesktopTelemetry,
  listDesktopTelemetryIntegrations,
  previewDesktopTelemetry,
  syncDesktopTelemetry,
} from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  DesktopTelemetryIntegration,
  DesktopTelemetryProvider,
  DesktopTelemetrySnapshot,
} from '@command-center/shared-types';
import {
  Activity,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

const PROVIDERS: Array<{
  value: DesktopTelemetryProvider;
  label: string;
}> = [
  { value: 'SENTRY', label: 'Sentry' },
  { value: 'DATADOG', label: 'Datadog' },
  { value: 'NEW_RELIC', label: 'New Relic' },
  { value: 'OPENTELEMETRY', label: 'OpenTelemetry' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function DesktopTelemetrySettings({
  workspaceId,
  desktopAppId,
}: Props) {
  const [integrations, setIntegrations] = useState<
    DesktopTelemetryIntegration[]
  >([]);
  const [provider, setProvider] =
    useState<DesktopTelemetryProvider>('SENTRY');
  const [externalProjectId, setExternalProjectId] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [preview, setPreview] =
    useState<DesktopTelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setIntegrations(
        await listDesktopTelemetryIntegrations(
          workspaceId,
          desktopAppId,
        ),
      );
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setPreview(null);

    try {
      await connectDesktopTelemetry(workspaceId, desktopAppId, {
        provider,
        externalProjectId: externalProjectId.trim(),
        endpointUrl: endpointUrl.trim(),
        secret,
      });

      setSecret('');
      await load();
    } catch (connectError: unknown) {
      setError(getErrorMessage(connectError));
    } finally {
      setSaving(false);
    }
  }

  async function previewIntegration(integrationId: string) {
    setSaving(true);
    setError(null);

    try {
      setPreview(
        await previewDesktopTelemetry(
          workspaceId,
          desktopAppId,
          integrationId,
        ),
      );
      await load();
    } catch (previewError: unknown) {
      setError(getErrorMessage(previewError));
    } finally {
      setSaving(false);
    }
  }

  async function sync(integrationId: string) {
    setSaving(true);
    setError(null);

    try {
      await syncDesktopTelemetry(
        workspaceId,
        desktopAppId,
        integrationId,
      );
      await load();
    } catch (syncError: unknown) {
      setError(getErrorMessage(syncError));
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(integrationId: string) {
    setSaving(true);
    setError(null);

    try {
      await disconnectDesktopTelemetry(
        workspaceId,
        desktopAppId,
        integrationId,
      );
      await load();
    } catch (disconnectError: unknown) {
      setError(getErrorMessage(disconnectError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='space-y-6'>
      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex items-start gap-3'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600'>
            <Activity className='size-5' aria-hidden='true' />
          </div>

          <div>
            <h2 className='text-lg font-semibold text-slate-950'>
              Runtime Monitoring
            </h2>
            <p className='mt-1 text-sm leading-6 text-slate-500'>
              Connect a provider through the normalized telemetry adapter.
              Provider tokens are encrypted by the API and never returned to
              the browser.
            </p>
          </div>
        </div>

        {error ? (
          <div
            role='alert'
            className='mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={connect} className='mt-6 grid gap-4 md:grid-cols-2'>
          <label className='text-sm font-medium text-slate-800'>
            Provider
            <select
              aria-label='Telemetry provider'
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as DesktopTelemetryProvider)
              }
              disabled={saving}
              className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
            >
              {PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className='text-sm font-medium text-slate-800'>
            External project ID
            <input
              aria-label='External project ID'
              value={externalProjectId}
              onChange={(event) => setExternalProjectId(event.target.value)}
              required
              maxLength={255}
              className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              placeholder='organization/project'
            />
          </label>

          <label className='text-sm font-medium text-slate-800 md:col-span-2'>
            Normalized adapter endpoint
            <input
              aria-label='Telemetry endpoint URL'
              value={endpointUrl}
              onChange={(event) => setEndpointUrl(event.target.value)}
              required
              className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              placeholder='https://telemetry.example.com/desktop-snapshot'
            />
          </label>

          <label className='text-sm font-medium text-slate-800 md:col-span-2'>
            Provider secret
            <input
              aria-label='Telemetry provider secret'
              type='password'
              autoComplete='new-password'
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              required
              minLength={8}
              className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              placeholder='Stored encrypted; never returned'
            />
          </label>

          <div className='md:col-span-2 flex justify-end'>
            <button
              type='submit'
              disabled={saving}
              className='inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50'
            >
              {saving ? <Loader2 className='size-4 animate-spin' /> : null}
              Connect Provider
            </button>
          </div>
        </form>
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-slate-950'>
              Configured providers
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              Provider status and last sync are safe metadata only.
            </p>
          </div>
          <button
            type='button'
            onClick={() => void load()}
            className='inline-flex items-center gap-2 text-sm font-semibold text-slate-600'
          >
            <RefreshCw className='size-4' /> Refresh
          </button>
        </div>

        {loading ? (
          <div className='mt-5 flex items-center gap-2 text-sm text-slate-500'>
            <Loader2 className='size-4 animate-spin' /> Loading telemetry...
          </div>
        ) : integrations.length === 0 ? (
          <div className='mt-5 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500'>
            No telemetry provider configured.
          </div>
        ) : (
          <div className='mt-5 space-y-3'>
            {integrations.map((integration) => (
              <article
                key={integration.id}
                className='rounded-xl border border-slate-200 p-4'
              >
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='size-4 text-emerald-600' />
                      <p className='font-semibold text-slate-950'>
                        {integration.provider}
                      </p>
                      <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'>
                        {integration.status}
                      </span>
                    </div>
                    <p className='mt-2 text-sm text-slate-500'>
                      Project: {integration.externalProjectId}
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      Secret: {integration.hasSecret ? 'Configured' : 'Removed'}
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      Last sync:{' '}
                      {integration.lastSyncedAt
                        ? new Date(integration.lastSyncedAt).toLocaleString()
                        : 'Never'}
                    </p>
                    {integration.lastError ? (
                      <p className='mt-2 text-sm text-red-600'>
                        {integration.lastError}
                      </p>
                    ) : null}
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      disabled={saving || integration.status === 'DISCONNECTED'}
                      onClick={() => void previewIntegration(integration.id)}
                      className='h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50'
                    >
                      Preview
                    </button>
                    <button
                      type='button'
                      disabled={saving || integration.status === 'DISCONNECTED'}
                      onClick={() => void sync(integration.id)}
                      className='h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50'
                    >
                      Sync Now
                    </button>
                    <button
                      type='button'
                      disabled={saving || integration.status === 'DISCONNECTED'}
                      onClick={() => void disconnect(integration.id)}
                      className='inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-50'
                    >
                      <Trash2 className='size-4' /> Disconnect
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {preview ? (
        <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
          <h2 className='text-lg font-semibold text-slate-950'>
            Normalized Preview
          </h2>
          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
            <CountCard label='Performance samples' value={preview.performance.length} />
            <CountCard label='Crash groups' value={preview.crashes.length} />
            <CountCard label='Versions' value={preview.versions.length} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-xl bg-slate-50 p-4'>
      <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>
        {label}
      </p>
      <p className='mt-1 text-2xl font-bold text-slate-950'>{value}</p>
    </div>
  );
}
```

---

# 19. Frontend — Performance

Create:

```text
apps/web/src/features/desktop-apps/desktop-performance.tsx
```

```tsx
'use client';

import { getDesktopPerformance } from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  DesktopPerformanceResponse,
  DesktopRuntimeFilters,
} from '@command-center/shared-types';
import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function DesktopPerformance({ workspaceId, desktopAppId }: Props) {
  const [data, setData] = useState<DesktopPerformanceResponse | null>(null);
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [architecture, setArchitecture] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: DesktopRuntimeFilters = {
      ...(version ? { version } : {}),
      ...(platform
        ? { platform: platform as DesktopRuntimeFilters['platform'] }
        : {}),
      ...(architecture
        ? {
            architecture:
              architecture as DesktopRuntimeFilters['architecture'],
          }
        : {}),
    };

    try {
      setData(await getDesktopPerformance(workspaceId, desktopAppId, filters));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId, version, platform, architecture]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-slate-950'>
              Runtime Performance
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              Normalized runtime health by version, platform and architecture.
            </p>
          </div>

          <div className='grid gap-2 sm:grid-cols-3'>
            <input
              aria-label='Performance version filter'
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder='Version'
              className='h-9 rounded-lg border border-slate-300 px-3 text-sm'
            />
            <select
              aria-label='Performance platform filter'
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className='h-9 rounded-lg border border-slate-300 px-3 text-sm'
            >
              <option value=''>All platforms</option>
              <option value='WINDOWS'>Windows</option>
              <option value='MACOS'>macOS</option>
              <option value='LINUX'>Linux</option>
              <option value='CROSS_PLATFORM'>Cross-platform</option>
            </select>
            <select
              aria-label='Performance architecture filter'
              value={architecture}
              onChange={(event) => setArchitecture(event.target.value)}
              className='h-9 rounded-lg border border-slate-300 px-3 text-sm'
            >
              <option value=''>All architectures</option>
              <option value='X64'>x64</option>
              <option value='ARM64'>ARM64</option>
              <option value='X86'>x86</option>
              <option value='UNIVERSAL'>Universal</option>
            </select>
          </div>
        </div>

        {error ? (
          <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
            {error}
            <button
              type='button'
              onClick={() => void load()}
              className='ml-3 font-semibold underline'
            >
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className='mt-6 flex items-center gap-2 text-sm text-slate-500'>
            <Loader2 className='size-4 animate-spin' /> Loading performance...
          </div>
        ) : data && data.summary.sampleCount > 0 ? (
          <div className='mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <MetricCard
              label='Crash-free users'
              value={formatPercent(data.summary.crashFreeUsersPercent)}
            />
            <MetricCard
              label='Startup'
              value={formatMs(data.summary.startupMs)}
            />
            <MetricCard
              label='Memory'
              value={formatNumber(data.summary.memoryMb, ' MB')}
            />
            <MetricCard
              label='CPU'
              value={formatPercent(data.summary.cpuPercent)}
            />
            <MetricCard
              label='Hang rate'
              value={formatPercent(data.summary.hangRatePercent)}
            />
            <MetricCard
              label='Network latency'
              value={formatMs(data.summary.networkLatencyMs)}
            />
            <MetricCard
              label='API failure rate'
              value={formatPercent(data.summary.apiFailureRatePercent)}
            />
            <MetricCard
              label='Version adoption'
              value={formatPercent(data.summary.versionAdoptionPercent)}
            />
          </div>
        ) : !loading && !error ? (
          <div className='mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500'>
            No performance metrics match the current filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-slate-50 p-4'>
      <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>
        {label}
      </p>
      <p className='mt-1 text-xl font-bold text-slate-950'>{value}</p>
    </div>
  );
}

function formatPercent(value: number | null): string {
  return value === null ? 'No data' : `${value.toFixed(1)}%`;
}

function formatMs(value: number | null): string {
  if (value === null) return 'No data';
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function formatNumber(value: number | null, suffix: string): string {
  return value === null ? 'No data' : `${value.toFixed(1)}${suffix}`;
}
```

---

# 20. Frontend — Crashes

Create:

```text
apps/web/src/features/desktop-apps/desktop-crashes.tsx
```

```tsx
'use client';

import { listDesktopCrashes } from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  DesktopCrash,
  DesktopRuntimeFilters,
} from '@command-center/shared-types';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function DesktopCrashes({ workspaceId, desktopAppId }: Props) {
  const [crashes, setCrashes] = useState<DesktopCrash[]>([]);
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: DesktopRuntimeFilters = {
      ...(version ? { version } : {}),
      ...(platform
        ? { platform: platform as DesktopRuntimeFilters['platform'] }
        : {}),
    };

    try {
      setCrashes(await listDesktopCrashes(workspaceId, desktopAppId, filters));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId, version, platform]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-slate-950'>Crashes</h2>
          <p className='mt-1 text-sm text-slate-500'>
            Crash groups ordered by impact and recency.
          </p>
        </div>
        <div className='flex gap-2'>
          <input
            aria-label='Crash version filter'
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            placeholder='Version'
            className='h-9 w-32 rounded-lg border border-slate-300 px-3 text-sm'
          />
          <select
            aria-label='Crash platform filter'
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className='h-9 rounded-lg border border-slate-300 px-3 text-sm'
          >
            <option value=''>All platforms</option>
            <option value='WINDOWS'>Windows</option>
            <option value='MACOS'>macOS</option>
            <option value='LINUX'>Linux</option>
            <option value='CROSS_PLATFORM'>Cross-platform</option>
          </select>
        </div>
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className='mt-6 flex items-center gap-2 text-sm text-slate-500'>
          <Loader2 className='size-4 animate-spin' /> Loading crashes...
        </div>
      ) : crashes.length === 0 ? (
        <div className='mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500'>
          No crashes match the current filters.
        </div>
      ) : (
        <div className='mt-6 space-y-3'>
          {crashes.map((crash) => (
            <article key={crash.id} className='rounded-xl border border-slate-200 p-4'>
              <div className='flex items-start gap-3'>
                <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600'>
                  <AlertTriangle className='size-4' />
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='font-semibold text-slate-950'>{crash.message}</h3>
                  <p className='mt-1 break-all text-xs text-slate-400'>
                    {crash.fingerprint}
                  </p>
                  <div className='mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600'>
                    <span className='rounded-md bg-slate-100 px-2 py-1'>
                      {crash.platform ?? 'Unknown platform'}
                    </span>
                    <span className='rounded-md bg-slate-100 px-2 py-1'>
                      {crash.architecture ?? 'Unknown arch'}
                    </span>
                    <span className='rounded-md bg-slate-100 px-2 py-1'>
                      {crash.version ?? 'Unknown version'}
                    </span>
                    <span className='rounded-md bg-red-50 px-2 py-1 text-red-700'>
                      {crash.count} events
                    </span>
                    <span className='rounded-md bg-amber-50 px-2 py-1 text-amber-700'>
                      {crash.affectedUsers} users
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
```

---

# 21. Frontend — Dependencies

Create:

```text
apps/web/src/features/desktop-apps/desktop-dependencies.tsx
```

```tsx
'use client';

import {
  listDesktopDependencies,
  scanDesktopDependencies,
} from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopDependency } from '@command-center/shared-types';
import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function DesktopDependencies({ workspaceId, desktopAppId }: Props) {
  const [dependencies, setDependencies] = useState<DesktopDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setDependencies(await listDesktopDependencies(workspaceId, desktopAppId));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function scan() {
    setScanning(true);
    setError(null);

    try {
      setDependencies(
        await scanDesktopDependencies(workspaceId, desktopAppId),
      );
    } catch (scanError: unknown) {
      setError(getErrorMessage(scanError));
    } finally {
      setScanning(false);
    }
  }

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-slate-950'>Dependencies</h2>
          <p className='mt-1 text-sm text-slate-500'>
            Repository manifests normalized across npm, Cargo, NuGet, Maven,
            Gradle, Conan and vcpkg.
          </p>
        </div>
        <button
          type='button'
          disabled={scanning}
          onClick={() => void scan()}
          className='inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50'
        >
          {scanning ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <RefreshCw className='size-4' />
          )}
          Scan Repository
        </button>
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className='mt-6 flex items-center gap-2 text-sm text-slate-500'>
          <Loader2 className='size-4 animate-spin' /> Loading dependencies...
        </div>
      ) : dependencies.length === 0 ? (
        <div className='mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500'>
          No dependency inventory yet. Run a repository scan.
        </div>
      ) : (
        <div className='mt-6 overflow-x-auto'>
          <table className='min-w-full text-left text-sm'>
            <thead className='border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400'>
              <tr>
                <th className='px-3 py-2'>Dependency</th>
                <th className='px-3 py-2'>Ecosystem</th>
                <th className='px-3 py-2'>Current</th>
                <th className='px-3 py-2'>Latest</th>
                <th className='px-3 py-2'>Risk</th>
                <th className='px-3 py-2'>Manifest</th>
              </tr>
            </thead>
            <tbody>
              {dependencies.map((dependency) => (
                <tr key={dependency.id} className='border-b border-slate-100'>
                  <td className='px-3 py-3 font-semibold text-slate-900'>
                    {dependency.name}
                  </td>
                  <td className='px-3 py-3 text-slate-600'>
                    {dependency.ecosystem}
                  </td>
                  <td className='px-3 py-3 text-slate-600'>
                    {dependency.currentVersion}
                  </td>
                  <td className='px-3 py-3 text-slate-600'>
                    {dependency.latestVersion ?? 'Unknown'}
                  </td>
                  <td className='px-3 py-3'>
                    <span className='rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'>
                      {dependency.riskStatus}
                    </span>
                  </td>
                  <td className='max-w-xs truncate px-3 py-3 text-slate-500'>
                    {dependency.manifestPath}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

---

# 22. Frontend — Security

Create:

```text
apps/web/src/features/desktop-apps/desktop-security.tsx
```

```tsx
'use client';

import {
  getDesktopSecurity,
  scanDesktopSecurity,
} from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopSecuritySummary } from '@command-center/shared-types';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function DesktopSecurity({ workspaceId, desktopAppId }: Props) {
  const [data, setData] = useState<DesktopSecuritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setData(await getDesktopSecurity(workspaceId, desktopAppId));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function scan() {
    setScanning(true);
    setError(null);

    try {
      setData(await scanDesktopSecurity(workspaceId, desktopAppId));
    } catch (scanError: unknown) {
      setError(getErrorMessage(scanError));
    } finally {
      setScanning(false);
    }
  }

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600'>
              <ShieldCheck className='size-5' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-slate-950'>Security Health</h2>
              <p className='mt-1 text-sm text-slate-500'>
                Signing, notarization, packaging and dependency risk metadata.
                Secret values are never rendered.
              </p>
            </div>
          </div>
          <button
            type='button'
            disabled={scanning}
            onClick={() => void scan()}
            className='inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50'
          >
            {scanning ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <RefreshCw className='size-4' />
            )}
            Run Security Scan
          </button>
        </div>

        {error ? (
          <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className='mt-6 flex items-center gap-2 text-sm text-slate-500'>
            <Loader2 className='size-4 animate-spin' /> Loading security health...
          </div>
        ) : data ? (
          <>
            <div className='mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
              <SecurityCard label='Windows signing' value={data.windowsSigning} />
              <SecurityCard label='macOS signing' value={data.macosSigning} />
              <SecurityCard label='Notarization' value={data.notarization} />
              <SecurityCard label='Critical risks' value={String(data.criticalRisks)} />
              <SecurityCard label='High risks' value={String(data.highRisks)} />
            </div>

            {data.findings.length === 0 ? (
              <div className='mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500'>
                No security scan results yet.
              </div>
            ) : (
              <div className='mt-6 space-y-3'>
                {data.findings.map((finding) => (
                  <article key={finding.id} className='rounded-xl border border-slate-200 p-4'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='font-semibold text-slate-950'>{finding.title}</h3>
                      <span className='rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'>
                        {finding.status}
                      </span>
                      <span className='rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'>
                        {finding.severity}
                      </span>
                    </div>
                    <p className='mt-2 text-sm leading-6 text-slate-600'>{finding.message}</p>
                    {finding.sourcePath ? (
                      <p className='mt-2 break-all text-xs text-slate-400'>
                        Source: {finding.sourcePath}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

function SecurityCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-slate-50 p-4'>
      <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>
        {label}
      </p>
      <p className='mt-1 text-lg font-bold text-slate-950'>{value}</p>
    </div>
  );
}
```

---

# 23. Desktop routes

Create these route files.

## 23.1 Settings / Telemetry

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/settings/page.tsx
```

```tsx
import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopTelemetrySettings } from '@/features/desktop-apps/desktop-telemetry-settings';

export default async function DesktopSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; desktopAppId: string }>;
}) {
  const value = await params;

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <DesktopAppSubNav
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
      <DesktopTelemetrySettings
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
    </main>
  );
}
```

## 23.2 Performance

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/performance/page.tsx
```

```tsx
import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopPerformance } from '@/features/desktop-apps/desktop-performance';

export default async function DesktopPerformancePage({
  params,
}: {
  params: Promise<{ workspaceId: string; desktopAppId: string }>;
}) {
  const value = await params;

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <DesktopAppSubNav
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
      <DesktopPerformance
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
    </main>
  );
}
```

## 23.3 Crashes

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/crashes/page.tsx
```

```tsx
import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopCrashes } from '@/features/desktop-apps/desktop-crashes';

export default async function DesktopCrashesPage({
  params,
}: {
  params: Promise<{ workspaceId: string; desktopAppId: string }>;
}) {
  const value = await params;

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <DesktopAppSubNav
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
      <DesktopCrashes
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
    </main>
  );
}
```

## 23.4 Dependencies

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/dependencies/page.tsx
```

```tsx
import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopDependencies } from '@/features/desktop-apps/desktop-dependencies';

export default async function DesktopDependenciesPage({
  params,
}: {
  params: Promise<{ workspaceId: string; desktopAppId: string }>;
}) {
  const value = await params;

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <DesktopAppSubNav
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
      <DesktopDependencies
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
    </main>
  );
}
```

## 23.5 Security

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/security/page.tsx
```

```tsx
import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopSecurity } from '@/features/desktop-apps/desktop-security';

export default async function DesktopSecurityPage({
  params,
}: {
  params: Promise<{ workspaceId: string; desktopAppId: string }>;
}) {
  const value = await params;

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <DesktopAppSubNav
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
      <DesktopSecurity
        workspaceId={value.workspaceId}
        desktopAppId={value.desktopAppId}
      />
    </main>
  );
}
```

---

# 24. Desktop sub-navigation — final through Phase 14

Update:

```text
apps/web/src/features/desktop-apps/desktop-app-sub-nav.tsx
```

Keep the existing component logic and use:

```tsx
const LIVE_TABS = [
  { label: 'Overview', path: '' },
  { label: 'Code', path: '/code' },
  { label: 'Builds', path: '/builds' },
  { label: 'Tests', path: '/tests' },
  { label: 'Releases', path: '/releases' },
  { label: 'Performance', path: '/performance' },
  { label: 'Crashes', path: '/crashes' },
  { label: 'Dependencies', path: '/dependencies' },
  { label: 'Security', path: '/security' },
  { label: 'Settings', path: '/settings' },
] as const;

const FUTURE_TABS = [] as const;
```

After Phase 14, every tab from the planned Desktop detail navigation except Alerts is now live. Alerts become live in Phase 15.

---

# 25. Frontend feature exports

Open:

```text
apps/web/src/features/desktop-apps/index.ts
```

Keep all existing exports and add:

```ts
export * from './desktop-telemetry-settings';
export * from './desktop-performance';
export * from './desktop-crashes';
export * from './desktop-dependencies';
export * from './desktop-security';
```

---

# 26. API E2E — Phase 12 Telemetry

Create:

```text
packages/test-code/api/e2e/desktop-telemetry.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import {
  addWorkspaceMember,
  registerWorkspaceTestUser,
} from '../helpers/workspace';
import { WorkspaceRole } from 'src/generated/prisma/enums';
import {
  API,
  createDesktopApp,
} from './helpers/desktop-test-fixtures';

function telemetryPath(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/telemetry`;
}

describe('Desktop Telemetry E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      'base64',
    );

    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
    delete process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;
  });

  it('connects provider and never returns the secret', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const response = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'SENTRY',
        externalProjectId: 'command-center/desktop',
        endpointUrl: 'mock://success/snapshot',
        secret: 'super-secret-provider-token',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      provider: 'SENTRY',
      status: 'CONNECTED',
      externalProjectId: 'command-center/desktop',
      hasSecret: true,
    });

    expect(JSON.stringify(response.body)).not.toContain(
      'super-secret-provider-token',
    );
    expect(response.body.secretCiphertext).toBeUndefined();

    const stored = await prisma.desktopTelemetryIntegration.findUniqueOrThrow({
      where: { id: response.body.id },
    });

    expect(stored.secretCiphertext).not.toBe('super-secret-provider-token');
    expect(stored.secretCiphertext.length).toBeGreaterThan(20);
  });

  it('previews normalized provider output', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const connected = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'desktop-runtime',
        endpointUrl: 'mock://success/snapshot',
        secret: 'preview-secret',
      })
      .expect(201);

    const response = await owner.agent
      .post(
        `${telemetryPath(owner.workspaceId, desktopApp.id)}/${connected.body.id}/preview`,
      )
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.performance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'STARTUP_MS', value: 1800 }),
      ]),
    );
    expect(response.body.crashes[0]).toMatchObject({
      fingerprint: 'renderer-crash',
      version: '2.4.0',
    });
  });

  it('records provider failure without breaking the desktop app', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const connected = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'failing-provider',
        endpointUrl: 'mock://failure/snapshot',
        secret: 'failure-secret',
      })
      .expect(201);

    const response = await owner.agent
      .post(
        `${telemetryPath(owner.workspaceId, desktopApp.id)}/${connected.body.id}/preview`,
      )
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(502);

    const integration =
      await prisma.desktopTelemetryIntegration.findUniqueOrThrow({
        where: { id: connected.body.id },
      });

    expect(integration.status).toBe('ERROR');
    expect(integration.lastError).toContain('Injected telemetry provider failure');

    const desktop = await prisma.desktopApplication.findUnique({
      where: { id: desktopApp.id },
    });
    expect(desktop).not.toBeNull();
  });

  it('disconnects and removes stored secret material', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const connected = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'SENTRY',
        externalProjectId: 'desktop',
        endpointUrl: 'mock://success/snapshot',
        secret: 'disconnect-secret',
      })
      .expect(201);

    await owner.agent
      .delete(
        `${telemetryPath(owner.workspaceId, desktopApp.id)}/${connected.body.id}`,
      )
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const stored = await prisma.desktopTelemetryIntegration.findUniqueOrThrow({
      where: { id: connected.body.id },
    });

    expect(stored.status).toBe('DISCONNECTED');
    expect(stored.secretCiphertext).toBe('');
  });

  it('rejects unsafe localhost endpoint outside test mock protocol', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const response = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'desktop',
        endpointUrl: 'http://127.0.0.1:4000/snapshot',
        secret: 'unsafe-secret',
      });

    expect(response.status).toBe(400);
  });

  it('viewer can read integrations but cannot configure them', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    await viewer.agent
      .get(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .expect(200);

    const response = await viewer.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'desktop',
        endpointUrl: 'mock://success/snapshot',
        secret: 'viewer-secret',
      });

    expect(response.status).toBe(403);
  });

  it('rejects cross-workspace telemetry access', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(workspaceA);

    const response = await workspaceB.agent
      .get(telemetryPath(workspaceA.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${workspaceB.accessToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

# 27. API E2E — Phase 13 Runtime Performance & Crashes

Create:

```text
packages/test-code/api/e2e/desktop-performance.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import {
  API,
  createDesktopApp,
} from './helpers/desktop-test-fixtures';

function base(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;
}

describe('Desktop Performance and Crashes E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString(
      'base64',
    );
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
    delete process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;
  });

  async function fixture() {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const integration = await owner.agent
      .post(`${base(owner.workspaceId, desktopApp.id)}/telemetry`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'runtime-test',
        endpointUrl: 'mock://success/snapshot',
        secret: 'runtime-provider-secret',
      })
      .expect(201);

    return { owner, desktopApp, integrationId: integration.body.id as string };
  }

  it('syncs provider metrics and crash groups', async () => {
    const value = await fixture();

    const response = await value.owner.agent
      .post(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.performanceInserted).toBe(4);
    expect(response.body.crashesUpserted).toBe(1);

    expect(
      await prisma.desktopMetric.count({
        where: { desktopAppId: value.desktopApp.id },
      }),
    ).toBe(4);

    expect(
      await prisma.desktopCrash.count({
        where: { desktopAppId: value.desktopApp.id },
      }),
    ).toBe(1);
  });

  it('is idempotent when the same provider snapshot is synced twice', async () => {
    const value = await fixture();
    const path = `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`;

    await value.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    const second = await value.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    expect(second.body.performanceInserted).toBe(0);
    expect(second.body.performanceUpdated).toBe(4);

    expect(
      await prisma.desktopMetric.count({
        where: { telemetryIntegrationId: value.integrationId },
      }),
    ).toBe(4);
    expect(
      await prisma.desktopCrash.count({
        where: { telemetryIntegrationId: value.integrationId },
      }),
    ).toBe(1);
  });

  it('returns normalized performance summary', async () => {
    const value = await fixture();

    await value.owner.agent
      .post(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    const response = await value.owner.agent
      .get(`${base(value.owner.workspaceId, value.desktopApp.id)}/performance`)
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(200);

    expect(response.body.summary).toMatchObject({
      crashFreeUsersPercent: 99.7,
      startupMs: 1800,
      memoryMb: 242,
      cpuPercent: 4.8,
      sampleCount: 4,
    });
  });

  it('filters performance and crashes by version/platform', async () => {
    const value = await fixture();

    await value.owner.agent
      .post(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    const performance = await value.owner.agent
      .get(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/performance?version=2.4.0&platform=WINDOWS&architecture=X64`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(200);

    expect(performance.body.summary.sampleCount).toBe(4);

    const empty = await value.owner.agent
      .get(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/performance?version=9.9.9`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(200);

    expect(empty.body.summary.sampleCount).toBe(0);

    const crashes = await value.owner.agent
      .get(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/crashes?version=2.4.0&platform=WINDOWS`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(200);

    expect(crashes.body).toHaveLength(1);
    expect(crashes.body[0]).toMatchObject({
      fingerprint: 'renderer-crash',
      count: 12,
      affectedUsers: 8,
    });
  });

  it('keeps runtime data isolated between workspaces', async () => {
    const value = await fixture();
    const attacker = await registerWorkspaceTestUser(app, prisma);

    await value.owner.agent
      .post(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    const response = await attacker.agent
      .get(`${base(value.owner.workspaceId, value.desktopApp.id)}/performance`)
      .set('Authorization', `Bearer ${attacker.accessToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

# 28. API E2E — Phase 14 Dependency + Security Health

Create:

```text
packages/test-code/api/e2e/desktop-security-health.e2e-spec.ts
```

```ts
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { GithubCodeService } from 'src/modules/repositories/services/github-code.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import {
  API,
  createLinkedDesktopFixture,
} from './helpers/desktop-test-fixtures';

function base(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;
}

describe('Desktop Dependency and Security Health E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let githubCode: GithubCodeService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    githubCode = app.get(GithubCodeService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await resetDatabase(prisma);
    await app.close();
  });

  function mockRepository() {
    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'security-tree',
      truncated: false,
      entries: [
        { path: 'package.json', type: 'file', sha: '1', size: 300 },
        {
          path: 'electron-builder.yml',
          type: 'file',
          sha: '2',
          size: 400,
        },
        {
          path: 'npm-audit.json',
          type: 'file',
          sha: '3',
          size: 300,
        },
      ],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockImplementation(async (
      _installation,
      _owner,
      _repo,
      path,
    ) => {
      if (path === 'package.json') {
        return {
          path,
          sha: '1',
          size: 300,
          encoding: 'base64',
          content: JSON.stringify({
            name: 'desktop-electron',
            dependencies: {
              electron: '31.2.0',
              react: '19.1.0',
            },
            devDependencies: {
              'electron-builder': '26.0.0',
            },
          }),
        } as never;
      }

      if (path === 'electron-builder.yml') {
        return {
          path,
          sha: '2',
          size: 400,
          encoding: 'base64',
          content: `
asar: true
win:
  certificateSubjectName: Command Center LLC
mac:
  identity: Developer ID Application
  hardenedRuntime: true
afterSign: scripts/notarize.js
`,
        } as never;
      }

      return {
        path,
        sha: '3',
        size: 300,
        encoding: 'base64',
        content: JSON.stringify({
          vulnerabilities: [
            {
              name: 'electron',
              id: 'GHSA-test-electron',
              severity: 'high',
            },
          ],
        }),
      } as never;
    });
  }

  it('scans dependency manifests and persists vulnerability metadata', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    mockRepository();

    const response = await fixture.owner.agent
      .post(
        `${base(fixture.owner.workspaceId, fixture.desktopApp.id)}/dependencies/scan`,
      )
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(201);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'electron',
          ecosystem: 'NPM',
          currentVersion: '31.2.0',
          riskStatus: 'VULNERABLE',
          severity: 'HIGH',
        }),
        expect.objectContaining({
          name: 'react',
          ecosystem: 'NPM',
        }),
      ]),
    );
  });

  it('detects signing and notarization configuration without exposing secrets', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    mockRepository();

    const response = await fixture.owner.agent
      .post(
        `${base(fixture.owner.workspaceId, fixture.desktopApp.id)}/security/scan`,
      )
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(201);

    expect(response.body).toMatchObject({
      windowsSigning: 'PASS',
      macosSigning: 'PASS',
      notarization: 'PASS',
    });

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('PRIVATE KEY');
    expect(serialized).not.toContain('provider-secret');
    expect(serialized).not.toContain('APPLE_APP_SPECIFIC_PASSWORD=');
  });

  it('handles malformed package.json without crashing the scan', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'malformed-tree',
      truncated: false,
      entries: [
        { path: 'package.json', type: 'file', sha: '1', size: 50 },
      ],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockResolvedValue({
      path: 'package.json',
      sha: '1',
      size: 50,
      encoding: 'base64',
      content: '{ definitely not json',
    } as never);

    const response = await fixture.owner.agent
      .post(
        `${base(fixture.owner.workspaceId, fixture.desktopApp.id)}/dependencies/scan`,
      )
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(201);

    expect(response.body).toEqual([]);
  });

  it('rejects cross-workspace security access', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const attacker = await registerWorkspaceTestUser(app, prisma);

    const response = await attacker.agent
      .get(`${base(fixture.owner.workspaceId, fixture.desktopApp.id)}/security`)
      .set('Authorization', `Bearer ${attacker.accessToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

# 29. Backend unit tests

## 29.1 Telemetry secret encryption

Create:

```text
packages/test-code/api/unit/modules/desktop-apps/desktop-telemetry-secret.service.spec.ts
```

```ts
import { DesktopTelemetrySecretService } from 'src/modules/desktop-apps/services/desktop-telemetry-secret.service';

DescribeDesktopTelemetrySecretService();

function DescribeDesktopTelemetrySecretService() {
  describe('DesktopTelemetrySecretService', () => {
    const service = new DesktopTelemetrySecretService();

    beforeEach(() => {
      process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(
        32,
        11,
      ).toString('base64');
    });

    afterEach(() => {
      delete process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;
    });

    it('encrypts and decrypts a secret', () => {
      const encrypted = service.encrypt('provider-token-123');

      expect(encrypted).not.toContain('provider-token-123');
      expect(service.decrypt(encrypted)).toBe('provider-token-123');
    });

    it('uses a random IV so the same plaintext produces different ciphertext', () => {
      const first = service.encrypt('same-secret');
      const second = service.encrypt('same-secret');

      expect(first).not.toBe(second);
      expect(service.decrypt(first)).toBe('same-secret');
      expect(service.decrypt(second)).toBe('same-secret');
    });

    it('rejects missing encryption key', () => {
      delete process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;

      expect(() => service.encrypt('secret-value')).toThrow(
        /DESKTOP_TELEMETRY_ENCRYPTION_KEY/,
      );
    });

    it('rejects a key that is not 32 bytes', () => {
      process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(
        16,
        1,
      ).toString('base64');

      expect(() => service.encrypt('secret-value')).toThrow(/32 bytes/);
    });
  });
}
```

## 29.2 Dependency/security controlled parsers

Create:

```text
packages/test-code/api/unit/modules/desktop-apps/desktop-security-parsers.spec.ts
```

```ts
import { DesktopDependencyHealthService } from 'src/modules/desktop-apps/services/desktop-dependency-health.service';
import { DesktopSecurityService } from 'src/modules/desktop-apps/services/desktop-security.service';
import type { DesktopRepositoryMetadataSnapshot } from 'src/modules/desktop-apps/services/desktop-repository-metadata.service';

function snapshot(
  files: Record<string, string>,
): DesktopRepositoryMetadataSnapshot {
  return {
    repositoryId: '11111111-1111-4111-8111-111111111111',
    repositoryFullName: 'command-center/desktop',
    branch: 'main',
    paths: Object.keys(files),
    files,
    truncated: false,
  };
}

describe('Desktop dependency/security parsers', () => {
  const dependencies = new DesktopDependencyHealthService(
    {} as never,
    {} as never,
    {} as never,
  );

  const security = new DesktopSecurityService(
    {} as never,
    {} as never,
    {} as never,
    dependencies,
  );

  it('parses npm dependencies', () => {
    const parsed = dependencies.parse(
      snapshot({
        'package.json': JSON.stringify({
          dependencies: {
            electron: '31.2.0',
            react: '^19.1.0',
          },
        }),
      }),
    );

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ecosystem: 'NPM',
          name: 'electron',
          currentVersion: '31.2.0',
        }),
        expect.objectContaining({
          ecosystem: 'NPM',
          name: 'react',
        }),
      ]),
    );
  });

  it('parses Cargo dependencies', () => {
    const parsed = dependencies.parse(
      snapshot({
        'src-tauri/Cargo.toml': `
[package]
name = "desktop"

[dependencies]
tauri = "2.8.0"
serde = { version = "1.0", features = ["derive"] }
`,
      }),
    );

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ecosystem: 'CARGO',
          name: 'tauri',
          currentVersion: '2.8.0',
        }),
        expect.objectContaining({
          ecosystem: 'CARGO',
          name: 'serde',
          currentVersion: '1.0',
        }),
      ]),
    );
  });

  it('parses NuGet PackageReference entries', () => {
    const parsed = dependencies.parse(
      snapshot({
        'Desktop/Desktop.csproj': `
<Project>
  <ItemGroup>
    <PackageReference Include="Avalonia" Version="11.3.0" />
  </ItemGroup>
</Project>
`,
      }),
    );

    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ecosystem: 'NUGET',
          name: 'Avalonia',
          currentVersion: '11.3.0',
        }),
      ]),
    );
  });

  it('handles malformed package json safely', () => {
    expect(
      dependencies.parse(snapshot({ 'package.json': '{bad json' })),
    ).toEqual([]);
  });

  it('extracts vulnerability metadata from controlled audit JSON', () => {
    const result = dependencies.vulnerabilities(
      snapshot({
        'npm-audit.json': JSON.stringify({
          vulnerabilities: [
            {
              name: 'electron',
              id: 'GHSA-example',
              severity: 'critical',
            },
          ],
        }),
      }),
    );

    expect(result).toEqual([
      expect.objectContaining({
        packageName: 'electron',
        advisoryIds: ['GHSA-example'],
        severity: 'CRITICAL',
      }),
    ]);
  });

  it('detects signing and notarization markers', () => {
    const findings = security.evaluate(
      snapshot({
        'electron-builder.yml': `
win:
  certificateSubjectName: Command Center LLC
mac:
  identity: Developer ID Application
  hardenedRuntime: true
afterSign: scripts/notarize.js
`,
      }),
      'ELECTRON',
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'WINDOWS_SIGNING',
          status: 'PASS',
        }),
        expect.objectContaining({
          type: 'MACOS_SIGNING',
          status: 'PASS',
        }),
        expect.objectContaining({
          type: 'MACOS_NOTARIZATION',
          status: 'PASS',
        }),
      ]),
    );
  });
});
```

---

# 30. Frontend API tests

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-telemetry-api.test.ts
```

```ts
import {
  connectDesktopTelemetry,
  disconnectDesktopTelemetry,
  getDesktopPerformance,
  getDesktopSecurity,
  listDesktopCrashes,
  listDesktopDependencies,
  listDesktopTelemetryIntegrations,
  previewDesktopTelemetry,
  scanDesktopDependencies,
  scanDesktopSecurity,
  syncDesktopTelemetry,
} from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const api = vi.mocked(apiRequest);
const workspaceId = 'workspace-1';
const desktopAppId = 'desktop-1';
const integrationId = 'integration-1';
const base = `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;

describe('desktop runtime/security APIs', () => {
  beforeEach(() => api.mockReset());

  it('lists telemetry integrations', () => {
    listDesktopTelemetryIntegrations(workspaceId, desktopAppId);
    expect(api).toHaveBeenCalledWith(`${base}/telemetry`);
  });

  it('connects telemetry without changing the caller payload', () => {
    const input = {
      provider: 'SENTRY' as const,
      externalProjectId: 'org/project',
      endpointUrl: 'https://telemetry.example.com/snapshot',
      secret: 'provider-secret',
    };

    connectDesktopTelemetry(workspaceId, desktopAppId, input);

    expect(api).toHaveBeenCalledWith(`${base}/telemetry`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('previews and syncs telemetry', () => {
    previewDesktopTelemetry(workspaceId, desktopAppId, integrationId);
    syncDesktopTelemetry(workspaceId, desktopAppId, integrationId);

    expect(api).toHaveBeenNthCalledWith(
      1,
      `${base}/telemetry/${integrationId}/preview`,
      { method: 'POST' },
    );
    expect(api).toHaveBeenNthCalledWith(
      2,
      `${base}/telemetry/${integrationId}/sync`,
      { method: 'POST' },
    );
  });

  it('disconnects telemetry', () => {
    disconnectDesktopTelemetry(workspaceId, desktopAppId, integrationId);
    expect(api).toHaveBeenCalledWith(`${base}/telemetry/${integrationId}`, {
      method: 'DELETE',
    });
  });

  it('passes runtime filters in the query string', () => {
    getDesktopPerformance(workspaceId, desktopAppId, {
      version: '2.4.0',
      platform: 'WINDOWS',
      architecture: 'X64',
      channel: 'STABLE',
    });

    expect(api).toHaveBeenCalledWith(
      `${base}/performance?version=2.4.0&platform=WINDOWS&architecture=X64&channel=STABLE`,
    );
  });

  it('lists crashes and dependency/security health', () => {
    listDesktopCrashes(workspaceId, desktopAppId, { version: '2.4.0' });
    listDesktopDependencies(workspaceId, desktopAppId);
    scanDesktopDependencies(workspaceId, desktopAppId);
    getDesktopSecurity(workspaceId, desktopAppId);
    scanDesktopSecurity(workspaceId, desktopAppId);

    expect(api).toHaveBeenCalledWith(`${base}/crashes?version=2.4.0`);
    expect(api).toHaveBeenCalledWith(`${base}/dependencies`);
    expect(api).toHaveBeenCalledWith(`${base}/dependencies/scan`, {
      method: 'POST',
    });
    expect(api).toHaveBeenCalledWith(`${base}/security`);
    expect(api).toHaveBeenCalledWith(`${base}/security/scan`, {
      method: 'POST',
    });
  });
});
```

---

# 31. Frontend component tests

## 31.1 Telemetry settings component

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-telemetry-settings.test.tsx
```

```tsx
// @vitest-environment jsdom

import { DesktopTelemetrySettings } from '@/features/desktop-apps/desktop-telemetry-settings';
import {
  connectDesktopTelemetry,
  disconnectDesktopTelemetry,
  listDesktopTelemetryIntegrations,
  previewDesktopTelemetry,
  syncDesktopTelemetry,
} from '@/features/desktop-apps/desktop-apps-api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  connectDesktopTelemetry: vi.fn(),
  disconnectDesktopTelemetry: vi.fn(),
  listDesktopTelemetryIntegrations: vi.fn(),
  previewDesktopTelemetry: vi.fn(),
  syncDesktopTelemetry: vi.fn(),
}));

const listMock = vi.mocked(listDesktopTelemetryIntegrations);
const connectMock = vi.mocked(connectDesktopTelemetry);
const previewMock = vi.mocked(previewDesktopTelemetry);
const syncMock = vi.mocked(syncDesktopTelemetry);
const disconnectMock = vi.mocked(disconnectDesktopTelemetry);

const integration = {
  id: 'integration-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  provider: 'SENTRY',
  status: 'CONNECTED',
  externalProjectId: 'org/desktop',
  endpointUrl: 'https://telemetry.example.com/snapshot',
  configuredAt: '2026-08-23T00:00:00.000Z',
  lastSyncedAt: null,
  lastError: null,
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  hasSecret: true,
} as const;

describe('DesktopTelemetrySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([]);
    connectMock.mockResolvedValue(integration as never);
    previewMock.mockResolvedValue({
      performance: [],
      crashes: [],
      versions: [],
    });
    syncMock.mockResolvedValue({} as never);
    disconnectMock.mockResolvedValue({ success: true });
  });

  it('renders an empty state', async () => {
    render(
      <DesktopTelemetrySettings
        workspaceId='workspace-1'
        desktopAppId='desktop-1'
      />,
    );

    expect(
      await screen.findByText('No telemetry provider configured.'),
    ).toBeInTheDocument();
  });

  it('submits provider settings and keeps secret in a password input', async () => {
    const user = userEvent.setup();

    render(
      <DesktopTelemetrySettings
        workspaceId='workspace-1'
        desktopAppId='desktop-1'
      />,
    );

    await screen.findByText('No telemetry provider configured.');

    await user.selectOptions(
      screen.getByLabelText('Telemetry provider'),
      'SENTRY',
    );
    await user.type(
      screen.getByLabelText('External project ID'),
      'org/desktop',
    );
    await user.type(
      screen.getByLabelText('Telemetry endpoint URL'),
      'https://telemetry.example.com/snapshot',
    );
    await user.type(
      screen.getByLabelText('Telemetry provider secret'),
      'provider-secret',
    );

    expect(screen.getByLabelText('Telemetry provider secret')).toHaveAttribute(
      'type',
      'password',
    );

    await user.click(
      screen.getByRole('button', { name: 'Connect Provider' }),
    );

    await waitFor(() => {
      expect(connectMock).toHaveBeenCalledWith(
        'workspace-1',
        'desktop-1',
        {
          provider: 'SENTRY',
          externalProjectId: 'org/desktop',
          endpointUrl: 'https://telemetry.example.com/snapshot',
          secret: 'provider-secret',
        },
      );
    });
  });

  it('previews, syncs and disconnects a configured integration', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([integration as never]);

    render(
      <DesktopTelemetrySettings
        workspaceId='workspace-1'
        desktopAppId='desktop-1'
      />,
    );

    await screen.findByText('org/desktop');

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => {
      expect(previewMock).toHaveBeenCalledWith(
        'workspace-1',
        'desktop-1',
        'integration-1',
      );
    });

    await user.click(screen.getByRole('button', { name: 'Sync Now' }));
    await waitFor(() => {
      expect(syncMock).toHaveBeenCalledWith(
        'workspace-1',
        'desktop-1',
        'integration-1',
      );
    });

    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledWith(
        'workspace-1',
        'desktop-1',
        'integration-1',
      );
    });
  });
});
```

## 31.2 Performance component

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-performance.test.tsx
```

```tsx
// @vitest-environment jsdom

import { DesktopPerformance } from '@/features/desktop-apps/desktop-performance';
import { getDesktopPerformance } from '@/features/desktop-apps/desktop-apps-api';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  getDesktopPerformance: vi.fn(),
}));

const api = vi.mocked(getDesktopPerformance);

describe('DesktopPerformance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders normalized runtime KPIs', async () => {
    api.mockResolvedValue({
      summary: {
        crashFreeUsersPercent: 99.7,
        crashFreeSessionsPercent: 99.5,
        startupMs: 1800,
        memoryMb: 242,
        cpuPercent: 4.8,
        hangRatePercent: 0.2,
        networkLatencyMs: 120,
        apiFailureRatePercent: 0.4,
        versionAdoptionPercent: 76,
        sampleCount: 9,
        from: null,
        to: null,
      },
      metrics: [],
    });

    render(
      <DesktopPerformance workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    expect(await screen.findByText('99.7%')).toBeInTheDocument();
    expect(screen.getByText('1.80s')).toBeInTheDocument();
    expect(screen.getByText('242.0 MB')).toBeInTheDocument();
    expect(screen.getByText('4.8%')).toBeInTheDocument();
  });

  it('renders missing-metrics state', async () => {
    api.mockResolvedValue({
      summary: {
        crashFreeUsersPercent: null,
        crashFreeSessionsPercent: null,
        startupMs: null,
        memoryMb: null,
        cpuPercent: null,
        hangRatePercent: null,
        networkLatencyMs: null,
        apiFailureRatePercent: null,
        versionAdoptionPercent: null,
        sampleCount: 0,
        from: null,
        to: null,
      },
      metrics: [],
    });

    render(
      <DesktopPerformance workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    expect(
      await screen.findByText('No performance metrics match the current filters.'),
    ).toBeInTheDocument();
  });
});
```

## 31.3 Crashes component

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-crashes.test.tsx
```

```tsx
// @vitest-environment jsdom

import { DesktopCrashes } from '@/features/desktop-apps/desktop-crashes';
import { listDesktopCrashes } from '@/features/desktop-apps/desktop-apps-api';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  listDesktopCrashes: vi.fn(),
}));

const api = vi.mocked(listDesktopCrashes);

describe('DesktopCrashes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders crash impact', async () => {
    api.mockResolvedValue([
      {
        id: 'crash-1',
        workspaceId: 'workspace-1',
        desktopAppId: 'desktop-1',
        telemetryIntegrationId: 'integration-1',
        externalId: 'external-1',
        fingerprint: 'renderer-crash',
        message: 'Renderer process exited unexpectedly',
        count: 12,
        affectedUsers: 8,
        version: '2.4.0',
        platform: 'WINDOWS',
        architecture: 'X64',
        channel: 'STABLE',
        firstSeenAt: '2026-08-22T00:00:00.000Z',
        lastSeenAt: '2026-08-23T00:00:00.000Z',
        createdAt: '2026-08-22T00:00:00.000Z',
        updatedAt: '2026-08-23T00:00:00.000Z',
      },
    ]);

    render(
      <DesktopCrashes workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    expect(
      await screen.findByText('Renderer process exited unexpectedly'),
    ).toBeInTheDocument();
    expect(screen.getByText('12 events')).toBeInTheDocument();
    expect(screen.getByText('8 users')).toBeInTheDocument();
    expect(screen.getByText('2.4.0')).toBeInTheDocument();
  });
});
```

## 31.4 Dependencies component

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-dependencies.test.tsx
```

```tsx
// @vitest-environment jsdom

import { DesktopDependencies } from '@/features/desktop-apps/desktop-dependencies';
import {
  listDesktopDependencies,
  scanDesktopDependencies,
} from '@/features/desktop-apps/desktop-apps-api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  listDesktopDependencies: vi.fn(),
  scanDesktopDependencies: vi.fn(),
}));

const listMock = vi.mocked(listDesktopDependencies);
const scanMock = vi.mocked(scanDesktopDependencies);

const dependency = {
  id: 'dependency-1',
  workspaceId: 'workspace-1',
  desktopAppId: 'desktop-1',
  ecosystem: 'NPM',
  manifestPath: 'package.json',
  name: 'electron',
  currentVersion: '31.2.0',
  latestVersion: null,
  direct: true,
  riskStatus: 'VULNERABLE',
  severity: 'HIGH',
  advisoryIds: ['GHSA-example'],
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
} as const;

describe('DesktopDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([]);
    scanMock.mockResolvedValue([dependency as never]);
  });

  it('scans and renders dependency inventory', async () => {
    const user = userEvent.setup();

    render(
      <DesktopDependencies workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    await screen.findByText('No dependency inventory yet. Run a repository scan.');
    await user.click(screen.getByRole('button', { name: 'Scan Repository' }));

    await waitFor(() => {
      expect(scanMock).toHaveBeenCalledWith('workspace-1', 'desktop-1');
    });

    expect(await screen.findByText('electron')).toBeInTheDocument();
    expect(screen.getByText('31.2.0')).toBeInTheDocument();
    expect(screen.getByText('VULNERABLE')).toBeInTheDocument();
  });
});
```

## 31.5 Security component

Create:

```text
packages/test-code/web/unit/features/desktop-apps/desktop-security.test.tsx
```

```tsx
// @vitest-environment jsdom

import { DesktopSecurity } from '@/features/desktop-apps/desktop-security';
import {
  getDesktopSecurity,
  scanDesktopSecurity,
} from '@/features/desktop-apps/desktop-apps-api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  getDesktopSecurity: vi.fn(),
  scanDesktopSecurity: vi.fn(),
}));

const getMock = vi.mocked(getDesktopSecurity);
const scanMock = vi.mocked(scanDesktopSecurity);

const summary = {
  windowsSigning: 'PASS',
  macosSigning: 'PASS',
  notarization: 'PASS',
  criticalRisks: 0,
  highRisks: 1,
  findings: [
    {
      id: 'finding-1',
      workspaceId: 'workspace-1',
      desktopAppId: 'desktop-1',
      findingKey: 'dependency:package.json:electron',
      type: 'DEPENDENCY_VULNERABILITY',
      status: 'FAIL',
      severity: 'HIGH',
      title: 'Vulnerable dependency: electron',
      message: 'A vulnerability report contains this dependency.',
      sourcePath: 'package.json',
      evidence: ['GHSA-example'],
      createdAt: '2026-08-23T00:00:00.000Z',
      updatedAt: '2026-08-23T00:00:00.000Z',
    },
  ],
} as const;

describe('DesktopSecurity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue(summary as never);
    scanMock.mockResolvedValue(summary as never);
  });

  it('renders signing/notarization and risk summary', async () => {
    render(
      <DesktopSecurity workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    expect(await screen.findByText('Vulnerable dependency: electron')).toBeInTheDocument();
    expect(screen.getAllByText('PASS').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('runs a security scan', async () => {
    const user = userEvent.setup();

    render(
      <DesktopSecurity workspaceId='workspace-1' desktopAppId='desktop-1' />,
    );

    await screen.findByText('Vulnerable dependency: electron');
    await user.click(screen.getByRole('button', { name: 'Run Security Scan' }));

    await waitFor(() => {
      expect(scanMock).toHaveBeenCalledWith('workspace-1', 'desktop-1');
    });
  });
});
```

---

# 32. Playwright Full-Stack UI — Phases 12–14

Create:

```text
packages/test-code/web/e2e/full-stack/fullstack-desktop-phases-12-14.spec.ts
```

```ts
import {
  authorizedApiRequest,
  loginThroughUi,
  uniqueValue,
} from './fixtures/helpers';
import {
  readFullStackState,
  type FullStackState,
} from './fixtures/state';
import {
  expect,
  test,
  type APIRequestContext,
} from '@playwright/test';

let state: FullStackState;

test.describe.configure({ mode: 'serial' });

async function createDesktopApp(request: APIRequestContext) {
  const response = await authorizedApiRequest(
    request,
    state,
    state.owner.accessToken,
    `/workspaces/${state.owner.workspaceId}/desktop-apps`,
    {
      method: 'POST',
      data: {
        name: uniqueValue('Runtime Desktop', state.runId),
        platform: 'CROSS_PLATFORM',
        framework: 'ELECTRON',
        architecture: 'X64',
        packageName: `com.commandcenter.runtime.${Date.now()}`,
        currentVersion: '2.4.0',
        currentBuildNumber: '184',
      },
    },
  );

  expect(response.status()).toBe(201);
  return (await response.json()) as {
    id: string;
    applicationId: string;
    application: { name: string };
  };
}

test.describe('Desktop phases 12-14 UI', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('configures telemetry and renders runtime/security health', async ({
    page,
    request,
  }) => {
    await loginThroughUi(page, state.owner);
    const desktopApp = await createDesktopApp(request);

    const workspaceId = state.owner.workspaceId;
    const root =
      `/workspaces/${workspaceId}/desktop-apps/${desktopApp.id}`;
    const apiRoot = `/api/v1${root}`;

    let integrations: Array<Record<string, unknown>> = [];

    const snapshot = {
      performance: [
        {
          externalId: 'startup-1',
          type: 'STARTUP_MS',
          value: 1800,
          unit: 'ms',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
      ],
      crashes: [
        {
          externalId: 'crash-1',
          fingerprint: 'renderer-crash',
          message: 'Renderer process exited unexpectedly',
          count: 12,
          affectedUsers: 8,
          firstSeenAt: '2026-08-22T00:00:00.000Z',
          lastSeenAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
      ],
      versions: [{ version: '2.4.0', users: 120, sessions: 440 }],
    };

    await page.route(`**${apiRoot}/telemetry`, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(integrations),
        });
        return;
      }

      if (method === 'POST') {
        const body = route.request().postDataJSON() as {
          provider: string;
          externalProjectId: string;
          endpointUrl: string;
          secret: string;
        };

        integrations = [
          {
            id: '11111111-1111-4111-8111-111111111111',
            workspaceId,
            desktopAppId: desktopApp.id,
            provider: body.provider,
            status: 'CONNECTED',
            externalProjectId: body.externalProjectId,
            endpointUrl: body.endpointUrl,
            configuredAt: '2026-08-23T00:00:00.000Z',
            lastSyncedAt: null,
            lastError: null,
            createdAt: '2026-08-23T00:00:00.000Z',
            updatedAt: '2026-08-23T00:00:00.000Z',
            hasSecret: true,
          },
        ];

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(integrations[0]),
        });
        return;
      }

      await route.continue();
    });

    await page.route(`**${apiRoot}/telemetry/*/preview`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(snapshot),
      });
    });

    await page.route(`**${apiRoot}/telemetry/*/sync`, async (route) => {
      integrations = integrations.map((item) => ({
        ...item,
        lastSyncedAt: '2026-08-23T00:05:00.000Z',
      }));

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          integration: integrations[0],
          performanceInserted: 4,
          performanceUpdated: 0,
          crashesUpserted: 1,
          versionsSeen: 1,
        }),
      });
    });

    await page.route(`**${apiRoot}/telemetry/*`, async (route) => {
      if (route.request().method() === 'DELETE') {
        integrations = integrations.map((item) => ({
          ...item,
          status: 'DISCONNECTED',
          hasSecret: false,
        }));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      await route.continue();
    });

    await page.route(`**${apiRoot}/performance**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: {
            crashFreeUsersPercent: 99.7,
            crashFreeSessionsPercent: 99.5,
            startupMs: 1800,
            memoryMb: 242,
            cpuPercent: 4.8,
            hangRatePercent: 0.2,
            networkLatencyMs: 120,
            apiFailureRatePercent: 0.4,
            versionAdoptionPercent: 76,
            sampleCount: 9,
            from: null,
            to: null,
          },
          metrics: [],
        }),
      });
    });

    await page.route(`**${apiRoot}/crashes**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '22222222-2222-4222-8222-222222222222',
            workspaceId,
            desktopAppId: desktopApp.id,
            telemetryIntegrationId:
              '11111111-1111-4111-8111-111111111111',
            ...snapshot.crashes[0],
            createdAt: '2026-08-22T00:00:00.000Z',
            updatedAt: '2026-08-23T00:00:00.000Z',
          },
        ]),
      });
    });

    const dependency = {
      id: '33333333-3333-4333-8333-333333333333',
      workspaceId,
      desktopAppId: desktopApp.id,
      ecosystem: 'NPM',
      manifestPath: 'package.json',
      name: 'electron',
      currentVersion: '31.2.0',
      latestVersion: null,
      direct: true,
      riskStatus: 'VULNERABLE',
      severity: 'HIGH',
      advisoryIds: ['GHSA-example'],
      createdAt: '2026-08-23T00:00:00.000Z',
      updatedAt: '2026-08-23T00:00:00.000Z',
    };

    let dependencies: Array<typeof dependency> = [];

    await page.route(`**${apiRoot}/dependencies`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dependencies),
      });
    });

    await page.route(`**${apiRoot}/dependencies/scan`, async (route) => {
      dependencies = [dependency];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(dependencies),
      });
    });

    const security = {
      windowsSigning: 'PASS',
      macosSigning: 'PASS',
      notarization: 'PASS',
      criticalRisks: 0,
      highRisks: 1,
      findings: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          workspaceId,
          desktopAppId: desktopApp.id,
          findingKey: 'dependency:package.json:electron',
          type: 'DEPENDENCY_VULNERABILITY',
          status: 'FAIL',
          severity: 'HIGH',
          title: 'Vulnerable dependency: electron',
          message: 'Repository vulnerability evidence detected.',
          sourcePath: 'package.json',
          evidence: ['GHSA-example'],
          createdAt: '2026-08-23T00:00:00.000Z',
          updatedAt: '2026-08-23T00:00:00.000Z',
        },
      ],
    };

    await page.route(`**${apiRoot}/security`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(security),
      });
    });

    await page.route(`**${apiRoot}/security/scan`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(security),
      });
    });

    // Phase 12: telemetry settings.
    await page.goto(`${root}/settings`);
    await expect(
      page.getByRole('heading', { name: 'Runtime Monitoring' }),
    ).toBeVisible();

    await page
      .getByLabel('External project ID')
      .fill('command-center/runtime-desktop');
    await page
      .getByLabel('Telemetry endpoint URL')
      .fill('https://telemetry.example.com/snapshot');
    await page
      .getByLabel('Telemetry provider secret')
      .fill('provider-secret-never-render');
    await page
      .getByRole('button', { name: 'Connect Provider' })
      .click();

    await expect(page.getByText('command-center/runtime-desktop')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toContain(
      'provider-secret-never-render',
    );

    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText('Normalized Preview')).toBeVisible();
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Sync Now' }).click();

    // Phase 13: performance.
    await page.goto(`${root}/performance`);
    await expect(page.getByText('99.7%')).toBeVisible();
    await expect(page.getByText('1.80s')).toBeVisible();
    await expect(page.getByText('242.0 MB')).toBeVisible();

    // Phase 13: crashes.
    await page.goto(`${root}/crashes`);
    await expect(
      page.getByText('Renderer process exited unexpectedly'),
    ).toBeVisible();
    await expect(page.getByText('12 events')).toBeVisible();
    await expect(page.getByText('8 users')).toBeVisible();

    // Phase 14: dependencies.
    await page.goto(`${root}/dependencies`);
    await expect(
      page.getByText('No dependency inventory yet. Run a repository scan.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Scan Repository' }).click();
    await expect(page.getByText('electron')).toBeVisible();
    await expect(page.getByText('VULNERABLE')).toBeVisible();

    // Phase 14: security.
    await page.goto(`${root}/security`);
    await expect(page.getByText('Vulnerable dependency: electron')).toBeVisible();
    await expect(page.getByText('Windows signing')).toBeVisible();
    await page.getByRole('button', { name: 'Run Security Scan' }).click();
    await expect(page.getByText('Vulnerable dependency: electron')).toBeVisible();

    // Deep refresh must keep all routes valid.
    await page.reload();
    await expect(page.getByText('Security Health')).toBeVisible();
  });
});
```

The browser test intentionally mocks only changing provider/runtime/security API responses. The backend behavior, persistence, workspace isolation and secret protection are verified independently by the API E2E suites above.

---

# 33. Verification Commands

Apply **Phase 12 first**, verify it, then **Phase 13**, then **Phase 14**. Do not paste all schema changes into production and skip intermediate verification.

## 33.1 Format

```powershell
pnpm exec prettier --write `
  "apps/api/src/modules/desktop-apps/**/*.ts" `
  "apps/api/prisma/models/*.prisma" `
  "apps/web/src/features/desktop-apps/*.ts" `
  "apps/web/src/features/desktop-apps/*.tsx" `
  "apps/web/src/app/(dashboard)/workspaces/[workspaceId]/desktop-apps/[desktopAppId]/**/*.tsx" `
  "packages/test-code/api/e2e/desktop-telemetry.e2e-spec.ts" `
  "packages/test-code/api/e2e/desktop-performance.e2e-spec.ts" `
  "packages/test-code/api/e2e/desktop-security-health.e2e-spec.ts" `
  "packages/test-code/api/unit/modules/desktop-apps/*.ts" `
  "packages/test-code/web/unit/features/desktop-apps/*.ts" `
  "packages/test-code/web/unit/features/desktop-apps/*.tsx" `
  "packages/test-code/web/e2e/full-stack/fullstack-desktop-phases-12-14.spec.ts"
```

## 33.2 Prisma

```powershell
pnpm --dir apps/api exec prisma format
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate dev --name desktop_telemetry_runtime_security
pnpm --dir apps/api exec prisma generate
```

If you already generated separate Phase 12/13/14 migrations, **do not create a second combined migration**. Keep the migration history that actually exists in your repository.

## 33.3 Shared types

```powershell
pnpm --filter @command-center/shared-types build
```

## 33.4 Backend typecheck/build

```powershell
pnpm --filter @command-center/api typecheck
pnpm --filter @command-center/api build
```

## 33.5 Frontend typecheck/build

```powershell
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web-tests typecheck
pnpm --filter @command-center/web build
```

## 33.6 Backend unit tests

```powershell
pnpm --filter @command-center/api-tests exec jest `
  --config jest.config.cjs `
  --runInBand `
  --runTestsByPath `
  unit/modules/desktop-apps/desktop-telemetry-secret.service.spec.ts `
  unit/modules/desktop-apps/desktop-security-parsers.spec.ts
```

## 33.7 Phase 12 API E2E

```powershell
pnpm --dir apps/api exec jest `
  --config ../../packages/test-code/api/jest-e2e.config.cjs `
  --runInBand `
  --runTestsByPath ../../packages/test-code/api/e2e/desktop-telemetry.e2e-spec.ts
```

## 33.8 Phase 13 API E2E

```powershell
pnpm --dir apps/api exec jest `
  --config ../../packages/test-code/api/jest-e2e.config.cjs `
  --runInBand `
  --runTestsByPath ../../packages/test-code/api/e2e/desktop-performance.e2e-spec.ts
```

## 33.9 Phase 14 API E2E

```powershell
pnpm --dir apps/api exec jest `
  --config ../../packages/test-code/api/jest-e2e.config.cjs `
  --runInBand `
  --runTestsByPath ../../packages/test-code/api/e2e/desktop-security-health.e2e-spec.ts
```

## 33.10 Frontend tests

```powershell
pnpm --filter @command-center/web-tests exec vitest run `
  unit/features/desktop-apps/desktop-telemetry-api.test.ts `
  unit/features/desktop-apps/desktop-telemetry-settings.test.tsx `
  unit/features/desktop-apps/desktop-performance.test.tsx `
  unit/features/desktop-apps/desktop-crashes.test.tsx `
  unit/features/desktop-apps/desktop-dependencies.test.tsx `
  unit/features/desktop-apps/desktop-security.test.tsx
```

## 33.11 Browser E2E

```powershell
pnpm --filter @command-center/web-tests exec playwright test `
  e2e/full-stack/fullstack-desktop-phases-12-14.spec.ts `
  --project=chrome-fullstack
```

## 33.12 Regression through Phase 11

At minimum rerun the existing Desktop lifecycle suites affected by overview/navigation/database relationships:

```powershell
pnpm --dir apps/api exec jest `
  --config ../../packages/test-code/api/jest-e2e.config.cjs `
  --runInBand `
  --runTestsByPath `
  ../../packages/test-code/api/e2e/desktop-apps.e2e-spec.ts `
  ../../packages/test-code/api/e2e/desktop-repository-linking.e2e-spec.ts `
  ../../packages/test-code/api/e2e/desktop-project-detection.e2e-spec.ts `
  ../../packages/test-code/api/e2e/desktop-overview.e2e-spec.ts `
  ../../packages/test-code/api/e2e/desktop-builds.e2e-spec.ts `
  ../../packages/test-code/api/e2e/desktop-build-artifacts.e2e-spec.ts `
  ../../packages/test-code/api/e2e/desktop-tests.e2e-spec.ts `
  ../../packages/test-code/api/e2e/desktop-releases.e2e-spec.ts
```

Then run repository-wide checks:

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm run test:api
pnpm run test:web
```

---

# 34. Acceptance Matrix

## Phase 12 — Telemetry Foundation

```text
[ ] Integration can be configured
[ ] Provider metadata is workspace scoped
[ ] Secret is encrypted at rest
[ ] Secret is never returned in API response
[ ] Unsafe/private telemetry URL is rejected
[ ] Provider preview returns normalized data
[ ] Provider failure changes integration state to ERROR
[ ] Failure does not break Desktop App CRUD/detail pages
[ ] Disconnect removes secret material
[ ] Viewer cannot configure/disconnect
[ ] Cross-workspace access rejected
[ ] Settings loading/empty/error states work
```

## Phase 13 — Performance & Crashes

```text
[ ] Provider sync persists metrics
[ ] Provider sync persists crash groups
[ ] Duplicate sync remains idempotent
[ ] Startup metric query works
[ ] Memory metric query works
[ ] CPU metric query works
[ ] Crash-free metric query works
[ ] Version filter works
[ ] Platform filter works
[ ] Architecture filter works
[ ] Channel filter works
[ ] Missing-metrics state works
[ ] Crash list shows count + affected users
[ ] Cross-workspace runtime access rejected
[ ] Overview can expose latest performance summary
```

## Phase 14 — Dependencies & Security

```text
[ ] npm package.json detected
[ ] Cargo.toml detected
[ ] NuGet PackageReference detected
[ ] Maven pom.xml detected
[ ] Gradle dependencies detected
[ ] Conan dependencies detected
[ ] vcpkg manifest detected
[ ] Malformed manifest degrades safely
[ ] Repository-provided audit evidence can mark VULNERABLE
[ ] Windows signing configuration detected
[ ] macOS signing configuration detected
[ ] Notarization markers detected
[ ] Security evidence contains no private key/token values
[ ] Dependency list persists
[ ] Security findings persist
[ ] Cross-workspace health access rejected
[ ] Unsupported/no-manifest repository returns safe empty state
```

---

# 35. Final Architecture After Phase 14

```text
DesktopApplication
│
├── RepositoryConnection
│     └── GitHub Code Explorer
│
├── DesktopBuild
│     ├── DesktopBuildArtifact
│     └── DesktopTestRun
│
├── DesktopRelease
│
├── DesktopTelemetryIntegration
│     │
│     ├── encrypted provider secret
│     ├── normalized adapter endpoint
│     ├── DesktopMetric
│     └── DesktopCrash
│
├── DesktopDependency
│
└── DesktopSecurityFinding
```

The runtime flow is:

```text
Sentry / Datadog / New Relic / OTel / Custom
                    ↓
        normalized provider adapter
                    ↓
      DesktopTelemetryIntegration
                    ↓
          idempotent persistence
             ┌──────┴──────┐
             ↓             ↓
       DesktopMetric   DesktopCrash
             ↓             ↓
        Performance      Crashes
```

The security flow is:

```text
Existing linked GitHub repository
             ↓
Existing GithubCodeService
             ↓
Bounded metadata snapshot
        ┌────┴────┐
        ↓         ↓
Dependencies   Signing/Packaging
        ↓         ↓
DesktopDependency
                  DesktopSecurityFinding
```

No signing private key, certificate secret, telemetry token, GitHub private key, or other sensitive credential is exposed through these frontend contracts.

---

# 36. Phase Status

```text
PHASE 12 — TELEMETRY FOUNDATION
Backend:        NOT EXECUTED
Frontend:       NOT EXECUTED
Database:       NOT EXECUTED
API E2E:        NOT EXECUTED
Frontend Tests: NOT EXECUTED
Security:       NOT EXECUTED
Typecheck:      NOT EXECUTED
Build:          NOT EXECUTED
Lint:           NOT EXECUTED
STATUS:         UNVERIFIED

PHASE 13 — PERFORMANCE & CRASH MONITORING
Backend:        NOT EXECUTED
Frontend:       NOT EXECUTED
Database:       NOT EXECUTED
API E2E:        NOT EXECUTED
Frontend Tests: NOT EXECUTED
Security:       NOT EXECUTED
Typecheck:      NOT EXECUTED
Build:          NOT EXECUTED
Lint:           NOT EXECUTED
STATUS:         UNVERIFIED

PHASE 14 — DEPENDENCY & SECURITY HEALTH
Backend:        NOT EXECUTED
Frontend:       NOT EXECUTED
Database:       NOT EXECUTED
API E2E:        NOT EXECUTED
Frontend Tests: NOT EXECUTED
Security:       NOT EXECUTED
Typecheck:      NOT EXECUTED
Build:          NOT EXECUTED
Lint:           NOT EXECUTED
STATUS:         UNVERIFIED
```

Do not mark these phases PASS until the real repository has generated/applied the migration and all targeted + regression commands above pass.
