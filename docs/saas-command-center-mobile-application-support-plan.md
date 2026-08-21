# SaaS Command Center — Mobile Application Support Development Plan

## 1. Goal

Add **first-class mobile application support** to SaaS Command Center so workspace users can:

- Add and manage Android, iOS, Flutter, React Native, and Kotlin Multiplatform applications.
- Link mobile applications to existing GitHub repositories.
- Automatically detect mobile project type and metadata.
- Reuse the existing Code Explorer.
- Track builds, tests, releases, and CI/CD activity.
- Connect telemetry providers for crashes, ANRs/hangs, startup, memory, network, and performance metrics.
- Create alerts for build, crash, and performance regressions.
- Add AI-assisted analysis later using repository, build, test, release, and telemetry context.
- Keep all mobile data isolated by workspace and protected by existing authentication/authorization patterns.

---

# 2. Architecture Principles

## Reuse Existing SaaS Command Center Systems

Do not build duplicate systems for mobile.

Reuse:

- `SaasApplication`
- Workspaces
- Workspace members and roles
- GitHub App integration
- Repository connections
- Repository analyzer
- Code Explorer
- Activity
- Notifications
- Monitoring
- Background workers
- Existing API authentication
- Existing E2E test infrastructure

## Application Types

```text
Application
├── WEB
├── API
├── MOBILE
├── WORKER
└── OTHER
```

## Mobile Platforms

```text
MobilePlatform
├── ANDROID
├── IOS
└── CROSS_PLATFORM
```

## Mobile Frameworks

```text
MobileFramework
├── ANDROID_NATIVE
├── IOS_NATIVE
├── FLUTTER
├── REACT_NATIVE
├── KMP
└── OTHER
```

---

# 3. Target User Flow

```text
Workspace
   ↓
Mobile Apps
   ↓
Add Mobile App
   ↓
Choose platform/framework
   ↓
Connect GitHub repository
   ↓
Analyze repository
   ↓
Detect mobile project metadata
   ↓
Create mobile application
   ↓
Overview
   ├── Code
   ├── Builds
   ├── Tests
   ├── Releases
   ├── Performance
   └── Settings
```

---

# 4. Phase Summary

| Phase | Feature | Backend | Frontend | E2E Focus |
|---|---|---|---|---|
| 1 | Mobile Foundation | Models, enums, migrations, contracts | Shared types only | Schema + isolation foundations |
| 2 | Mobile App CRUD | CRUD APIs + guards | API client layer | Create/read/update/archive |
| 3 | Mobile Apps UI | Existing APIs | List/create/edit UI | Full CRUD from browser |
| 4 | Repository Linking | Link repository to app | Repository selector | Link/unlink + workspace isolation |
| 5 | Project Detection | Extend repository analyzer | Detection results UI | Android/iOS/Flutter/RN detection |
| 6 | Mobile Overview | Aggregated overview endpoint | App detail overview | Metadata + repository display |
| 7 | Code Explorer | Reuse current code APIs | Mobile-to-code navigation | Browse linked mobile repo |
| 8 | Build Tracking | Build models + ingestion | Builds page | Build create/update/status flow |
| 9 | Test Tracking | Test run/result models | Tests page | Build-to-test relationship |
| 10 | Releases | Release models + APIs | Releases page | Release lifecycle |
| 11 | Telemetry Foundation | Provider abstraction | Integration settings | Provider connect/config flow |
| 12 | Android Performance | Android metric ingestion | Android metrics UI | Crash/ANR/startup metrics |
| 13 | iOS Performance | iOS metric ingestion | iOS metrics UI | Crash/hang/startup metrics |
| 14 | Performance Dashboard | Normalized metric queries | Unified dashboard | Version comparison |
| 15 | Alerts | Rules + evaluation | Alert configuration | Trigger/resolve notification flow |
| 16 | AI Analysis | Context aggregation | AI analysis UI | Grounded analysis requests |
| 17 | Security | Authorization hardening | Permission-aware UI | Cross-workspace/role tests |
| 18 | Full Verification | Final hardening | Final hardening | Full stack regression |

---

# Phase 1 — Mobile Application Foundation

## Goal

Create the data model and shared contracts required for mobile applications without duplicating the existing application architecture.

## Backend

### Add/extend enums

