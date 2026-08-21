import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const trackerRoot = resolve(packageRoot, '../../../apps/tracker');

const testDirectory = resolve(packageRoot, 'unit');
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
    '--test-coverage-include=dist-coverage/**',
    '--test-coverage-exclude=unit/**',
    '--test-coverage-exclude=test-support/**',
    '--test-coverage-exclude=scripts/**',
  );
}

const trackerBundle = withCoverage ? resolve(packageRoot, 'dist-coverage/tracker.js') : resolve(trackerRoot, 'dist/tracker.js');

const result = spawnSync(process.execPath, [...nodeArguments, ...files], {
  cwd: packageRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    TRACKER_BUNDLE: pathToFileURL(trackerBundle).href,
  },
});

process.exit(result.status ?? 1);
