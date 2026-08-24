import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const repoRoot = resolve(packageRoot, '../../..');
const appRoot = resolve(repoRoot, 'apps/api');
const configPath = resolve(packageRoot, 'jest-e2e.config.cjs');
const e2eDirectory = resolve(packageRoot, 'e2e');
const files = readdirSync(e2eDirectory)
  .filter((name) => name.endsWith('.e2e-spec.ts'))
  .sort()
  .map((name) => ({
    name,
    path: resolve(e2eDirectory, name),
  }));

if (files.length === 0) {
  console.error('No API E2E test files found.');
  process.exit(2);
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

console.log();
line();
console.log('API E2E - ISOLATED SUITE RUNNER');
line();
console.log(`Suites: ${files.length}`);
console.log('Mode: sequential / fresh Jest process per suite');
line();

const results = [];
const totalStartedAt = performance.now();

for (let index = 0; index < files.length; index += 1) {
  const file = files[index];

  console.log();
  line();
  console.log(`[${index + 1}/${files.length}] ${file.name}`);
  line();

  const startedAt = performance.now();
  const result = spawnSync('pnpm', ['exec', 'jest', '--config', configPath, '--runInBand', '--runTestsByPath', file.path], {
    cwd: appRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  const elapsed = performance.now() - startedAt;
  const passed = result.status === 0 && !result.error && !result.signal;

  results.push({
    name: file.name,
    passed,
    elapsed,
    exitCode: result.status,
  });

  console.log();
  console.log(`${passed ? 'PASS' : 'FAIL'} ${file.name} (${formatDuration(elapsed)})`);

  if (result.error) {
    console.error(result.error.message);
  }

  if (result.signal) {
    console.error(`Interrupted by ${result.signal}`);
    process.exit(130);
  }
}

const totalElapsed = performance.now() - totalStartedAt;
const passed = results.filter((result) => result.passed);
const failed = results.filter((result) => !result.passed);

console.log();
line();
console.log('API E2E SUMMARY');
line();

for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'}  ${formatDuration(result.elapsed).padStart(8)}  ${result.name}`);
}

line();
console.log(`Suites : ${results.length}`);
console.log(`Passed : ${passed.length}`);
console.log(`Failed : ${failed.length}`);
console.log(`Time   : ${formatDuration(totalElapsed)}`);
line();

if (failed.length > 0) {
  console.log('\nFailed suites:');

  for (const result of failed) {
    console.log(` - ${result.name}`);
  }
}

console.log(`\nOverall: ${failed.length === 0 ? 'PASS' : 'FAIL'}\n`);

process.exit(failed.length === 0 ? 0 : 1);
