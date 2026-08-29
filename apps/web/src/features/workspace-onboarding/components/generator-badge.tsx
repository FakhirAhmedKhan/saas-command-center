import type { WorkspaceGeneratorProvider } from '@command-center/shared-types';

export function GeneratorBadge({ provider }: { provider: WorkspaceGeneratorProvider }) {
  const ai = provider === 'ai';

  return <span className='inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800'>{ai ? 'AI-assisted recommendations' : 'Guided recommendations'}</span>;
}