```text
ApplicationType
- WEB
- API
- MOBILE
- WORKER
- OTHER
```

```text
MobilePlatform
- ANDROID
- IOS
- CROSS_PLATFORM
```

```text
MobileFramework
- ANDROID_NATIVE
- IOS_NATIVE
- FLUTTER
- REACT_NATIVE
- KMP
- OTHER
```

### Add mobile metadata model

```text
SaasApplication
      │
      └── MobileApplication
```

Suggested fields:

```text
MobileApplication
- id
- applicationId
- platform
- framework
- packageId
- bundleId
- minOsVersion
- targetOsVersion
- currentVersion
- currentBuildNumber
- createdAt
- updatedAt
```

### Backend work

- Add Prisma models/enums.
- Add unique constraints.
- Add indexes for workspace/application lookups.
- Add migration.
- Regenerate Prisma client.
- Add shared DTO/type contracts.
- Update application types without breaking existing web/API applications.

## Frontend

- Add shared mobile enums/types.
- Add display labels for platform/framework.
- Add mobile icon/type support in reusable application UI where necessary.

## E2E Testing Plan

1. Migration applies successfully.
2. Existing applications still load.
3. A `MOBILE` application can be stored.
4. Mobile metadata is correctly related to the parent application.
5. Duplicate mobile metadata for one application is rejected.
6. Deleting/archiving parent entities does not create orphan mobile records.
7. Workspace/application relationships remain intact.

## Acceptance Criteria

- Existing tests remain green.
- Prisma schema validates.
- Prisma generate succeeds.
- New migration works on clean test DB.
- Existing application flows are not broken.

---

# Phase 2 — Mobile App CRUD Backend

## Goal

Allow authenticated workspace users to create and manage mobile applications.

## Backend

Add endpoints:

```text
POST   /workspaces/:workspaceId/mobile-apps
GET    /workspaces/:workspaceId/mobile-apps
GET    /workspaces/:workspaceId/mobile-apps/:mobileAppId
PATCH  /workspaces/:workspaceId/mobile-apps/:mobileAppId
DELETE /workspaces/:workspaceId/mobile-apps/:mobileAppId
```

Example create payload:

```json
{
  "name": "Karwa Passenger",
  "platform": "ANDROID",
  "framework": "ANDROID_NATIVE",
  "packageId": "com.karwa.app",
  "minOsVersion": "26",
  "targetOsVersion": "36"
}
```

Backend work:

- Mobile apps controller.
- Mobile apps service.
- DTO validation.
- Workspace access guard.
- Workspace role restrictions for write operations.
- Consistent API responses.
- Activity event on create/update/archive where appropriate.
- Prefer archive over destructive delete if consistent with existing application behavior.

## Frontend

Build typed API client functions:

```text
createMobileApp()
listMobileApps()
getMobileApp()
updateMobileApp()
archiveMobileApp()
```

## E2E Testing Plan

1. Owner can create mobile app.
2. Admin can create mobile app if allowed by current role rules.
3. Unauthorized user receives `401`.
4. Non-member receives `403/404` according to current isolation policy.
5. Invalid platform is rejected.
6. Invalid framework is rejected.
7. Missing required fields return `400`.
8. List returns only current workspace mobile apps.
9. Detail endpoint returns correct mobile app.
10. Update changes allowed fields.
11. Archive/delete removes it from active list.
12. Workspace A cannot access Workspace B mobile app.

## Acceptance Criteria

- CRUD APIs fully covered by API E2E.
- No cross-workspace data leak.
- Validation errors are deterministic.

---

# Phase 3 — Mobile Apps Frontend

## Goal

Expose mobile apps as a workspace feature.

## Backend

No major new backend behavior beyond Phase 2.

Potential additions:

- Pagination if needed.
- Search/filter support if consistent with existing application patterns.

## Frontend

Add sidebar item:

```text
WORKSPACE
├── Overview
├── Applications
├── Websites
├── Mobile Apps
└── Activity
```

Add route:

```text
/workspaces/:workspaceId/mobile-apps
```

Build:

- Mobile Apps list.
- Empty state.
- `+ Add Mobile App` action.
- Create form/modal/page.
- Edit form.
- Archive confirmation.
- Platform/framework badges.
- Package ID / Bundle ID display.

Example card:

