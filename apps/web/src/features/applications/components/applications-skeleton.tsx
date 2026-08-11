import { Card } from '@command-center/ui';

const SKELETON_CARD_COUNT = 3;

export function ApplicationsSkeleton() {
  return (
    <div className='grid gap-5 md:grid-cols-2 2xl:grid-cols-3' role='status' aria-label='Loading applications'>
      {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
        <Card key={index} className='flex h-full flex-col gap-4 p-5'>
          <div className='flex items-start gap-3'>
            <div className='size-11 shrink-0 animate-pulse rounded-xl bg-slate-100' />

            <div className='min-w-0 flex-1 space-y-2'>
              <div className='h-4 w-2/3 animate-pulse rounded bg-slate-100' />
              <div className='h-3 w-1/3 animate-pulse rounded bg-slate-100' />
            </div>
          </div>

          <div className='space-y-2'>
            <div className='h-3 w-full animate-pulse rounded bg-slate-100' />
            <div className='h-3 w-4/5 animate-pulse rounded bg-slate-100' />
          </div>

          <div className='flex gap-1.5'>
            <div className='h-5 w-20 animate-pulse rounded-full bg-slate-100' />
            <div className='h-5 w-24 animate-pulse rounded-full bg-slate-100' />
          </div>

          <div className='flex gap-1.5'>
            <div className='h-5 w-14 animate-pulse rounded-md bg-slate-100' />
            <div className='h-5 w-14 animate-pulse rounded-md bg-slate-100' />
            <div className='h-5 w-14 animate-pulse rounded-md bg-slate-100' />
          </div>

          <div className='h-1.5 w-full animate-pulse rounded-full bg-slate-100' />

          <div className='grid grid-cols-2 gap-3'>
            <div className='h-8 animate-pulse rounded bg-slate-100' />
            <div className='h-8 animate-pulse rounded bg-slate-100' />
          </div>

          <div className='mt-auto border-t border-slate-100 pt-3'>
            <div className='h-4 w-1/2 animate-pulse rounded bg-slate-100' />
          </div>
        </Card>
      ))}

      <span className='sr-only'>Loading applications…</span>
    </div>
  );
}
