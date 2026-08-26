import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const repoRoot = resolve(packageRoot, '../../..');
const appRoot = resolve(repoRoot, 'apps/api');
const jestRunnerPath = resolve(scriptsDirectory, 'run-jest.mjs');
const configPath = resolve(packageRoot, 'jest-e2e.config.cjs');
const e2eDirectory = resolve(packageRoot, 'e2e');
const envPath = resolve(appRoot, '.env.test');
const appRequire = createRequire(resolve(appRoot, 'package.json'));
const { config: loadEnv } = appRequire('dotenv');
const { Client } = appRequire('pg');
const redisModule = appRequire('ioredis');
const Redis = redisModule.default ?? redisModule;

loadEnv({
  path: envPath,
  override: false,
  quiet: true,
});

const packageManagerPath = process.env.npm_execpath;

if (!packageManagerPath) {
  console.error('npm_execpath is unavailable. Run this launcher through pnpm.');
  process.exit(2);
}

const requestedPatterns = process.argv.slice(2);
const allFiles = readdirSync(e2eDirectory)
  .filter((name) => name.endsWith('.e2e-spec.ts'))
  .sort();
const selectedFiles = requestedPatterns.length === 0 ? allFiles : allFiles.filter((name) => requestedPatterns.some((pattern) => name.includes(pattern)));
const files = selectedFiles.map((name) => ({
  name,
  path: resolve(e2eDirectory, name),
}));

if (files.length === 0) {
  console.error('No API E2E test files matched.');
  process.exit(2);
}

function readWorkerCount() {
  const raw = process.env.E2E_WORKERS ?? '3';
  const value = Number(raw);

  if (!Number.isInteger(value) || value < 1 || value > 4) {
    throw new Error('E2E_WORKERS must be an integer from 1 to 4.');
  }

  return Math.min(value, files.length);
}

function parseTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;

  if (!value) {
    throw new Error('TEST_DATABASE_URL is required.');
  }

  const url = new URL(value);
  const databaseName = url.pathname.replace(/^\//, '').toLowerCase();

  if (!databaseName.includes('test')) {
    throw new Error(`Refusing to use non-test database "${databaseName}".`);
  }

  return url;
}

