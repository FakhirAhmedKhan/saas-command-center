import type { WorkspaceBlueprint } from '@command-center/shared-types';
import { createHash } from 'node:crypto';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]),
    );
  }

  return value;
}

export function hashWorkspaceBlueprint(blueprint: WorkspaceBlueprint): string {
  return createHash('sha256')
    .update(JSON.stringify(stable(blueprint)))
    .digest('hex');
}
