# SaaS Command Center — Desktop Application Support Implementation Plan

## 1. Goal

Add **first-class desktop application support** to SaaS Command Center so workspace users can manage desktop software alongside web, backend, and mobile applications.

The desktop feature should support:

- Windows, macOS, Linux, and cross-platform apps
- Electron, Tauri, .NET, Qt, Java, native Windows/macOS, and other frameworks
- Repository linking and automatic project detection
- Existing Code Explorer reuse
- Builds and build artifacts (`.exe`, `.msi`, `.msix`, `.dmg`, `.pkg`, `.app`, `.AppImage`, `.deb`, `.rpm`, `.zip`)
- Tests and CI results
- Releases and update channels
- Runtime performance and crash monitoring
- Dependency health and signing/security status
- Alerts
- AI-assisted analysis
- Strong workspace isolation and permissions

> Core rule: reuse existing SaaS Command Center systems instead of duplicating GitHub, repositories, Code Explorer, activity, notifications, monitoring, or authorization.

---

# 2. Target User Flow

```text
Workspace
   ↓
Desktop Apps
   ↓
Add Desktop App
   ↓
Choose Platform + Framework
   ↓
Connect Repository
   ↓
Analyze Repository
   ↓
Detect Desktop Project
   ↓
Create Desktop Application
   ↓
Desktop App Dashboard
      ├── Overview
      ├── Code
      ├── Builds
      ├── Tests
      ├── Releases
      ├── Performance
      ├── Crashes
      ├── Dependencies
      ├── Security
      └── Settings
```

Recommended workspace navigation:

```text
Workspace
├── Overview
├── Applications
├── Websites
├── Mobile Apps
├── Desktop Apps
└── Activity

Operations
├── Monitoring
├── Repositories
└── Releases
```

---

# 3. Core Data Model

## Application type

```text
ApplicationType
├── WEB
├── API
├── MOBILE
├── DESKTOP
├── WORKER
└── OTHER
```

## Desktop platform

```text
DesktopPlatform
├── WINDOWS
├── MACOS
├── LINUX
└── CROSS_PLATFORM
```

## Desktop framework

```text
DesktopFramework
├── ELECTRON
├── TAURI
├── DOTNET
├── QT
├── JAVA
├── NATIVE_WINDOWS
├── NATIVE_MACOS
└── OTHER
```

## Architecture

```text
DesktopArchitecture
├── X64
├── ARM64
├── X86
└── UNIVERSAL
```

Recommended relationship:

```text
SaasApplication
      │
      └── DesktopApplication
               ├── RepositoryConnection
               ├── DesktopBuild
               ├── DesktopBuildArtifact
               ├── DesktopTestRun
               ├── DesktopRelease
               ├── DesktopMetric
               ├── DesktopCrash
               └── DesktopAlert
```

---

# 4. Phase Summary

| Phase | Feature               | Backend                             | Frontend             | E2E Focus                   |
| ----- | --------------------- | ----------------------------------- | -------------------- | --------------------------- |
| 1     | Desktop Foundation    | Models, enums, migration, contracts | Shared types         | Schema + regression         |
| 2     | Desktop CRUD          | CRUD APIs + guards                  | API client           | Create/read/update/archive  |
| 3     | Desktop Apps UI       | Existing CRUD APIs                  | List/create/edit UI  | Browser CRUD                |
| 4     | Repository Linking    | Link repository                     | Repository selector  | Link/unlink + isolation     |
| 5     | Project Detection     | Detect desktop project              | Detection UI         | Electron/Tauri/.NET/Qt/etc. |
| 6     | Desktop Overview      | Overview aggregation                | App detail page      | Metadata rendering          |
| 7     | Code Explorer         | Reuse existing code APIs            | Code navigation      | Browse linked repository    |
| 8     | Build Tracking        | Build model + CI ingestion          | Builds UI            | Build lifecycle             |
| 9     | Artifact Tracking     | Artifact metadata                   | Artifact UI          | EXE/MSI/DMG/etc.            |
| 10    | Test Tracking         | Test result models                  | Tests UI             | Build-test relation         |
| 11    | Releases              | Release + update-channel models     | Releases UI          | Release lifecycle           |
| 12    | Telemetry Foundation  | Provider abstraction                | Integration settings | Provider configuration      |
| 13    | Performance + Crashes | Metrics/crash normalization         | Performance UI       | Runtime health              |
| 14    | Dependency + Security | Dependency/signing checks           | Health/security UI   | Detection + protection      |
| 15    | Alerts                | Rules + incidents                   | Alert settings       | Trigger/resolve             |
| 16    | AI Analysis           | Context aggregation                 | AI actions           | Grounded explanations       |
| 17    | Security Hardening    | Authorization audit                 | Permission-aware UI  | Cross-workspace tests       |
| 18    | Full Verification     | Final hardening                     | Final hardening      | Full lifecycle regression   |

