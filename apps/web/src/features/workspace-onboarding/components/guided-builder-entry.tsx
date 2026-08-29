import Link from 'next/link';

export function GuidedBuilderEntry({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <article className='flex h-full flex-col rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6'>
      <span className='w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800'>Guided recommendations</span>
      <h2 className='mt-4 text-xl font-semibold'>Build from your product idea</h2>
      <p className='mt-2 flex-1 text-sm text-slate-600'>Answer focused questions, review a deterministic blueprint, and create web, mobile, and desktop applications together.</p>
      <Link className='mt-6 rounded-xl bg-slate-950 px-4 py-3 text-center font-medium text-white' href='/workspaces/new/guided'>
        Start guided builder
      </Link>
    </article>
  );
}
