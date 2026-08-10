import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-[13px] text-slate-500'>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className='flex items-center gap-1.5 min-w-0'>
            {item.href && !isLast ? (
              <Link href={item.href} className='truncate transition hover:text-slate-800'>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'truncate font-medium text-slate-800' : 'truncate'} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}

            {!isLast ? <ChevronRight className='size-3.5 shrink-0 text-slate-300' aria-hidden='true' /> : null}
          </span>
        );
      })}
    </nav>
  );
}