---

# Phase 1 — Desktop Application Foundation

## Goal

Create the desktop data foundation without breaking existing application types.

## Backend

- Add `ApplicationType.DESKTOP`.
- Add `DesktopPlatform`, `DesktopFramework`, and `DesktopArchitecture` enums.
- Add `DesktopApplication` model linked to the existing application model.
- Suggested fields:

```text
id
applicationId
platform
framework
architecture
packageName
currentVersion
currentBuildNumber
minimumOsVersion
updateChannel
createdAt
updatedAt
```

- Add Prisma indexes and constraints.
- Add migration.
- Regenerate Prisma client.
- Add shared DTO/types.
- Keep all existing application types backward-compatible.

## Frontend

- Add desktop TypeScript types.
- Add platform/framework display helpers.
- Add desktop app icon/type support to reusable application components.
- No full page required yet.

## E2E Testing

1. Apply migration on clean test DB.
2. Verify existing application records still work.
3. Create a `DESKTOP` application record.
4. Verify desktop metadata relationship.
5. Reject invalid enum values.
6. Reject duplicate desktop metadata when relationship is one-to-one.
7. Run all existing application regression tests.

## Done When

- Prisma validate/generate pass.
- Typecheck/build pass.
- Existing application tests stay green.

---

# Phase 2 — Desktop CRUD Backend

## Goal

Allow workspace users to create, read, update, and archive desktop apps.

## Backend

Recommended endpoints:

```text
POST   /workspaces/:workspaceId/desktop-apps
GET    /workspaces/:workspaceId/desktop-apps
GET    /workspaces/:workspaceId/desktop-apps/:desktopAppId
PATCH  /workspaces/:workspaceId/desktop-apps/:desktopAppId
DELETE /workspaces/:workspaceId/desktop-apps/:desktopAppId
```

Example payload:

```json
{
  "name": "Command Center Desktop",
  "platform": "CROSS_PLATFORM",
  "framework": "ELECTRON",
  "architecture": "X64",
  "packageName": "com.commandcenter.desktop"
}
```

Implement:

- Controller
- Service
- DTO validation
- `JwtAuthGuard`
- `WorkspaceAccessGuard`
- Existing workspace role rules
- Activity entry where appropriate
- Archive behavior rather than destructive delete if that matches existing application behavior

## Frontend

Add typed API client functions:

```text
createDesktopApp()
listDesktopApps()
getDesktopApp()
updateDesktopApp()
archiveDesktopApp()
```

## E2E Testing

1. Owner creates desktop app.
2. Valid app appears in workspace list.
3. Detail endpoint returns correct app.
4. Update persists.
5. Archive removes app from active list.
6. Invalid platform returns `400`.
7. Invalid framework returns `400`.
8. Unauthenticated request returns `401`.
9. Non-member access is denied.
10. Workspace A cannot access Workspace B desktop app.

## Done When

- CRUD is fully API E2E tested.
- Workspace isolation is verified.

---

# Phase 3 — Desktop Apps Frontend

## Goal

Expose Desktop Apps as a first-class workspace feature.

## Backend

No major new backend work beyond Phase 2.

Optional later support:

- Search
- Pagination
- Filter by platform/framework/status

## Frontend

Add sidebar item:

```text
Desktop Apps
```

Route:

```text
/workspaces/:workspaceId/desktop-apps
```

Build:

- List page
- Empty state
- `Add Desktop App`
- Create form
- Edit form
- Archive confirmation
- Platform badge
- Framework badge
- Version/build display

Example card:

```text
Command Center Desktop
Cross-platform • Electron

Version 2.4.0
Build 184

[Open] [Edit]
```

## E2E Testing

1. Login.
2. Open workspace.
3. Open Desktop Apps.
4. Verify empty state.
5. Create Electron app.
6. Verify new card.
7. Open detail page.
8. Edit metadata.
9. Refresh and verify persistence.
10. Archive app.
11. Verify archived app disappears from active list.
12. Verify frontend error state for failed API request.

