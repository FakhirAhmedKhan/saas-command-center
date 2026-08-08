# SaaS Command Center — Split Prisma Schema

This package preserves the original models, enums, field mappings, indexes,
constraints, and relations while organizing the schema by domain.

## Directory structure

```text
prisma/
├── schema.prisma
├── enums/
│   ├── analytics.prisma
│   ├── application-activity.prisma
│   ├── application-delivery.prisma
│   ├── application.prisma
│   └── workspace.prisma
└── models/
    ├── analytics-aggregates.prisma
    ├── analytics-core.prisma
    ├── analytics-ingestion.prisma
    ├── analytics-processing.prisma
    ├── application-activity.prisma
    ├── application-delivery.prisma
    ├── application.prisma
    ├── identity.prisma
    ├── website.prisma
    └── workspace.prisma
```

## Prisma 7 configuration

Merge the relevant values from `prisma.config.example.ts` into your existing
`prisma.config.ts`.

The important setting is:

```ts
schema: 'prisma';
```

Do not use `schema: "prisma/schema.prisma"` because Prisma would ignore the
other `.prisma` files.

## Validation commands

Run these from the API package directory:

```bash
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate dev --name split_prisma_schema
```

Splitting files without changing the schema should not produce a database
migration. Review the generated migration before applying it. If Prisma detects
database changes, stop and compare the split files with the current schema.