```text
Karwa Passenger
Android • Native

com.karwa.app

Version: 6.14.0
Build: 815

[Open] [Edit]
```

## E2E Testing Plan

1. Login.
2. Open workspace.
3. Open Mobile Apps.
4. Empty state appears when no mobile apps exist.
5. Create Android mobile app.
6. New app appears in correct workspace.
7. Open app detail route.
8. Edit metadata.
9. Refresh page and verify persistence.
10. Archive app.
11. Archived app no longer appears in active list.
12. Error state is shown when API fails.

## Acceptance Criteria

- User can complete CRUD without direct API calls.
- Responsive UI works with expanded and collapsed sidebar.
- Existing navigation remains unaffected.

---

# Phase 4 — Repository Linking

## Goal

Allow a mobile application to use an existing connected GitHub repository.

## Backend

Reuse:

- `RepositoryInstallation`
- `RepositoryConnection`
- Existing GitHub App integration.

Relationship:

```text
MobileApplication
      ↓
SaasApplication
      ↓
RepositoryConnection
```

Possible endpoints:

```text
POST   /workspaces/:workspaceId/mobile-apps/:mobileAppId/repository
DELETE /workspaces/:workspaceId/mobile-apps/:mobileAppId/repository
```

Or reuse the existing application-repository linking API if it already supports `SaasApplication`.

Validate:

- Repository belongs to same workspace.
- Mobile app belongs to same workspace.
- Repository is available.
- User has correct role.

## Frontend

```text
Repository
Not connected

[Connect Repository]
```

After linking:

```text
Repository: company/karwa-android
Branch: development

[Browse Code] [Change Repository]
```

## E2E Testing Plan

1. Create mobile app.
2. Connect GitHub repository.
3. Link repository to mobile app.
4. Reload and verify relationship persists.
5. Unlink repository.
6. Link repository from another workspace → reject.
7. Link missing repository → reject.
8. Viewer role cannot modify link if prohibited.
9. Archived/unavailable repository cannot be newly linked.

## Acceptance Criteria

- Mobile apps reuse existing repository infrastructure.
- No duplicate GitHub connection architecture.

---

# Phase 5 — Automatic Mobile Project Detection

## Goal

Extend repository analysis to recognize mobile projects and extract useful metadata.

## Backend

Extend the existing repository analyzer.

### Android

Detect:

```text
settings.gradle
settings.gradle.kts
build.gradle
build.gradle.kts
gradlew
AndroidManifest.xml
```

Extract where safely possible:

```text
platform
framework
packageId
minSdk
targetSdk
versionName
versionCode
modules
```

### iOS

Detect:

```text
*.xcodeproj
*.xcworkspace
Info.plist
Podfile
Package.swift
```

### Flutter

Detect:

```text
pubspec.yaml
lib/
android/
ios/
```

### React Native

Detect:

```text
package.json
metro.config.js
android/
ios/
```

### Kotlin Multiplatform

Detect relevant Gradle/KMP configuration.

Normalized result example:

```json
{
  "applicationType": "MOBILE",
  "platform": "ANDROID",
  "framework": "ANDROID_NATIVE",
  "packageId": "com.example.app",
  "confidence": "HIGH"
}
```

## Frontend

Show detection result before save:

```text
Detected project

Platform: Android
Framework: Native Android
Package: com.example.app
Build system: Gradle

[Use detected configuration]
```

Allow manual correction.

## E2E Testing Plan

Use controlled test repositories/fixtures for:

1. Native Android.
2. Native iOS.
3. Flutter.
4. React Native.
5. KMP.
6. Non-mobile repository.
7. Monorepo containing mobile + backend/web apps.

Verify:

- Correct platform/framework.
- Correct package/bundle ID where available.
- Missing metadata does not crash analysis.
- Invalid files are handled safely.
- Large files respect analyzer limits.
- Private repository analysis remains authorized.

## Acceptance Criteria

- Detection is evidence-based.
- User can override detection results.

---

# Phase 6 — Mobile App Overview

## Goal

Create the main detail page for a mobile application.

## Backend

Optional aggregated endpoint:

```text
GET /workspaces/:workspaceId/mobile-apps/:mobileAppId/overview
```

Return:

- App identity.
- Platform/framework.
- Package/bundle ID.
- Version/build.
- Repository.
- Default branch.
- SDK/OS metadata.
- Latest build summary.
- Latest release summary.
- Latest performance summary when available.

