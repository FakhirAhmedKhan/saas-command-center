'use client';

import type { WorkspaceBlueprintApplication, WorkspaceTechnology } from '@command-center/shared-types';

const choices: Record<WorkspaceBlueprintApplication['type'], WorkspaceTechnology[]> = {
  WEB: ['NEXT_JS', 'TYPESCRIPT'],
  MOBILE: ['KOTLIN', 'JETPACK_COMPOSE', 'SWIFT', 'SWIFTUI', 'REACT_NATIVE', 'FLUTTER', 'TYPESCRIPT'],
  DESKTOP: ['TAURI', 'ELECTRON', 'TYPESCRIPT'],
};

export function BlueprintApplicationEditor({ application, disabled, onChange }: { application: WorkspaceBlueprintApplication; disabled: boolean; onChange(application: WorkspaceBlueprintApplication): void }) {
  const toggle = (technology: WorkspaceTechnology) => {
    const stack = application.stack.includes(technology) ? application.stack.filter((value) => value !== technology) : [...application.stack, technology];

    onChange({ ...application, stack, source: 'USER' });
  };

  return (
    <fieldset className='rounded-2xl border border-slate-200 p-5' disabled={disabled}>
      <legend className='px-2 text-base font-semibold'>{application.name}</legend>
      <p className='text-sm text-slate-600'>Platforms: {application.platforms.join(', ')}</p>
      <div className='mt-4 flex flex-wrap gap-2'>
        {choices[application.type].map((technology) => (
          <button
            aria-pressed={application.stack.includes(technology)}
            className='rounded-full border px-3 py-2 text-sm aria-pressed:bg-slate-950 aria-pressed:text-white'
            key={technology}
            onClick={() => toggle(technology)}
            type='button'
          >
            {technology.replaceAll('_', ' ')}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