## Done When

- Full desktop CRUD works from the browser.
- Responsive and collapsed-sidebar states remain correct.

---

# Phase 4 — Repository Linking

## Goal

Link desktop apps to repositories already connected through the GitHub App.

## Backend

Reuse:

```text
RepositoryConnection
RepositoryInstallation
Existing GitHub integration
```

Recommended operations:

```text
POST   /workspaces/:workspaceId/desktop-apps/:desktopAppId/repository
DELETE /workspaces/:workspaceId/desktop-apps/:desktopAppId/repository
```

Validate:

- Desktop app belongs to workspace.
- Repository belongs to same workspace.
- Repository is available.
- User has required role.

## Frontend

Show repository state:

```text
Repository
Not connected

[Connect Repository]
```

Repository selector should use existing connected repositories.

After linking:

```text
Repository: company/command-center-desktop
Branch: main

[Browse Code] [Change Repository]
```

## E2E Testing

1. Create desktop app.
2. Link valid repository.
3. Reload and verify persistence.
4. Change repository.
5. Unlink repository.
6. Reject cross-workspace repository.
7. Reject missing repository.
8. Reject unauthorized modification.

## Done When

- Desktop apps reuse current repository infrastructure.
- No duplicate GitHub connection system exists.

---

# Phase 5 — Automatic Desktop Project Detection

## Goal

Detect framework/platform automatically from repository contents.

## Backend

Extend the repository analyzer.

### Electron

Detect:

```text
package.json
electron dependency
electron-builder
electron-forge
```

### Tauri

Detect:

```text
src-tauri/
Cargo.toml
tauri.conf.json
tauri.conf.json5
```

### .NET

Detect:

```text
*.sln
*.csproj
WPF
WinUI
Windows Forms
Avalonia
```

### Qt

Detect:

```text
CMakeLists.txt
*.pro
Qt dependencies
```

### Java Desktop

Detect:

```text
pom.xml
build.gradle
JavaFX
Swing
```

### Native macOS

Detect:

```text
*.xcodeproj
*.xcworkspace
AppKit
SwiftUI macOS target
```

Return normalized result:

```json
{
  "applicationType": "DESKTOP",
  "platform": "CROSS_PLATFORM",
  "framework": "ELECTRON",
  "confidence": "HIGH",
  "version": "2.4.0"
}
```

## Frontend

Show detection result before saving:

```text
Desktop project detected

Framework: Electron
Platform: Cross-platform
Version: 2.4.0

[Use detected configuration]
```

Allow user correction.

## E2E Testing

Use controlled fixtures for:

1. Electron.
2. Tauri.
3. WPF.
4. WinUI.
5. Qt.
6. JavaFX.
7. Native macOS.
8. Non-desktop repository.
9. Monorepo containing web + desktop apps.

Verify correct detection, confidence, safe handling of missing files, and repository authorization.

## Done When

- Detection is evidence-based.
- Manual override is supported.

---

# Phase 6 — Desktop App Overview

## Goal

Create the main desktop application detail page.

## Backend

Optional aggregate endpoint:

```text
GET /workspaces/:workspaceId/desktop-apps/:desktopAppId/overview
```

Return:

- Name
- Platform
- Framework
- Architecture
- Version/build
- Repository/branch
- Latest build
- Latest release
- Latest performance summary when available

## Frontend

Route:

```text
/workspaces/:workspaceId/desktop-apps/:desktopAppId
```

Tabs:

```text
Overview | Code | Builds | Tests | Releases | Performance | Crashes | Dependencies | Security | Settings
```

Example:

```text
Command Center Desktop
Electron • Cross-platform

Version       2.4.0
Build         184
Repository    command-center-desktop
Branch        main
Architecture  x64 + arm64
Channel       Stable
```

## E2E Testing

1. Open valid overview.
2. Verify persisted metadata.
3. Verify repository information.
4. Verify missing optional fields render safely.
5. Reject invalid app ID.
6. Reject cross-workspace access.
7. Verify deep-route browser refresh.

## Done When

- Stable desktop detail route exists for all later phases.

---

# Phase 7 — Code Explorer Integration

## Goal

Reuse the existing repository Code Explorer.

## Backend

Do not create desktop-specific source-code endpoints.

Reuse current repository Code Explorer APIs for:

- Branches
- Tree
- File content
- Search
- Diff

## Frontend

