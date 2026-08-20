import type { ParsedPackageJson } from './package-json.types';
import type { DetectedApplicationCommands, PackageManager } from '@command-center/shared-types';

const COMMAND_KEYS: Array<{
  key: keyof DetectedApplicationCommands;
  scriptNames: string[];
}> = [
  {
    key: 'dev',
    scriptNames: ['dev', 'start:dev', 'develop'],
  },
  {
    key: 'build',
    scriptNames: ['build'],
  },
  {
    key: 'start',
    scriptNames: ['start', 'start:prod', 'serve'],
  },
  {
    key: 'test',
    scriptNames: ['test'],
  },
  {
    key: 'lint',
    scriptNames: ['lint'],
  },
];

const RUN_PREFIX_BY_MANAGER: Record<PackageManager, string> = {
  pnpm: 'pnpm run',
  yarn: 'yarn run',
  bun: 'bun run',
  npm: 'npm run',
  unknown: 'npm run',
};

export function detectCommands(packageJson: ParsedPackageJson, packageManager: PackageManager): DetectedApplicationCommands {
  const scripts = packageJson.scripts ?? {};

  const runPrefix = RUN_PREFIX_BY_MANAGER[packageManager];

  const commands: DetectedApplicationCommands = {};

  for (const { key, scriptNames } of COMMAND_KEYS) {
    const scriptName = scriptNames.find((name) => typeof scripts[name] === 'string' && scripts[name].trim().length > 0);

    if (scriptName) {
      commands[key] = `${runPrefix} ${scriptName}`;
    }
  }

  return commands;
}
