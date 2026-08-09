interface PageErrorProps {
  title?: string;
  message: string;
  requestId?: string;
  onRetry?: () => void;
}

export function PageError({
  title = 'Unable to load this page',

  message,

  requestId,

  onRetry,
}: PageErrorProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5" role="alert">
      <h2 className="font-semibold text-red-950">{title}</h2>

      <p className="mt-1 text-sm text-red-800">{message}</p>

      {requestId ? <p className="mt-2 text-xs text-red-700">Request ID: {requestId}</p> : null}

      {onRetry ? (
        <button type="button" className="mt-4 rounded-lg bg-red-950 px-4 py-2 text-sm font-medium text-white" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
