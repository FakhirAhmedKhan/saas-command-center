import { TriangleAlert } from 'lucide-react';

import { Button } from './button';
import { Card, CardContent } from './card';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
        <div className="flex size-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </div>

        <h2 className="mt-4 text-[15px] font-semibold text-slate-900">{title}</h2>

        <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">{message}</p>

        {onRetry ? (
          <Button className="mt-5" variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