## Frontend

Route:

```text
/workspaces/:workspaceId/mobile-apps/:mobileAppId
```

Tabs:

```text
Overview | Code | Builds | Tests | Releases | Performance | Settings
```

Example:

```text
Karwa Passenger
Android • Production

Platform       Android
Framework      Kotlin / Compose
Package ID     com.karwa.app
Version        6.14.0
Build          815
Repository     karwa-android
Branch         development
Min SDK        26
Target SDK     36
```

## E2E Testing Plan

1. Open mobile app overview.
2. Verify DB metadata.
3. Verify linked repository data.
4. Missing optional metadata renders safely.
5. Another workspace cannot open the URL.
6. Archived app behavior is correct.
7. Deep-link refresh works.

## Acceptance Criteria

- One stable mobile app detail route exists.
- Future mobile features attach to this page.

---

# Phase 7 — Code Explorer Integration

## Goal

Reuse the current Code Explorer for mobile repositories.

## Backend

Reuse existing repository Code Explorer APIs.

Existing capabilities:

- Branches.
- Tree.
- File content.
- Search.
- Diff.

## Frontend

The `Code` tab/button should open the linked repository's existing Code Explorer.

If no repository is linked:

```text
Connect a repository to browse code.
```

## E2E Testing Plan

1. Linked mobile app → Code button available.
2. Clicking Code opens correct repository.
3. Branch list loads.
4. File tree loads.
5. Open Kotlin/Swift/Dart/TypeScript file.
6. Search repository.
7. Switch branch.
8. Cannot browse another workspace's repository.
9. No-repository app shows correct empty state.

## Acceptance Criteria

- Zero duplicate Code Explorer implementation.
- Existing Code Explorer tests remain green.

---

# Phase 8 — Mobile Build Tracking

## Goal

Track CI/CD builds associated with mobile applications.

## Backend

Model:

```text
MobileBuild
- id
- workspaceId
- mobileAppId
- repositoryId
- workflowRunId
- commitSha
- branch
- version
- buildNumber
- platform
- status
- startedAt
- completedAt
- durationMs
- createdAt
- updatedAt
```

Statuses:

```text
QUEUED
BUILDING
SUCCESS
FAILED
CANCELLED
```

Initial source:

```text
GitHub Actions
```

Ingestion options:

- GitHub workflow webhook events.
- Explicit GitHub synchronization.
- Background worker.

## Frontend

Builds tab:

```text
Build #815
Version 6.14.0
Branch development
Commit a93f142
Success
8m 32s
```

Filters:

- Status.
- Branch.
- Version.
- Platform.

## E2E Testing Plan

1. Create/update build from webhook fixture.
2. Duplicate delivery does not duplicate build.
3. Build transitions queued → building → success.
4. Failed build stored correctly.
5. Build associated with correct app/repository.
6. Build from unrelated repository ignored.
7. Build list is workspace-isolated.
8. Frontend renders status/duration.
9. Sync/retry does not duplicate records.

## Acceptance Criteria

- Build history is durable.
- Webhook processing is idempotent.
- Mobile app shows latest build.

---

# Phase 9 — Mobile Test Tracking

## Goal

Associate test results with mobile builds.

## Backend

Models:

```text
MobileTestRun
- id
- buildId
- type
- status
- passed
- failed
- skipped
- durationMs
```

Possible types:

```text
UNIT
UI
INTEGRATION
INSTRUMENTATION
SNAPSHOT
OTHER
```

Optional failure model:

```text
MobileTestFailure
- testRunId
- suite
- testName
- message
- file
```

## Frontend

```text
Build #815

Unit Tests
428 passed
0 failed

UI Tests
34 passed
2 failed

Instrumentation
18 passed
0 failed
```

Allow failed-test drill-down.

## E2E Testing Plan

1. Store test run for build.
2. Store pass/fail counts.
3. Store failure details.
4. Build detail aggregates test status.
5. Failed tests render correctly.
6. Tests cannot attach to another workspace/app build.
7. Duplicate CI ingestion remains idempotent.

## Acceptance Criteria

- Build → test relationship is stable.
- Test failures can later support AI analysis.

---

# Phase 10 — Mobile Release Management

## Goal

Track application versions and release lifecycle.

