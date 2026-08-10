import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const testDirectory = resolve(packageRoot, 'test');

const files = (await readdir(testDirectory))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => resolve(testDirectory, name));

if (files.length === 0) {
  throw new Error('No tracker test files were found.');
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: packageRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