function parseTestRedisUrl() {
  const value = process.env.TEST_REDIS_URL;

  if (!value) {
    throw new Error('TEST_REDIS_URL is required.');
  }

  const url = new URL(value);
  const rawDatabase = url.pathname.replace(/^\//, '');
  const database = rawDatabase ? Number(rawDatabase) : 0;

  if (!Number.isInteger(database) || database <= 0) {
    throw new Error('TEST_REDIS_URL must use a dedicated non-zero Redis database.');
  }

  return {
    url,
    database,
  };
}

function createDatabaseUrl(baseUrl, schema) {
  const url = new URL(baseUrl);

  // Prisma CLI reads `schema`, while PrismaPg/pg requires a real
  // PostgreSQL search_path for runtime query isolation.
  url.searchParams.set('schema', schema);
  url.searchParams.set('options', `-c search_path=${schema},public`);

  return url.toString();
}

function createRedisUrl(baseUrl, database) {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

function createBasePgUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  url.searchParams.delete('schema');
  return url.toString();
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function formatDuration(milliseconds) {
  const seconds = Math.round(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function line() {
  console.log('='.repeat(72));
}

const activeChildren = new Set();
let interrupted = false;

function runProcess(command, args, options) {
  return new Promise((completion) => {
    let settled = false;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: 'inherit',
      shell: false,
    });

    activeChildren.add(child);

    child.once('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      activeChildren.delete(child);
      completion({
        status: null,
        signal: null,
        error,
      });
    });

    child.once('close', (status, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      activeChildren.delete(child);
      completion({
        status,
        signal,
        error: null,
      });
    });
  });
}

process.once('SIGINT', () => {
  interrupted = true;

  for (const child of activeChildren) {
    child.kill('SIGTERM');
  }
});

process.once('SIGTERM', () => {
  interrupted = true;

  for (const child of activeChildren) {
    child.kill('SIGTERM');
  }
});

const workerCount = readWorkerCount();
const databaseUrl = parseTestDatabaseUrl();
const redisTarget = parseTestRedisUrl();
const runId = process.pid.toString();
const basePgUrl = createBasePgUrl(databaseUrl);
const shards = Array.from(
  {
    length: workerCount,
  },
  (_, index) => {
    const workerNumber = index + 1;
    const schema = `e2e_${runId}_${workerNumber}`;
    const redisDatabase = redisTarget.database + index;

    return {
      workerNumber,
      schema,
      databaseUrl: createDatabaseUrl(databaseUrl, schema),
      redisDatabase,
      redisUrl: createRedisUrl(redisTarget.url, redisDatabase),
    };
  },
);

async function createSchemas() {
  const client = new Client({
    connectionString: basePgUrl,
  });

  await client.connect();

  try {
    for (const shard of shards) {
      const schema = quoteIdentifier(shard.schema);

      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await client.query(`CREATE SCHEMA ${schema}`);
    }
  } finally {
    await client.end();
  }
}

async function migrateShards() {
  for (const shard of shards) {
    console.log(`Preparing worker ${shard.workerNumber}: PostgreSQL schema ${shard.schema}`);

    const result = await runProcess(process.execPath, [packageManagerPath, 'exec', 'prisma', 'migrate', 'deploy'], {
      cwd: appRoot,
      env: {
        ...process.env,
        TEST_DATABASE_URL: shard.databaseUrl,
        DATABASE_URL: shard.databaseUrl,
        DIRECT_URL: shard.databaseUrl,
      },
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0 || result.signal) {
      throw new Error(`Migration failed for worker ${shard.workerNumber}.`);
    }
  }
}

async function resetWorkerRedis() {
  for (const shard of shards) {
    const redis = new Redis(shard.redisUrl, {
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    try {
      await redis.connect();
      await redis.flushdb();
    } finally {
      redis.disconnect();
    }

    console.log(`Prepared worker ${shard.workerNumber}: Redis DB ${shard.redisDatabase}`);
  }
}

async function dropSchemas() {
  const client = new Client({
    connectionString: basePgUrl,
  });

  await client.connect();

  try {
    for (const shard of shards) {
      const schema = quoteIdentifier(shard.schema);
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    }
  } finally {
    await client.end();
  }
}

function createWorkerEnvironment(shard) {
  return {
    ...process.env,
    TEST_DATABASE_URL: shard.databaseUrl,
    DATABASE_URL: shard.databaseUrl,
    DIRECT_URL: shard.databaseUrl,
    TEST_REDIS_URL: shard.redisUrl,
    REDIS_URL: shard.redisUrl,
    E2E_WORKER_NUMBER: String(shard.workerNumber),
  };
}

const results = new Array(files.length);
let nextFileIndex = 0;

async function runWorker(shard) {
  while (!interrupted) {
    const index = nextFileIndex;
    nextFileIndex += 1;

    if (index >= files.length) {
      return;
    }

    const file = files[index];

    console.log();
    line();
    console.log(`[${index + 1}/${files.length}] [worker ${shard.workerNumber}] ${file.name}`);
    line();

    const startedAt = performance.now();
    const result = await runProcess(process.execPath, [jestRunnerPath, '--config', configPath, '--runInBand', '--runTestsByPath', file.path], {
      cwd: appRoot,
      env: createWorkerEnvironment(shard),
    });
    const elapsed = performance.now() - startedAt;
    const passed = result.status === 0 && !result.error && !result.signal;

    results[index] = {
      name: file.name,
      workerNumber: shard.workerNumber,
      passed,
      elapsed,
      exitCode: result.status,
      signal: result.signal,
    };

    console.log();
    console.log(`${passed ? 'PASS' : 'FAIL'} ${file.name} ` + `(worker ${shard.workerNumber}, ${formatDuration(elapsed)})`);

    if (result.error) {
      console.error(result.error.message);
    }
  }
}

const totalStartedAt = performance.now();
let setupFailed = false;
let cleanupFailed = false;

console.log();
line();
console.log('API E2E - PARALLEL ISOLATED SUITE RUNNER');
line();
console.log(`Suites : ${files.length}`);
console.log(`Workers: ${workerCount}`);
console.log('Isolation: fresh Jest process, PostgreSQL schema and Redis DB');
line();

try {
  await createSchemas();
  await migrateShards();
  await resetWorkerRedis();

  await Promise.all(shards.map((shard) => runWorker(shard)));
} catch (error) {
  setupFailed = true;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  try {
    await resetWorkerRedis();
    await dropSchemas();
  } catch (error) {
    cleanupFailed = true;
    console.error(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const completedResults = results.filter(Boolean);
const passedResults = completedResults.filter((result) => result.passed);
const failedResults = completedResults.filter((result) => !result.passed);
const totalElapsed = performance.now() - totalStartedAt;

console.log();
line();
console.log('API E2E SUMMARY');
line();

for (const result of completedResults) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'}  ` + `${formatDuration(result.elapsed).padStart(8)}  ` + `W${result.workerNumber}  ${result.name}`);
}

line();
console.log(`Selected : ${files.length}`);
console.log(`Completed: ${completedResults.length}`);
console.log(`Passed   : ${passedResults.length}`);
console.log(`Failed   : ${failedResults.length}`);
console.log(`Workers  : ${workerCount}`);
console.log(`Time     : ${formatDuration(totalElapsed)}`);
line();

if (failedResults.length > 0) {
  console.log('\nFailed suites:');

  for (const result of failedResults) {
    console.log(` - ${result.name}`);
  }
}

const incomplete = completedResults.length !== files.length;
const failed = setupFailed || cleanupFailed || interrupted || incomplete || failedResults.length > 0;

console.log(`\nOverall: ${failed ? 'FAIL' : 'PASS'}\n`);

process.exit(interrupted ? 130 : failed ? 1 : 0);
