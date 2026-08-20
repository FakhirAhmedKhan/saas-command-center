# Review notes

The split package intentionally preserves the original schema instead of
silently changing database behavior.

Items worth reviewing separately:

1. `ApplicationBlocker` can reference an application, milestone, and task, but
   the schema itself does not guarantee that all three belong to the same
   application. Enforce that invariant in the service layer or with a database
   constraint/trigger.

2. `Workspace.ownerId` and `WorkspaceMember` are separate concepts. The schema
   does not guarantee that the workspace owner also has an OWNER membership row.

3. Do not create a migration merely because files were reorganized. A clean
   split should result in no SQL schema changes.

Resolved since this note was written:

- `AnalyticsProcessingRun.initiatedByUserId` now has a proper `initiatedBy`
  relation to `User` (`onDelete: SetNull`).
- `RawAnalyticsEvent.countryCode` is now present
  (`apps/api/prisma/models/analytics-ingestion.prisma`).
