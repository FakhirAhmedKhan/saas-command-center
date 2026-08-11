import { cn } from '../lib/cn';
import type { ReactNode } from 'react';

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Hide this column below the given breakpoint prefix, e.g. "md" hides it below md. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  className?: string;
}

const HIDE_BELOW_CLASS: Record<NonNullable<DataTableColumn<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export function DataTable<Row>({ columns, rows, getRowKey, onRowClick, className }: DataTableProps<Row>) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200 bg-white', className)}>
      <table className='w-full min-w-[560px] border-collapse text-left text-sm'>
        <thead>
          <tr className='border-b border-slate-100'>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400',
                  column.hideBelow ? HIDE_BELOW_CLASS[column.hideBelow] : undefined,
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn('border-b border-slate-50 last:border-b-0', onRowClick && 'cursor-pointer transition hover:bg-slate-50')}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3 align-middle text-slate-700', column.hideBelow ? HIDE_BELOW_CLASS[column.hideBelow] : undefined, column.className)}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