## Backend

Model:

```text
MobileRelease
- id
- workspaceId
- mobileAppId
- buildId
- version
- buildNumber
- environment
- status
- commitSha
- releaseNotes
- releasedAt
```

Environments:

```text
DEVELOPMENT
QA
INTERNAL
BETA
PRODUCTION
```

Statuses:

```text
DRAFT
READY
RELEASED
FAILED
ROLLED_BACK
```

## Frontend

```text
6.14.0
Build 815
Production
Released 21 Aug 2026

6.14.0-beta03
Build 811
Beta
Released 18 Aug 2026
```

## E2E Testing Plan

1. Create release from successful build.
2. Invalid/nonexistent build rejected.
3. Version/build number persists.
4. Release status transitions.
5. Production/beta history renders.
6. Cross-workspace build cannot be used.
7. Archived app cannot create release if policy forbids it.

## Acceptance Criteria

- Release connects source → build → version.

---

# Phase 11 — Mobile Telemetry Foundation

## Goal

Create a provider-neutral performance architecture.

## Critical Constraint

GitHub does **not** provide runtime mobile performance metrics. Runtime data requires a telemetry provider.

## Backend

Provider contract concept:

```ts
interface MobileTelemetryProvider {
  getCrashes(): Promise<unknown>;
  getPerformance(): Promise<unknown>;
  getVersions(): Promise<unknown>;
}
```

Provider examples:

```text
Firebase
Sentry
Datadog
New Relic
Custom provider
```

Model:

```text
MobileTelemetryIntegration
- id
- workspaceId
- mobileAppId
- provider
- status
- externalProjectId
- configuredAt
- lastSyncedAt
```

Requirements:

- Provider secrets remain backend-only.
- Normalize provider data into SaaS Command Center's schema.
- Support retries/background synchronization.

## Frontend

Settings → Performance Integration:

```text
Performance Provider
Not connected

[Connect Provider]
```

Show provider, status, and last sync only.

## E2E Testing Plan

Use a fake provider adapter:

1. Connect provider config.
2. Validate required configuration.
3. Secrets never appear in API responses.
4. Provider status persists.
5. Disconnect provider.
6. Workspace isolation enforced.
7. Provider API errors handled safely.
8. Background sync can retry.
9. Fake provider returns normalized metrics.

## Acceptance Criteria

- Core system is not coupled to one telemetry vendor.
- Provider secrets remain backend-only.

---

# Phase 12 — Android Performance Support

## Goal

Support normalized Android runtime health/performance data.

## Backend

Metrics:

```text
Crash-free users
Crash count
ANR count
Cold startup
Warm startup
Slow screens
Memory usage
Network latency
API failure rate
Version adoption
```

Store metrics with:

- Mobile app.
- Version.
- Build number where available.
- Time window.
- Metric name.
- Metric value.
- Provider.
- Collected time.

## Frontend

```text
Version 6.14.0

Crash-free users    99.92%
Crashes             17
ANRs                  3
Cold startup         1.4s
API latency         230ms
```

Issues list:

```text
BookingScreen slow
Checkout API latency
Login crash
```

## E2E Testing Plan

1. Ingest Android crash fixture.
2. Ingest ANR metric.
3. Ingest startup metric.
4. Associate metrics with correct version.
5. Aggregation returns correct values.
6. Missing metric does not break UI.
7. Old/new versions remain separate.
8. Cross-workspace metric access denied.
9. Frontend displays normalized metrics.

## Acceptance Criteria

- Android UI does not depend on provider-specific schemas.

---

# Phase 13 — iOS Performance Support

## Goal

Provide equivalent normalized runtime visibility for iOS.

## Backend

Metrics:

```text
Crash-free users
Crashes
Hangs
Cold startup
Warm startup
Memory
Network latency
Slow screens
Version adoption
```

Map provider-specific fields into the same internal model.

## Frontend

Reuse the Performance UI with platform-aware labels.

Example:

```text
Version 4.8.0

Crash-free users    99.95%
Crashes               8
Hangs                  2
Cold startup         1.2s
Memory              142MB
```

## E2E Testing Plan

1. Ingest iOS crash fixture.
2. Ingest hang fixture.
3. Ingest startup metric.
4. Verify correct iOS version association.
5. Android-only labels do not appear incorrectly.
6. Unified API schema remains consistent.
7. Workspace isolation verified.

