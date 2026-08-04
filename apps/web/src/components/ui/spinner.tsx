import { cn } from "@/features/lib/api/cn";

interface SpinnerProps {
  className?: string;
}

export function Spinner({
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-slate-300 border-r-brand-600',
        className,
      )}
    />
  );
}