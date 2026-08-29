import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

const color = (value, code) => `${code}${value}${colors.reset}`;

const allSteps = [
  {
    key: 'api-unit',
    label: 'API Unit',
    script: 'test:api:unit',
    runner: 'jest',
  },
  {
    key: 'api-e2e',
    label: 'API E2E',
    script: 'test:api:e2e',
    runner: 'jest',
  },
  {
    key: 'tracker',
    label: 'Tracker',
    script: 'test:tracker',
    runner: 'jest',
  },
  {
    key: 'web-unit',
    label: 'Web Unit',
    script: 'test:web:unit',
    runner: 'jest',
  },
  {
    key: 'web-e2e',
    label: 'Web E2E',
    script: 'test:web:e2e',
    runner: 'playwright',
  },
  {
    key: 'web-fullstack',
    label: 'Web Fullstack',
    script: 'test:web:fullstack',
    runner: 'playwright',
  },
];

const args = process.argv.slice(2);

const failFast = args.includes('--fail-fast');
const clearTerminal = !args.includes('--no-clear');

const workersArgument = args.find((arg) => arg.startsWith('--workers='));

const workers = Number(workersArgument?.slice('--workers='.length) ?? 5);

if (!Number.isInteger(workers) || workers < 1) {
  console.error(color('Invalid workers value. Use --workers=1 or higher.', colors.red));
  process.exit(2);
}

const onlyArgument = args.find((arg) => arg.startsWith('--only='));

const only = onlyArgument
  ?.slice('--only='.length)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const steps = only ? allSteps.filter(({ key }) => only.includes(key)) : allSteps;

function duration(milliseconds) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function line(character = '═') {
  console.log(color(character.repeat(68), colors.dim));
}

function clearScreen() {
  if (clearTerminal && process.stdout.isTTY) {
    process.stdout.write('\x1b[2J\x1b[0f');
  }
}

function printHeader(title) {
  console.log();
  line();
  console.log(color(`  ${title}`, colors.bold + colors.cyan));
  line();
}

function getRunnerArguments(runner) {
  if (runner === 'jest') {
    return [];
  }

  if (runner === 'playwright') {
    return [`--workers=${workers}`];
  }

  return [];
}

const rootPackage = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));

const scripts = rootPackage.scripts ?? {};

if (steps.length === 0) {
  console.error(color('\nNo test stages selected.', colors.red));
  console.error(color(`Available: ${allSteps.map(({ key }) => key).join(', ')}`, colors.yellow));
  process.exit(2);
}

const missing = steps.filter(({ script }) => !scripts[script]);

if (missing.length > 0) {
  console.error();
  console.error(color('TEST RUNNER CONFIGURATION ERROR', colors.red));
  console.error();

  for (const step of missing) {
    console.error(`${color('✖', colors.red)} ${step.label}: missing root script "${step.script}"`);
  }

  process.exit(2);
}

clearScreen();

printHeader('SAAS COMMAND CENTER — TEST RUN');

console.log(`${color('Stages:', colors.bold)} ${color(String(steps.length), colors.cyan)}`);

console.log(`${color('Workers:', colors.bold)} ${color(String(workers), colors.magenta)}`);

console.log(`${color('Mode:', colors.bold)} ${failFast ? color('FAIL FAST', colors.yellow) : color('RUN ALL', colors.green)}`);

console.log(`${color('Started:', colors.bold)} ${new Date().toLocaleString()}`);

const results = [];
const totalStart = performance.now();

for (let index = 0; index < steps.length; index += 1) {
  const step = steps[index];
  const stepNumber = `${index + 1}/${steps.length}`;
  const runnerArguments = getRunnerArguments(step.runner);

  console.log();
  printHeader(`[${stepNumber}] ${step.label.toUpperCase()}`);

  console.log(`${color('Runner:', colors.bold)} ${color(step.runner, colors.blue)}`);

  console.log(`${color('Command:', colors.bold)} pnpm run ${step.script} ${runnerArguments.length > 0 ? runnerArguments.join(' ') : ''}`);

  console.log();

  const start = performance.now();

  const result = spawnSync('pnpm', ['run', step.script, ...runnerArguments], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      TEST_WORKERS: String(workers),
      JEST_WORKERS: String(workers),
      PLAYWRIGHT_WORKERS: String(workers),
    },
  });

  const elapsed = performance.now() - start;
  const passed = result.status === 0 && !result.error && !result.signal;

  results.push({
    ...step,
    passed,
    elapsed,
    exitCode: result.status,
  });

  console.log();

  if (passed) {
    console.log(`${color('✔', colors.green)} ${color(step.label, colors.green)} ${color('PASSED', colors.bold + colors.green)} ${color(`(${duration(elapsed)})`, colors.dim)}`);
  } else {
    console.log(`${color('✖', colors.red)} ${color(step.label, colors.red)} ${color('FAILED', colors.bold + colors.red)} ${color(`(${duration(elapsed)})`, colors.dim)}`);
  }

  if (result.error) {
    console.error(color(result.error.message, colors.red));
  }

  if (result.signal) {
    console.error(color(`Interrupted by ${result.signal}`, colors.red));
    process.exit(130);
  }

  if (!passed && failFast) {
    console.log();
    console.log(color('Fail-fast enabled. Remaining stages skipped.', colors.yellow));
    break;
  }
}

const totalElapsed = performance.now() - totalStart;
const skipped = steps.length - results.length;

console.log();
printHeader('FULL TEST SUMMARY');

for (const result of results) {
  const status = result.passed ? color('PASS', colors.green) : color('FAIL', colors.red);

  const icon = result.passed ? color('✔', colors.green) : color('✖', colors.red);

  console.log(`${icon} ${result.label.padEnd(20)} ${status}  ${color(duration(result.elapsed), colors.dim)}`);
}

if (skipped > 0) {
  for (const step of steps.slice(results.length)) {
    console.log(`${color('○', colors.yellow)} ${step.label.padEnd(20)} ${color('SKIP', colors.yellow)}`);
  }
}

line();

const passedCount = results.filter((result) => result.passed).length;
const failedCount = results.filter((result) => !result.passed).length;

console.log(`${color('Passed:', colors.bold)}  ${passedCount}`);
console.log(`${color('Failed:', colors.bold)}  ${failedCount}`);
console.log(`${color('Skipped:', colors.bold)} ${skipped}`);
console.log(`${color('Workers:', colors.bold)} ${workers}`);
console.log(`${color('Duration:', colors.bold)} ${duration(totalElapsed)}`);

const success = failedCount === 0 && skipped === 0 && results.length === steps.length;

console.log();

if (success) {
  console.log(color('Overall: PASS ✔', colors.bold + colors.green));
} else {
  console.log(color('Overall: FAIL ✖', colors.bold + colors.red));
}

console.log();

process.exit(success ? 0 : 1);