## Acceptance Criteria

- Android and iOS share one normalized architecture.

---

# Phase 14 — Unified Performance Dashboard

## Goal

Build the main runtime performance experience.

## Backend

Potential endpoints:

```text
GET /workspaces/:workspaceId/mobile-apps/:mobileAppId/performance/summary
GET /workspaces/:workspaceId/mobile-apps/:mobileAppId/performance/versions
GET /workspaces/:workspaceId/mobile-apps/:mobileAppId/performance/issues
GET /workspaces/:workspaceId/mobile-apps/:mobileAppId/performance/compare
```

Support filters:

- Time range.
- Version.
- Build.
- Platform.

Comparison:

```text
6.13.1 → 6.14.0

Crash rate
0.05% → 0.14%

Startup
1.1s → 1.7s

Memory
161MB → 184MB
```

## Frontend

Performance sections:

```text
Overview
Versions
Problems
Comparison
```

Summary metrics:

- Crash-free.
- Crashes.
- ANR/Hangs.
- Startup.
- Memory.
- Network.

## E2E Testing Plan

1. Summary calculated from normalized metrics.
2. Version filter works.
3. Time filter works.
4. Version comparison returns correct delta.
5. No-data state works.
6. Provider-unavailable state works.
7. Metrics isolated by workspace/app.
8. Browser renders correct values after refresh.

## Acceptance Criteria

- User can evaluate whether a release improved or degraded performance.

---

# Phase 15 — Mobile Alerts

## Goal

Notify users about meaningful mobile development/runtime problems.

## Backend

Alert rules:

```text
Crash rate > threshold
ANR/hang rate > threshold
Startup > threshold
API failure rate > threshold
Build failed
Release regression
```

Models:

```text
MobileAlertRule
MobileAlertIncident
```

Reuse:

- Notifications.
- Background workers.
- Activity system where appropriate.

Support:

- Trigger.
- Deduplication.
- Resolve.
- Cooldown.
- Enabled/disabled.

## Frontend

```text
Crash rate > 2%
Startup > 3s
Build failed
```

Incident example:

```text
Performance Regression
Karwa Passenger
Version 6.14.0
Cold startup increased 47%
```

## E2E Testing Plan

1. Create alert rule.
2. Metric below threshold → no incident.
3. Metric exceeds threshold → incident created.
4. Notification created once.
5. Duplicate evaluation does not create duplicate active incident.
6. Metric recovery resolves incident.
7. Disabled rule does not trigger.
8. Cross-workspace rule access denied.
9. Build-failure rule triggers from failed build.

## Acceptance Criteria

- Alerts are idempotent and do not spam users.

---

# Phase 16 — AI Mobile Analysis

## Goal

Use project data to explain mobile development problems.

## Backend

Build authorized context from:

```text
Repository
Commits
Pull requests
Builds
Tests
Releases
Crashes
Performance metrics
Alerts
```

Example question:

```text
Why did Android build #818 fail?
```

Context can include:

- Build logs.
- Failed tests.
- Commit diff.
- Dependency changes.

Example performance question:

```text
Why did performance become worse after 6.14.0?
```

AI must distinguish correlation from proven causation.

## Frontend

Actions:

```text
Analyze build failure
Explain regression
Summarize release health
```

Display supporting evidence references.

## E2E Testing Plan

Use deterministic mocked AI provider:

1. Context contains only authorized workspace data.
2. Build analysis receives correct build/test context.
3. Release analysis receives correct version/performance context.
4. Another workspace's data never enters context.
5. Missing evidence produces limited/uncertain response.
6. AI provider failure returns safe error.
7. Sensitive secrets are excluded from prompts.

## Acceptance Criteria

- AI is grounded in SaaS Command Center records.
- No cross-workspace context leakage.

---

# Phase 17 — Security & Authorization Hardening

## Goal

Verify every mobile feature follows existing SaaS Command Center security rules.

## Backend

Apply existing patterns:

```text
JwtAuthGuard
WorkspaceAccessGuard
WorkspaceRolesGuard
```

Audit:

- Mobile apps.
- Repository linking.
- Builds.
- Tests.
- Releases.
- Telemetry.
- Performance.
- Alerts.
- AI context.

Ensure:

