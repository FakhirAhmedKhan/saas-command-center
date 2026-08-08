import { cn } from '@/features/lib/api/cn';
import { type HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'slate';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-brand-50 text-brand-700 ring-brand-600/20',

  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',

  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',

  yellow: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',

  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',

  red: 'bg-red-50 text-red-700 ring-red-600/20',

  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',

  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
