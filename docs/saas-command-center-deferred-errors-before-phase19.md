# SaaS Command Center — Deferred Errors Before Phase 19

## Decision

We are temporarily deferring the remaining Phase 1–18 regression failures so development can continue with Phase 19–23.

These issues are **not closed**. They must be fixed during the final Phase 1–23 verification cycle.

## Current E2E Summary

- API suites: 31 passed / 40 total
- API tests: 288 passed / 474 total
- Tracker tests: 56 / 56 passed
- Web typecheck: passed
- Web lint: passed
- Web production build: passed
- Playwright: did not run correctly because the combined runner reported `No tests found`

## Deferred Issues

### Phase 1 — Runner Verification

- Shared Types Build reported failed in the fast runner.
- Validation Build reported failed in the fast runner.
- Tracker Build reported failed even though the tracker later built successfully and all 56 tracker tests passed.
- Re-run Phase 1 commands independently during final verification.

### Phase 6 — Activity / Audit

- Filters/pagination test returns `400` instead of expected `200`.
- Cross-workspace activity isolation returns `200` instead of expected `404`.
- The cross-workspace result may be a real security issue and must not be weakened just to make the test pass.

### Phase 13 — Analytics Reports

- API E2E suite currently fails.
- Review route/query DTO contract.
- Verify report filters, pagination, dimensions, exports, website isolation, and workspace isolation.

### Phase 14 — Analytics Processing

- API E2E suite currently fails.
- Some fixtures use stale Prisma JSON behavior such as `properties: null`.
- Processing status/reprocessing behavior must be reverified.

### Phase 15 — Monitoring

- `phase15-monitoring.e2e-spec.ts` contains stale fixtures.
- Legacy `monitoring.e2e-spec.ts` has missing setup variables such as:
  - `workspaceId`
  - `adminAccessToken`
  - `viewerAccessToken`
  - `anotherWorkspaceId`
- Monitoring security and SSRF protections must be reverified.

### Phase 16 — Releases & Deployments

- Fixture still sends `createdById` while the current `SaasApplication` Prisma model does not contain this field.
- This setup failure causes many Phase 16 tests to fail before they reach actual release/deployment logic.

### Phase 17 — Team Operations

- API E2E suite currently fails.
- Known stale user lookup uses `name` while the current user field is `displayName`.
- Notification filtering/contract should be reverified.

### Phase 18 — Webhook Integrations

- Primary Phase 18 API E2E suite currently fails and needs later review.
- Legacy `webhooks.e2e-spec.ts` is incomplete and references missing setup variables such as:
  - `workspaceId`
  - `ownerToken`
  - `viewerToken`
  - `otherWorkspaceId`
- Webhook cross-workspace security, destination validation, and secret handling must be reverified.

### Frontend Playwright Runner

- Web typecheck, lint, and production build pass.
- Combined Playwright command returned `No tests found`.
- This is a runner/configuration issue, so frontend E2E was not actually verified by that run.

## Critical Audit Backlog

These should also remain visible during Phase 19–23 development:

- Background scheduler registration needs verification before production.
- Analytics processing contains unresolved/stubbed processing behavior.
- Frontend auth/HTTP client duplication should be consolidated.
- Analytics processing dead-letter workspace isolation must be fixed/verified.
- CI should eventually run backend E2E and Playwright suites.

## Development Gate

We will continue with:

1. Phase 19 — Repository Integration Foundation
2. Phase 20 — Code Explorer
3. Phase 21 — GitHub Intelligence
4. Phase 22 — Repository Write Operations
5. Phase 23 — AI Developer Intelligence

Before production:

- Fix all deferred Phase 1–18 issues.
- Run complete Phase 1–23 backend E2E.
- Run complete frontend Playwright.
- Run security verification.
- Run production build/typecheck/lint.
