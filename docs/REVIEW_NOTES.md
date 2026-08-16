# Review notes

The split package intentionally preserves the original schema instead of
silently changing database behavior.

Items worth reviewing separately:

1. `AnalyticsProcessingRun.initiatedByUserId` is currently a UUID scalar only.
   It has no Prisma relation to `User`, no foreign key relation field, and no
   index.

2. The source comment says `countryCode` should be added to
   `RawAnalyticsEvent`, but that field is not currently present.
   `analyticsEvent` is already present.

3. `ApplicationBlocker` can reference an application, milestone, and task, but
   the schema itself does not guarantee that all three belong to the same
   application. Enforce that invariant in the service layer or with a database
   constraint/trigger.

4. `Workspace.ownerId` and `WorkspaceMember` are separate concepts. The schema
   does not guarantee that the workspace owner also has an OWNER membership row.

5. Do not create a migration merely because files were reorganized. A clean
   split should result in no SQL schema changes.
