import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const allSteps = [
  ['api-unit', 'API Unit', 'test:api:unit'],
  ['api-e2e', 'API E2E', 'test:api:e2e'],
  ['tracker', 'Tracker', 'test:tracker'],
  ['web-unit', 'Web Unit', 'test:web:unit'],
  ['web-e2e', 'Web E2E', 'test:web:e2e'],
  ['web-fullstack', 'Web Fullstack', 'test:web:fullstack'],
];

const args = process.argv.slice(2);
const failFast = args.includes('--fail-fast');

const only = args
  .find((arg) => arg.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',')
  .map((value) => value.trim());

const steps = only ? allSteps.filter(([key]) => only.includes(key)) : allSteps;

function duration(ms) {
  const seconds = Math.round(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function line() {
  console.log('='.repeat(64));
}

const rootPackage = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));

const scripts = rootPackage.scripts ?? {};

if (steps.length === 0) {
  console.error('No test stages selected.');
  console.error(`Available: ${allSteps.map(([key]) => key).join(', ')}`);
  process.exit(2);
}

const missing = steps.filter(([, , script]) => !scripts[script]);

if (missing.length > 0) {
  console.error('\nTEST RUNNER CONFIG ERROR');

  for (const [, label, script] of missing) {
    console.error(`${label}: missing root script "${script}"`);
  }

  process.exit(2);
}

console.log();
line();
console.log('SAAS COMMAND CENTER - TEST RUN');
line();
console.log(`Stages: ${steps.length}`);
console.log(`Mode: ${failFast ? 'FAIL FAST' : 'RUN ALL'}`);
line();

const results = [];
const totalStart = performance.now();

for (let index = 0; index < steps.length; index += 1) {
  const [key, label, script] = steps[index];

  console.log();
  line();
  console.log(`[${index + 1}/${steps.length}] ${label.toUpperCase()}`);
  line();
  console.log(`pnpm run ${script}`);
  console.log();

  const start = performance.now();

  const result = spawnSync('pnpm', ['run', script], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  const elapsed = performance.now() - start;
  const passed = result.status === 0 && !result.error && !result.signal;

  results.push({
    key,
    label,
    passed,
    elapsed,
    exitCode: result.status,
  });

  console.log();
  console.log(`${label}: ${passed ? 'PASS' : 'FAIL'} (${duration(elapsed)})`);

  if (result.error) {
    console.error(result.error.message);
  }

  if (result.signal) {
    console.error(`Interrupted by ${result.signal}`);
    process.exit(130);
  }

  if (!passed && failFast) {
    console.log('\nFail-fast enabled. Stopping.');
    break;
  }
}

const totalElapsed = performance.now() - totalStart;

console.log();
line();
console.log('FULL TEST SUMMARY');
line();

for (const result of results) {
  console.log(`${result.label.padEnd(20)} ${result.passed ? 'PASS' : 'FAIL'}  ${duration(result.elapsed)}`);
}

const skipped = steps.length - results.length;

if (skipped > 0) {
  for (const [, label] of steps.slice(results.length)) {
    console.log(`${label.padEnd(20)} SKIP`);
  }
}

line();

const passedCount = results.filter((result) => result.passed).length;
const failedCount = results.filter((result) => !result.passed).length;

console.log(`Passed:   ${passedCount}`);
console.log(`Failed:   ${failedCount}`);
console.log(`Skipped:  ${skipped}`);
console.log(`Duration: ${duration(totalElapsed)}`);
line();

const success = failedCount === 0 && skipped === 0 && results.length === steps.length;

console.log(`\nOverall: ${success ? 'PASS' : 'FAIL'}\n`);

process.exit(success ? 0 : 1);