`Code` tab/button should open the linked repository's existing Code Explorer.

If no repository is linked:

```text
Connect a repository to browse code.
```

## E2E Testing

1. Linked desktop app shows Code action.
2. Code action opens correct repository.
3. Branch list loads.
4. File tree loads.
5. Source file opens.
6. Search works.
7. Diff works.
8. Cross-workspace repository access fails.
9. No-repository empty state works.

## Done When

- Zero Code Explorer duplication.

---

# Phase 8 — Desktop Build Tracking

## Goal

Track CI/CD desktop builds.

## Backend

Add `DesktopBuild`:

```text
id
workspaceId
desktopAppId
repositoryId
workflowRunId
commitSha
branch
version
buildNumber
platform
architecture
status
startedAt
completedAt
durationMs
```

Statuses:

```text
QUEUED
BUILDING
SUCCESS
FAILED
CANCELLED
```

Initial provider:

```text
GitHub Actions
```

Support build matrices such as:

```text
Windows x64
Windows arm64
macOS x64
macOS arm64
Linux x64
```

## Frontend

Builds tab:

```text
Build #184
Version      2.4.0
Platform     Windows
Architecture x64
Branch       main
Commit       a93f142
Status       Success
Duration     7m 20s
```

Filters:

- Platform
- Architecture
- Status
- Branch
- Version

## E2E Testing

1. Ingest queued build.
2. Update to building.
3. Update to success.
4. Persist failed build.
5. Duplicate webhook remains idempotent.
6. Map build to correct app/repository.
7. Verify build matrix records.
8. Ignore unrelated repository event.
9. Verify workspace isolation.

## Done When

- Build history is durable and idempotent.

---

# Phase 9 — Build Artifact Tracking

## Goal

Track the actual desktop installer/package outputs generated by builds.

## Backend

Add `DesktopBuildArtifact`:

```text
id
buildId
platform
architecture
type
fileName
sizeBytes
checksum
externalUrl
createdAt
```

Artifact types:

```text
EXE
MSI
MSIX
DMG
PKG
APP
APPIMAGE
DEB
RPM
ZIP
OTHER
```

Store metadata/provider references rather than binary files in the primary database.

## Frontend

Build detail:

```text
Artifacts

command-center-2.4.0-x64.msi
Windows • x64 • 84 MB

command-center-2.4.0-arm64.dmg
macOS • arm64 • 91 MB
```

## E2E Testing

1. Attach artifact to build.
2. Support multiple artifacts.
3. Reject invalid build ID.
4. Handle duplicate artifact event safely.
5. Persist correct platform/architecture.
6. Prevent cross-workspace artifact access.
7. Missing remote artifact does not crash build detail.

## Done When

- Build outputs are traceable by build/version/platform.

---

# Phase 10 — Desktop Test Tracking

## Goal

Associate test results with desktop builds.

## Backend

Add:

```text
DesktopTestRun
- id
- buildId
- type
- status
- passed
- failed
- skipped
- durationMs
```

Types:

```text
UNIT
INTEGRATION
UI
E2E
INSTALLER
OTHER
```

Optional failure detail:

```text
DesktopTestFailure
- testRunId
- suite
- testName
- message
- file
```

## Frontend

Tests tab:

```text
Build #184

Unit Tests
412 passed
0 failed

Desktop UI
42 passed
1 failed

Installer Tests
8 passed
0 failed
```

## E2E Testing

1. Add test run to build.
2. Persist pass/fail/skipped counts.
3. Persist failure details.
4. Aggregate build test status.
5. Display failed test details.
6. Reject cross-workspace build relationship.
7. Duplicate CI result remains idempotent.

## Done When

- Build → test relationship is reliable.

---

# Phase 11 — Releases & Update Channels

## Goal

Track desktop releases and deployment/update channels.

## Backend

Add `DesktopRelease`:

```text
id
workspaceId
desktopAppId
buildId
version
buildNumber
channel
platform
architecture
status
releaseNotes
releasedAt
```

Channels:

```text
DEV
ALPHA
BETA
STABLE
LTS
```

Statuses:

```text
DRAFT
READY
PUBLISHED
FAILED
ROLLED_BACK
```

Prepare architecture for future updater/store integrations:

- Electron autoUpdater
- Tauri updater
- Microsoft Store
- Mac App Store
- Custom updater

## Frontend

Releases page:

```text
2.4.0
Stable
Windows + macOS
Published

2.5.0-beta.2
Beta
Windows + macOS
Published
```

