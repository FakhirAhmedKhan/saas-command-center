import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ApplicationsErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ApplicationsErrorState({ message, onRetry }: ApplicationsErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-slate-900">Unable to load applications</h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{message}</p>

        <Button className="mt-6" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
