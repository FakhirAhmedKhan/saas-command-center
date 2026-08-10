interface ApplicationsResultSummaryProps {
  shown: number;
  total: number;
}

export function ApplicationsResultSummary({ shown, total }: ApplicationsResultSummaryProps) {
  return (
    <p className="text-xs font-medium text-slate-500">
      Showing <span className="text-slate-800">{shown}</span> of <span className="text-slate-800">{total}</span> application{total === 1 ? '' : 's'}
    </p>
  );
}
