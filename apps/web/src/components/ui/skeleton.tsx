import { type HTMLAttributes } from 'react';
import { cn } from '@/features/lib/api/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden='true' className={cn('animate-pulse rounded-md bg-slate-100', className)} {...props} />;
}