## E2E Testing

1. Create release from successful build.
2. Reject invalid/nonexistent build.
3. Persist version and build number.
4. Persist update channel.
5. Verify status transitions.
6. Verify rollback state.
7. Reject cross-workspace build.
8. Verify release history ordering.

## Done When

- Source → build → artifact → release chain is traceable.

---

# Phase 12 — Desktop Telemetry Foundation

## Goal

Create provider-neutral runtime monitoring.

## Important Constraint

GitHub and CI cannot provide real runtime CPU, memory, startup, crash, or hang metrics from end-user machines. A telemetry provider/instrumentation is required.

## Backend

Provider interface:

```ts
interface DesktopTelemetryProvider {
  getCrashes(): Promise<unknown>;
  getPerformance(): Promise<unknown>;
  getVersions(): Promise<unknown>;
}
```

Potential providers:

```text
Sentry
Datadog
New Relic
OpenTelemetry
Custom telemetry service
```

Add `DesktopTelemetryIntegration`:

```text
id
workspaceId
desktopAppId
provider
status
externalProjectId
configuredAt
lastSyncedAt
```

Requirements:

- Secrets remain backend-only.
- Provider-specific responses are normalized.
- Retry/background sync supported.
- Provider failure does not break desktop app pages.

## Frontend

Settings:

```text
Runtime Monitoring
Provider: Sentry
Status: Connected
Last Sync: 2 minutes ago
```

## E2E Testing

Use fake provider:

1. Connect provider configuration.
2. Validate required fields.
3. Verify secret is never returned.
4. Sync fake provider.
5. Handle provider failure.
6. Disconnect integration.
7. Verify workspace isolation.
8. Verify normalized metrics output.

## Done When

- Runtime layer is provider-independent.

---

# Phase 13 — Performance & Crash Monitoring

## Goal

Show runtime health by version, OS, architecture, and release.

## Backend

Normalized metrics:

```text
Crash-free users/sessions
Crash count
Startup time
Memory usage
CPU usage
Hang/freeze rate
Network latency
API failure rate
Version adoption
```

Add crash model:

```text
DesktopCrash
- id
- desktopAppId
- version
- platform
- architecture
- fingerprint
- message
- count
- affectedUsers
- firstSeenAt
- lastSeenAt
```

Support filters:

- Time range
- Version
- Platform
- Architecture
- Channel

## Frontend

Performance page:

```text
Version 2.4.0

Crash-free users   99.7%
Startup            1.8s
Memory             242 MB
CPU                4.8%
Crashes            12
```

Crash page:

```text
Renderer crash
Windows 11
Version 2.4.0
8 users

Native module crash
macOS arm64
Version 2.4.0
3 users
```

## E2E Testing

1. Ingest crash fixture.
2. Ingest CPU metric.
3. Ingest memory metric.
4. Ingest startup metric.
5. Associate correct version.
6. Associate correct platform/architecture.
7. Test version/platform filters.
8. Test missing metrics state.
9. Test cross-workspace isolation.
10. Verify frontend values after refresh.

## Done When

- Runtime health is understandable by version/platform.

---

# Phase 14 — Dependency & Security Health

## Goal

Expose desktop dependency and packaging/security risks.

## Backend

Detect ecosystems:

```text
Electron → npm/pnpm/yarn
Tauri → npm + Cargo
.NET → NuGet
Qt/C++ → CMake/conan/vcpkg where available
Java → Maven/Gradle
```

Track:

```text
Dependency
Current version
Latest known version
Direct/transitive
Risk status
```

Security/signing checks:

- Known vulnerable dependency metadata when an integration/source exists.
- Windows signing configuration status.
- macOS signing configuration status.
- Notarization status where available.
- Missing signing configuration.
- Unsafe packaging/build configuration.

Never expose signing private keys/certificates.

## Frontend

Dependencies:

```text
electron  31.2.0  Update available
react     19.x    Current
```

Security:

```text
Windows signing    Configured
macOS signing      Configured
Notarization       Passed
Critical risks     0
```

## E2E Testing

1. Detect dependency manifests.
2. Parse controlled fixtures.
3. Handle malformed manifests.
4. Detect signing configured/not configured state.
5. Ensure signing secrets never appear in API responses.
6. Verify cross-workspace isolation.
7. Verify unsupported ecosystems degrade safely.

## Done When

- Dependency/security data is useful without exposing secrets.

