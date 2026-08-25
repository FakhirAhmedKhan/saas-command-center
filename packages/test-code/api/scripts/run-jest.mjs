import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const repoRoot = resolve(packageRoot, '../../..');
const appRoot = resolve(repoRoot, 'apps/api');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('No Jest arguments were provided.');
  process.exit(2);
}

const existingNodeOptions = process.env.NODE_OPTIONS?.trim() ?? '';
const vmModulesFlag = '--experimental-vm-modules';
const nodeOptions = existingNodeOptions.includes(vmModulesFlag) ? existingNodeOptions : `${existingNodeOptions} ${vmModulesFlag}`.trim();
const packageManagerPath = process.env.npm_execpath;

if (!packageManagerPath) {
  console.error('npm_execpath is unavailable. Run this launcher through pnpm.');
  process.exit(2);
}

const result = spawnSync(process.execPath, [packageManagerPath, 'exec', 'jest', ...args], {
  cwd: appRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.signal) {
  console.error(`Jest was interrupted by ${result.signal}.`);
  process.exit(130);
}

process.exit(result.status ?? 1);