- IDs are scoped by workspace.
- No global lookup leaks another workspace's data.
- Provider secrets follow secure secret handling.
- Webhook signatures validated.
- External IDs validated.
- Input sizes limited where appropriate.

## Frontend

- Hide/disable write actions when role lacks permission.
- Read-only users see only allowed actions/data.
- Secrets are never rendered.

## E2E Testing Plan

Create at least two workspaces and multiple roles.

1. Workspace A owner cannot access Workspace B mobile app by ID.
2. Workspace A repository cannot link to Workspace B app.
3. Workspace A build cannot be used for Workspace B release.
4. Workspace A metrics cannot be queried from Workspace B.
5. Viewer cannot perform admin-only modifications.
6. Unauthenticated requests return `401`.
7. Invalid workspace membership rejected.
8. Telemetry secret never returned.
9. Forged webhook rejected.
10. Replayed/duplicate webhook handled idempotently.

## Acceptance Criteria

- All cross-workspace tests pass.
- No secret exposure.
- Existing security tests remain green.

---

# Phase 18 — Full E2E Verification & Regression

## Goal

Verify the full mobile lifecycle and ensure existing SaaS Command Center functionality remains stable.

## Backend Verification

- Prisma migration status.
- Lint.
- Typecheck.
- Build.
- Unit tests.
- API E2E.
- Worker tests.
- Webhook tests.
- Repository tests.
- Mobile feature tests.
- Security tests.

## Frontend Verification

- Typecheck.
- Build.
- Component tests.
- Page tests.
- Browser E2E.
- Responsive layout.
- Collapsed sidebar.
- Error/loading/empty states.

## Full E2E Scenario A — Android

```text
Register/Login
→ Create Workspace
→ Connect GitHub
→ Sync Repositories
→ Add Mobile App
→ Select Android
→ Link Android Repository
→ Analyze Repository
→ Detect Gradle/Android metadata
→ Save Mobile App
→ Open Overview
→ Browse Code
→ Receive Build Event
→ Store Test Results
→ Create Release
→ Ingest Performance Metrics
→ Show Performance Dashboard
→ Trigger Alert
→ Run AI Analysis
```

## Full E2E Scenario B — iOS

```text
Create Mobile App
→ Select iOS
→ Link Repository
→ Detect Xcode project
→ Browse Code
→ Track Build
→ Track Tests
→ Create Beta Release
→ Ingest iOS Performance
→ Compare Versions
```

## Full E2E Scenario C — Flutter

```text
Create Mobile App
→ Link Flutter Repository
→ Detect pubspec.yaml
→ Detect Android + iOS targets
→ Browse Code
→ Build
→ Tests
→ Release
→ Performance
```

## Full E2E Scenario D — React Native

```text
Create Mobile App
→ Link RN Repository
→ Detect package.json + metro config
→ Browse Code
→ Build
→ Tests
→ Release
```

## Full E2E Scenario E — Security

```text
Workspace A
├── Mobile App A
└── Repository A

Workspace B
├── Mobile App B
└── Repository B
```

Verify:

```text
A cannot read B
A cannot modify B
A cannot link B repository
A cannot read B builds
A cannot read B tests
A cannot read B releases
A cannot read B performance
A cannot read B alerts
AI for A receives no B context
```

## Full E2E Scenario F — Existing Product Regression

Verify mobile work did not break:

