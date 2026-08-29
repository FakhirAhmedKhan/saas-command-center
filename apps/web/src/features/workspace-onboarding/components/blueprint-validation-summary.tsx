import type { WorkspaceBlueprintValidationIssue } from '@command-center/shared-types';

export function BlueprintValidationSummary({ issues }: { issues: WorkspaceBlueprintValidationIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <section aria-labelledby='validation-title' className='rounded-xl bg-red-50 p-4'>
      <h2 id='validation-title' className='font-semibold text-red-900'>
        Resolve these blueprint issues
      </h2>
      <ul className='mt-2 list-disc pl-5 text-sm text-red-800'>
        {issues.map((issue) => (
          <li key={`${issue.path}:${issue.code}`}>
            {issue.path}: {issue.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