---

# Phase 15 — Desktop Alerts

## Goal

Notify teams about important desktop development/runtime problems.

## Backend

Rules can include:

```text
Build failed
Crash rate > threshold
Startup > threshold
Memory > threshold
CPU > threshold
Release regression
Signing failure
Telemetry unavailable
```

Models:

```text
DesktopAlertRule
DesktopAlertIncident
```

Reuse existing notifications/activity/background jobs.

Support:

- Trigger
- Resolve
- Deduplication
- Cooldown
- Enable/disable

## Frontend

```text
Desktop Alerts

Crash rate > 2%
Startup > 3 sec
Build failed
Signing failed
```

Incident example:

```text
Performance Regression
Command Center Desktop 2.4.0
Startup increased 1.5s → 2.4s
```

## E2E Testing

1. Create alert rule.
2. Below threshold → no incident.
3. Above threshold → incident created.
4. Duplicate evaluation → no duplicate spam.
5. Recovery → resolve incident.
6. Disabled rule → no trigger.
7. Failed build → build alert.
8. Signing failure → security alert.
9. Verify workspace isolation.

## Done When

- Alerts are useful and idempotent.

---

# Phase 16 — AI Desktop Analysis

## Goal

Explain build failures, crash increases, and performance regressions using project context.

## Backend

Aggregate:

```text
Repository
Commits
Diffs
Builds
Build logs
Artifacts
Tests
Releases
Crashes
Performance
Dependencies
Security findings
Alerts
```

Example questions:

```text
Why is Windows build #185 failing?
Why are crashes higher after 2.4.0?
Why did startup become slower?
What changed in this release?
```

AI must clearly distinguish:

- Evidence
- Correlation
- Likely cause
- Unknown cause

## Frontend

Actions:

```text
Analyze Build Failure
Explain Crash Increase
Explain Performance Regression
Summarize Release Health
```

Show evidence links where possible.

## E2E Testing

Using deterministic/mock AI provider:

1. Build analysis receives correct build/test context.
2. Crash analysis receives correct version/crash context.
3. Performance analysis receives before/after metrics.
4. Workspace B data never appears in Workspace A prompt/context.
5. Secrets are excluded.
6. Missing evidence returns uncertainty.
7. AI provider failure returns safe error.
8. Evidence references map to valid records.

## Done When

- AI responses are grounded in SaaS Command Center data.

---

# Phase 17 — Security & Authorization Hardening

## Goal

Audit every desktop feature for workspace and role isolation.

## Backend

Apply existing patterns:

```text
JwtAuthGuard
WorkspaceAccessGuard
WorkspaceRolesGuard
```

Audit:

- Desktop CRUD
- Repository linking
- Builds
- Artifacts
- Tests
- Releases
- Telemetry
- Performance
- Crashes
- Dependencies
- Security
- Alerts
- AI context

Rules:

- Every resource query must be workspace-scoped.
- No global ID lookup without workspace verification.
- Webhook signatures verified.
- Replay/duplicate events handled safely.
- Telemetry secrets hidden.
- Signing secrets hidden.

## Frontend

- Hide/disable actions based on permissions.
- Keep viewer/read-only behavior consistent.
- Never display provider/signing secrets.

## E2E Testing

Create Workspace A and Workspace B.

Verify:

1. A cannot read B desktop app.
2. A cannot modify B desktop app.
3. A cannot link B repository.
4. A cannot access B builds.
5. A cannot access B artifacts.
6. A cannot access B tests.
7. A cannot access B releases.
8. A cannot access B telemetry/performance/crashes.
9. A cannot access B alerts.
10. AI for A cannot receive B context.
11. Unauthenticated requests return `401`.
12. Viewer cannot perform protected writes.
13. Invalid webhook signature is rejected.

## Done When

- All cross-workspace and role tests pass.

---

# Phase 18 — Full E2E Verification & Regression

## Goal

Verify the complete desktop lifecycle and ensure existing SaaS Command Center features still work.

## Backend Verification

Run:

```text
Lint
Format check
Typecheck
Build
Unit tests
API E2E
Repository tests
GitHub tests
Desktop tests
Worker tests
Webhook tests
Security tests
```

## Frontend Verification

Run:

```text
Lint
Typecheck
Production build
Component tests
API client tests
Browser E2E
Responsive layout checks
Collapsed sidebar checks
Loading/error/empty states
```

## Complete E2E Scenario A — Electron

