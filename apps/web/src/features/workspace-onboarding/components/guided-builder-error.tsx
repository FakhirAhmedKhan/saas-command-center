import type { GuidedBuilderError } from '../workspace-onboarding-errors';

export function GuidedBuilderErrorState({ error, onRetry }: { error: GuidedBuilderError; onRetry?: () => void }) {
  return (
    <section className='rounded-2xl border border-red-200 bg-red-50 p-5' role='alert'>
      <h2 className='font-semibold text-red-950'>Unable to continue</h2>
      <p className='mt-2 text-sm text-red-800'>{error.message}</p>
      {error.retryable && onRetry && (
        <button className='mt-4 rounded-lg bg-red-950 px-4 py-2 text-white' onClick={onRetry} type='button'>
          Try again
        </button>
      )}
    </section>
  );
}
