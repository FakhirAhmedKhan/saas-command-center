interface PageLoadingProps {
  label?: string;
}

export function PageLoading({ label = 'Loading…' }: PageLoadingProps) {
  return (
    <div className="flex min-h-[240px] items-center justify-center p-6">
      <div
        className="flex items-center gap-3 text-sm text-slate-600"
        role="status"
        aria-live="polite"
      >
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950"
          aria-hidden="true"
        />

        <span>{label}</span>
      </div>
    </div>
  );
}