```text
Login
→ Open Workspace
→ Connect GitHub
→ Sync Repositories
→ Add Desktop App
→ Select Electron
→ Link Repository
→ Detect Electron
→ Save App
→ Open Overview
→ Browse Code
→ Receive Build Event
→ Track Windows/macOS Builds
→ Track Artifacts
→ Track Tests
→ Create Stable Release
→ Ingest Performance
→ Ingest Crash
→ Trigger Alert
→ Run AI Analysis
```

## Complete E2E Scenario B — Tauri

```text
Create Desktop App
→ Link Tauri Repository
→ Detect src-tauri + Cargo
→ Browse Code
→ Track Build
→ Track MSI/DMG Artifact
→ Track Tests
→ Create Beta Release
→ Ingest Runtime Metrics
```

## Complete E2E Scenario C — .NET Windows

```text
Create Desktop App
→ Windows
→ Link Repository
→ Detect .sln/.csproj
→ Detect WPF/WinUI
→ Browse Code
→ Track Build
→ Track MSI/MSIX
→ Track Tests
→ Release
→ Performance
→ Crash Monitoring
```

## Complete E2E Scenario D — Native macOS

```text
Create Desktop App
→ macOS
→ Link Xcode Repository
→ Detect macOS Target
→ Browse Code
→ Track Build
→ Track DMG/PKG
→ Verify Signing Metadata
→ Track Release
→ Track Crash/Performance
```

## Complete E2E Scenario E — Security

```text
Workspace A
├── Desktop App A
└── Repository A

Workspace B
├── Desktop App B
└── Repository B
```

Verify A cannot read/modify/link/access any B resource, and AI for A receives no B context.

## Complete E2E Scenario F — Existing Product Regression

Verify desktop support did not break:

```text
Authentication
Workspaces
Applications
Websites
Mobile Apps
Activity
Monitoring
Repositories
GitHub Connect
Repository Sync
Code Explorer
Notifications
Settings
```

---

# 5. Recommended Frontend Routes

```text
/workspaces/:workspaceId/desktop-apps
/workspaces/:workspaceId/desktop-apps/:desktopAppId
/workspaces/:workspaceId/desktop-apps/:desktopAppId/code
/workspaces/:workspaceId/desktop-apps/:desktopAppId/builds
/workspaces/:workspaceId/desktop-apps/:desktopAppId/builds/:buildId
/workspaces/:workspaceId/desktop-apps/:desktopAppId/tests
/workspaces/:workspaceId/desktop-apps/:desktopAppId/releases
/workspaces/:workspaceId/desktop-apps/:desktopAppId/performance
/workspaces/:workspaceId/desktop-apps/:desktopAppId/crashes
/workspaces/:workspaceId/desktop-apps/:desktopAppId/dependencies
/workspaces/:workspaceId/desktop-apps/:desktopAppId/security
/workspaces/:workspaceId/desktop-apps/:desktopAppId/alerts
/workspaces/:workspaceId/desktop-apps/:desktopAppId/settings
```

The Code route should reuse the existing Repository Code Explorer implementation.

---

# 6. Recommended Backend Structure

```text
apps/api/src/modules/desktop-apps/
├── controllers/
│   ├── desktop-apps.controller.ts
│   ├── desktop-builds.controller.ts
│   ├── desktop-tests.controller.ts
│   ├── desktop-releases.controller.ts
│   ├── desktop-performance.controller.ts
│   ├── desktop-crashes.controller.ts
│   ├── desktop-health.controller.ts
│   └── desktop-alerts.controller.ts
├── dto/
│   ├── desktop-app.dto.ts
│   ├── desktop-build.dto.ts
│   ├── desktop-release.dto.ts
│   ├── desktop-performance.dto.ts
│   └── desktop-alert.dto.ts
├── services/
│   ├── desktop-apps.service.ts
│   ├── desktop-project-detector.service.ts
│   ├── desktop-builds.service.ts
│   ├── desktop-tests.service.ts
│   ├── desktop-releases.service.ts
│   ├── desktop-performance.service.ts
│   ├── desktop-crashes.service.ts
│   ├── desktop-dependency-health.service.ts
│   ├── desktop-security.service.ts
│   ├── desktop-alerts.service.ts
│   └── desktop-analysis-context.service.ts
├── telemetry/
│   ├── desktop-telemetry-provider.interface.ts
│   └── providers/
└── desktop-apps.module.ts
```