```text
Authentication
Workspaces
Applications
Websites
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

# 5. Recommended Route Structure

```text
/workspaces/:workspaceId/mobile-apps
/workspaces/:workspaceId/mobile-apps/:mobileAppId
/workspaces/:workspaceId/mobile-apps/:mobileAppId/code
/workspaces/:workspaceId/mobile-apps/:mobileAppId/builds
/workspaces/:workspaceId/mobile-apps/:mobileAppId/builds/:buildId
/workspaces/:workspaceId/mobile-apps/:mobileAppId/tests
/workspaces/:workspaceId/mobile-apps/:mobileAppId/releases
/workspaces/:workspaceId/mobile-apps/:mobileAppId/performance
/workspaces/:workspaceId/mobile-apps/:mobileAppId/alerts
/workspaces/:workspaceId/mobile-apps/:mobileAppId/settings
```

For code browsing, reuse the existing repository Code Explorer instead of introducing duplicate backend code APIs.

---

# 6. Recommended Backend Module Structure

```text
apps/api/src/modules/mobile-apps/
├── controllers/
│   ├── mobile-apps.controller.ts
│   ├── mobile-builds.controller.ts
│   ├── mobile-tests.controller.ts
│   ├── mobile-releases.controller.ts
│   ├── mobile-performance.controller.ts
│   └── mobile-alerts.controller.ts
│
├── dto/
│   ├── mobile-app.dto.ts
│   ├── mobile-build.dto.ts
│   ├── mobile-release.dto.ts
│   ├── mobile-performance.dto.ts
│   └── mobile-alert.dto.ts
│
├── services/
│   ├── mobile-apps.service.ts
│   ├── mobile-project-detector.service.ts
│   ├── mobile-builds.service.ts
│   ├── mobile-tests.service.ts
│   ├── mobile-releases.service.ts
│   ├── mobile-performance.service.ts
│   ├── mobile-alerts.service.ts
│   └── mobile-analysis-context.service.ts
│
├── telemetry/
│   ├── mobile-telemetry-provider.interface.ts
│   └── providers/
│
└── mobile-apps.module.ts
```

Exact placement should follow the repository's existing module conventions.

---

# 7. Recommended Frontend Structure

```text
apps/web/src/features/mobile-apps/
├── mobile-apps-api.ts
├── mobile-app.types.ts
├── mobile-apps-page.tsx
├── mobile-app-card.tsx
├── create-mobile-app.tsx
├── mobile-app-overview.tsx
├── mobile-builds.tsx
├── mobile-tests.tsx
├── mobile-releases.tsx
├── mobile-performance.tsx
├── mobile-alerts.tsx
└── mobile-app-settings.tsx
```

Routes should live under:

```text
apps/web/src/app/(dashboard)/workspaces/[workspaceId]/mobile-apps/
```

---

# 8. Recommended E2E Test Structure

```text
packages/test-code/api/e2e/
├── mobile-apps.e2e-spec.ts
├── mobile-repository-linking.e2e-spec.ts
├── mobile-project-detection.e2e-spec.ts
├── mobile-builds.e2e-spec.ts
├── mobile-tests.e2e-spec.ts
├── mobile-releases.e2e-spec.ts
├── mobile-telemetry.e2e-spec.ts
├── mobile-performance.e2e-spec.ts
├── mobile-alerts.e2e-spec.ts
├── mobile-security.e2e-spec.ts
└── mobile-full-flow.e2e-spec.ts
```

Frontend tests should follow the existing web test conventions.

---

# 9. Final Product Flow

```text
GitHub Repository
      ↓
Project Detection
      ↓
Mobile Application
      ↓
Code Explorer
      ↓
Commits / Pull Requests
      ↓
CI Build
      ↓
Tests
      ↓
Release
      ↓
Telemetry
      ↓
Performance
      ↓
Alerts
      ↓
AI Analysis
```

---

# 10. Definition of Done for Every Phase

A phase is not complete until all applicable checks pass:

- Backend implementation complete.
- Frontend implementation complete.
- DTO/shared contracts updated.
- Workspace authorization verified.
- Error states handled.
- Loading/empty states handled.
- Unit tests pass.
- API E2E tests pass.
- Frontend tests pass.
- Existing regression tests pass.
- Typecheck passes.
- Build passes.
- Lint/format checks pass.
- No secrets logged or exposed.
- Project summary/documentation updated.

---

# 11. Recommended Implementation Order

```text
Phase 1  → Foundation
Phase 2  → CRUD Backend
Phase 3  → Mobile Apps Frontend
Phase 4  → Repository Linking
Phase 5  → Mobile Project Detection
Phase 6  → Mobile Overview
Phase 7  → Code Explorer Reuse
Phase 8  → Build Tracking
Phase 9  → Test Tracking
Phase 10 → Release Management
Phase 11 → Telemetry Architecture
Phase 12 → Android Performance
Phase 13 → iOS Performance
Phase 14 → Unified Performance Dashboard
Phase 15 → Alerts
Phase 16 → AI Analysis
Phase 17 → Security Hardening
Phase 18 → Full E2E Verification
```

This order keeps each phase independently testable while building on the existing SaaS Command Center repository, application, monitoring, GitHub, and Code Explorer architecture.
