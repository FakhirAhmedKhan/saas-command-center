import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const testDirectory = resolve(packageRoot, 'test');

const withCoverage = process.argv.includes('--coverage');

const files = (await readdir(testDirectory))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => resolve(testDirectory, name));

if (files.length === 0) {
  throw new Error('No tracker test files were found.');
}

const nodeArguments = ['--test'];

if (withCoverage) {
  nodeArguments.push(
    '--experimental-test-coverage',
    // Only the tracker bundle itself is interesting; the harness and tests
    // would otherwise dominate the report.
    '--test-coverage-include=dist-coverage/**',
    '--test-coverage-exclude=test/**',
    '--test-coverage-exclude=test-support/**',
    '--test-coverage-exclude=scripts/**',
  );
}

const result = spawnSync(process.execPath, [...nodeArguments, ...files], {
  cwd: packageRoot,
  stdio: 'inherit',
  env: withCoverage ? { ...process.env, TRACKER_BUNDLE: '../dist-coverage/tracker.js' } : process.env,
});

process.exit(result.status ?? 1);