Use the repository's existing naming/module conventions if they differ.

---

# 7. Recommended Frontend Structure

```text
apps/web/src/features/desktop-apps/
├── desktop-apps-api.ts
├── desktop-app.types.ts
├── desktop-apps-page.tsx
├── desktop-app-card.tsx
├── create-desktop-app.tsx
├── desktop-app-overview.tsx
├── desktop-builds.tsx
├── desktop-build-artifacts.tsx
├── desktop-tests.tsx
├── desktop-releases.tsx
├── desktop-performance.tsx
├── desktop-crashes.tsx
├── desktop-dependencies.tsx
├── desktop-security.tsx
├── desktop-alerts.tsx
└── desktop-app-settings.tsx
```

---

# 8. Recommended E2E Test Structure

```text
packages/test-code/api/e2e/
├── desktop-apps.e2e-spec.ts
├── desktop-repository-linking.e2e-spec.ts
├── desktop-project-detection.e2e-spec.ts
├── desktop-builds.e2e-spec.ts
├── desktop-artifacts.e2e-spec.ts
├── desktop-tests.e2e-spec.ts
├── desktop-releases.e2e-spec.ts
├── desktop-telemetry.e2e-spec.ts
├── desktop-performance.e2e-spec.ts
├── desktop-security-health.e2e-spec.ts
├── desktop-alerts.e2e-spec.ts
├── desktop-security.e2e-spec.ts
└── desktop-full-flow.e2e-spec.ts
```

Frontend/browser tests should follow the current web testing conventions.

---

# 9. Final Architecture

```text
                       SaaS Command Center
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
        Web/API              Mobile              Desktop
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                │                 │                │                 │                 │
             Windows            macOS            Linux          Cross-platform     Frameworks
                │                 │                │                 │
                └─────────────────┴────────────────┴─────────────────┘
                                                   │
           ┌───────────┬──────────┬─────────┬───────────┬─────────────┬──────────────┐
           │           │          │         │           │             │              │
          Code       Builds    Artifacts   Tests     Releases    Performance     Security
           │           │          │         │           │             │              │
         GitHub     CI/CD      MSI/DMG    CI Tests    Channels     Telemetry      Dependency/
                                                                   + Crashes      Signing
                                                   │
                                                Alerts
                                                   │
                                              AI Analysis
```

---

# 10. Recommended Implementation Order

```text
Phase 1  → Desktop Foundation
Phase 2  → CRUD Backend
Phase 3  → Desktop Apps Frontend
Phase 4  → Repository Linking
Phase 5  → Project Detection
Phase 6  → Desktop Overview
Phase 7  → Code Explorer Integration
Phase 8  → Build Tracking
Phase 9  → Build Artifacts
Phase 10 → Test Tracking
Phase 11 → Releases & Update Channels
Phase 12 → Telemetry Foundation
Phase 13 → Performance & Crash Monitoring
Phase 14 → Dependency & Security Health
Phase 15 → Alerts
Phase 16 → AI Analysis
Phase 17 → Security Hardening
Phase 18 → Full E2E Verification
```

---

# 11. Definition of Done for Every Phase

A phase is complete only when all applicable checks pass:

- Backend implementation complete.
- Frontend implementation complete.
- Shared contracts updated.
- Prisma migration added when required.
- Workspace authorization applied.
- Validation added.
- Loading state handled.
- Empty state handled.
- Error state handled.
- Unit tests pass.
- API E2E tests pass.
- Frontend tests pass.
- Cross-workspace isolation tested.
- Existing regression tests pass.
- Typecheck passes.
- Production build passes.
- Lint/format checks pass.
- No secrets exposed.
- Project implementation summary updated.

---

# 12. Final Product Result

After all phases, a workspace user should be able to:

```text
Add Desktop App
→ Select Windows/macOS/Linux/Cross-platform
→ Select Framework
→ Connect GitHub Repository
→ Auto-detect Desktop Project
→ Browse Code
→ Track Builds
→ Track EXE/MSI/DMG/PKG/AppImage Artifacts
→ Track Tests
→ Track Releases
→ Manage Stable/Beta Channels
→ Check Crashes
→ Check CPU/Memory/Startup Performance
→ Check Dependency Health
→ Check Signing/Security Status
→ Receive Alerts
→ Ask AI Why Something Failed or Regressed
```

This makes Desktop Apps a complete development-lifecycle feature while keeping it integrated with the rest of SaaS Command Center.
