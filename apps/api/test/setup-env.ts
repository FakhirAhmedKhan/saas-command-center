import {
    config,
} from 'dotenv';

config({
    path: '.env.test',
    override: true,
  quiet: true,
});

process.env.NODE_ENV = 'test';

const testDatabaseUrl =
    process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
    throw new Error(
        'TEST_DATABASE_URL is required for E2E tests',
    );
}

let parsedDatabaseUrl: URL;

try {
    parsedDatabaseUrl =
        new URL(testDatabaseUrl);
} catch {
    throw new Error(
        'TEST_DATABASE_URL must be a valid PostgreSQL URL',
    );
}

const databaseName =
    parsedDatabaseUrl.pathname
        .replace(/^\//, '')
        .toLowerCase();

const safeTestDatabase =
    databaseName.includes('test') ||
    parsedDatabaseUrl.port === '5434';

if (!safeTestDatabase) {
    throw new Error(
        [
            'E2E tests refused to start.',
            'TEST_DATABASE_URL does not look like a test database.',
            `Database: ${databaseName}`,
            `Port: ${parsedDatabaseUrl.port}`,
        ].join(' '),
    );
}

/*
 * Ensure every imported Prisma service uses
 * the isolated test database.
 */
process.env.DATABASE_URL =
    testDatabaseUrl;

/*
 * Disable background processing during
 * deterministic E2E tests.
 */
process.env.ANALYTICS_PROCESSOR_ENABLED =
    'false';
