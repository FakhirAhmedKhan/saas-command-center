import { PrismaService } from 'src/database/prisma.service';

interface PostgreSqlTable {
  tablename: string;
}

function assertTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  const parsed = new URL(databaseUrl);

  const databaseName = parsed.pathname.replace(/^\//, '').toLowerCase();

  const safe = databaseName.includes('test');

  if (!safe) {
    throw new Error(`Refusing to reset non-test database "${databaseName}"`);
  }
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  assertTestDatabase();

  const tables = await prisma.$queryRaw<PostgreSqlTable[]>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
      `;

  if (tables.length === 0) {
    return;
  }

  const tableNames = tables.map(({ tablename }) => `public.${quoteIdentifier(tablename)}`).join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
}
